import type {
  Artist,
  EditionPlan,
  EditionReport,
  Festival,
  ReputationLevelId,
  Sponsor,
  TimetableSlot,
  WeatherId,
} from '../types';
import { SLOTS_PER_DAY } from '../types';
import { LOCATION_MAP } from '../data/locations';
import { WEATHER_MAP } from '../data/weather';
import { STYLE_MAP } from '../data/styles';
import { INFRA_MAP } from '../data/infrastructures';
import { getReputationLevel } from '../data/reputation';
import { genreAffinity } from '../data/styles';
import {
  aggregateInfrastructure,
  aggregateLineup,
  aggregateMarketing,
  computeCapacity,
  DEMAND_FRACTION,
  referenceTicketPrice,
  sponsorIncome,
} from './economy';
import { applyEvents, type EventEffects, type ResolvedChoice } from './events';
import { generateReviews, type FeedbackContext } from './feedback';
import { clamp } from '../utils/format';
import { makeRng } from '../utils/rng';

// Facteurs de foule par créneau horaire
const SLOT_CROWD: readonly number[] = [0.25, 0.45, 0.65, 1.0, 0.85];

// Facteur de présence par jour (jour 1 = montée en puissance, jour 2 = pic, etc.)
const DAY_CROWD: readonly number[] = [0.8, 1.0, 1.05, 0.85];

// ---- Paramètres de réglage (game balance) ----------------------------------
const TUNING = {
  drawWeight: 32,           // réduit vs v1
  awarenessWeight: 0.35,
  popularityWeight: 105,    // la popularité compte plus
  reputationWeight: 6,
  base: 120,                // base réduite → plus difficile à remplir au départ
  satWeights: { programming: 0.42, infrastructure: 0.30, organization: 0.28 },
};

const NEED_FRACTION = { toilets: 1, bars: DEMAND_FRACTION.bars!, food: DEMAND_FRACTION.food! };
const REF_UNIT_SAT = { toilets: 8, bars: 7, food: 7 };

export interface SimulationInput {
  festival: Festival;
  edition: number;
  budget: number;
  reputation: number;
  popularity: number;
  artists: Artist[];
  sponsors: Sponsor[];
  plan: EditionPlan;
  weather: WeatherId;
  eventChoices: ResolvedChoice[];
}

export interface EditionResult {
  report: EditionReport;
  reputationAfter: number;
  popularityAfter: number;
  budgetAfter: number;
}

// ---- Analyse timetable ------------------------------------------------------
export interface TimetableAnalysis {
  score: number;           // 0-100
  satDelta: number;        // impact sur la satisfaction globale
  orgDelta: number;        // impact sur le score organisation
  issues: string[];        // messages de problèmes
  scheduledArtistIds: Set<string>;
}

export function analyzeTimetable(
  timetable: TimetableSlot[],
  artists: Artist[],
  infrastructures: Record<string, number>,
  attendance: number,
  festivalStyle: string,
  days: number,
): TimetableAnalysis {
  const artistMap = new Map(artists.map((a) => [a.id, a]));
  const issues: string[] = [];
  const scheduledArtistIds = new Set(timetable.map((s) => s.artistId));

  if (timetable.length === 0) {
    return { score: 0, satDelta: 0, orgDelta: 0, issues: [], scheduledArtistIds };
  }

  let totalPenalty = 0;
  let totalBonus = 0;

  for (let day = 0; day < days; day++) {
    for (let slot = 0; slot < SLOTS_PER_DAY; slot++) {
      const slotEntries = timetable.filter((s) => s.day === day && s.slotIndex === slot);
      if (slotEntries.length === 0) continue;

      const crowdPresent = Math.round(attendance * SLOT_CROWD[slot] * (DAY_CROWD[day] ?? 0.9));
      if (crowdPresent === 0) continue;

      // Calcule le pouvoir d'attraction total de ce créneau
      let totalDraw = 0;
      for (const entry of slotEntries) {
        const artist = artistMap.get(entry.artistId);
        if (!artist) continue;
        const aff = genreAffinity(festivalStyle as any, artist.genre);
        totalDraw += artist.popularity * aff;
      }
      if (totalDraw <= 0) continue;

      // Détecte les clashes entre têtes d'affiche (pop > 68 au même créneau)
      const headlinersInSlot = slotEntries
        .map((e) => artistMap.get(e.artistId))
        .filter((a): a is Artist => !!a && a.popularity > 68);

      if (headlinersInSlot.length >= 2) {
        const penalty = (headlinersInSlot.length - 1) * 6;
        totalPenalty += penalty;
        issues.push(
          `Clash : ${headlinersInSlot.map((a) => a.name).join(' & ')} au même créneau — public divisé (-${penalty} sat)`,
        );
      }

      // Vérifie le remplissage de chaque scène
      for (const entry of slotEntries) {
        const artist = artistMap.get(entry.artistId);
        if (!artist) continue;

        const stageOpt = INFRA_MAP[entry.stageId];
        if (!stageOpt) continue;

        const stageQty = infrastructures[entry.stageId] ?? 0;
        const stageCapacity = stageOpt.capacity; // capacité par unité physique

        const aff = genreAffinity(festivalStyle as any, artist.genre);
        const artistDraw = (artist.popularity * aff) / totalDraw;
        const crowdAtStage = Math.round(crowdPresent * artistDraw);
        const fillRatio = stageCapacity > 0 ? crowdAtStage / stageCapacity : 0;

        if (stageQty === 0) {
          totalPenalty += 15;
          issues.push(`${artist.name} assigné à une scène non achetée (${stageOpt.label}) !`);
          continue;
        }

        if (fillRatio > 1.25) {
          // Scène débordée → incident sécurité
          const penalty = Math.round((fillRatio - 1) * 32);
          totalPenalty += penalty;
          issues.push(
            `Surcharge critique : ${artist.name} sur ${stageOpt.label} (${Math.round(fillRatio * 100)}% capac.) — dangereux ! (-${penalty} sat)`,
          );
        } else if (fillRatio > 1.05) {
          const penalty = Math.round((fillRatio - 1.0) * 18);
          totalPenalty += penalty;
          issues.push(
            `Légère surcharge : ${artist.name} sur ${stageOpt.label} (${Math.round(fillRatio * 100)}%) (-${penalty} sat)`,
          );
        } else if (fillRatio < 0.2 && stageOpt.capacity >= 10000) {
          // Grande scène quasi-vide → mauvaise image
          const penalty = Math.round((0.25 - fillRatio) * 20);
          totalPenalty += penalty;
          issues.push(
            `${stageOpt.label} clairsemée avec ${artist.name} (${Math.round(fillRatio * 100)}% capac.) — spectacle sans ambiance (-${penalty} sat)`,
          );
        } else if (fillRatio >= 0.7 && fillRatio <= 1.05) {
          // Parfaite adéquation scène / artiste
          totalBonus += 1.5;
        }
      }
    }
  }

  // Artistes réservés mais non programmés → gaspillage
  // (calculé dans computeCore qui connaît les bookedArtistIds)

  const rawScore = clamp(60 + totalBonus * 2 - totalPenalty, 0, 100);
  const satDelta = clamp(totalBonus * 0.8 - totalPenalty * 0.5, -30, 15);
  const orgDelta = clamp(-totalPenalty * 0.6, -25, 0);

  return {
    score: Math.round(rawScore),
    satDelta,
    orgDelta,
    issues: issues.slice(0, 8),
    scheduledArtistIds,
  };
}

// Cœur de calcul, partagé entre la simulation réelle et la projection.
function computeCore(
  input: Omit<SimulationInput, 'eventChoices'>,
  eventEffects: EventEffects,
  randomness: number,
) {
  const { festival, edition, reputation, popularity, artists, sponsors, plan, weather } = input;
  const days = festival.days ?? 1;
  const styleDef = STYLE_MAP[festival.style];
  const location = LOCATION_MAP[festival.location];
  const weatherDef = WEATHER_MAP[weather];
  const level = getReputationLevel(reputation);

  // Utilise les artistes du timetable pour la qualité (si timetable renseigné)
  const scheduledIds = plan.timetable.length > 0
    ? new Set(plan.timetable.map((s) => s.artistId))
    : null;

  const lineup = aggregateLineup(plan.bookedArtistIds, artists, festival.style, scheduledIds ?? undefined);
  const infra = aggregateInfrastructure(plan.infrastructures);
  const marketing = aggregateMarketing(plan.marketing, festival.style);
  const capacity = computeCapacity(infra.stageCapacity, location, level);

  // ---- Demande & fréquentation (plus progressive) -------------------------
  const reference = referenceTicketPrice(lineup, reputation, festival.style);
  const priceFactor = clamp(1.5 - 0.5 * (plan.ticketPrice / Math.max(1, reference)), 0.1, 1.35);

  // Momentum : chaque édition réussie amplifie l'affluence (effet boule de neige)
  const editionMomentum = Math.min((edition - 1) * 7 * Math.pow(clamp(popularity / 75, 0, 1.3), 1.5), 900);

  const basePool =
    lineup.drawPower * TUNING.drawWeight +
    marketing.awareness * TUNING.awarenessWeight +
    popularity * TUNING.popularityWeight +
    reputation * TUNING.reputationWeight +
    editionMomentum +
    TUNING.base;

  const demand =
    basePool *
    priceFactor *
    styleDef.audienceFactor *
    location.audienceFactor *
    weatherDef.attendanceFactor *
    eventEffects.attendanceMult *
    randomness;

  const attendance = Math.max(0, Math.min(Math.round(demand), capacity));
  const occupancy = capacity > 0 ? attendance / capacity : 0;
  const safeAttendance = Math.max(1, attendance);

  // ---- Analyse timetable --------------------------------------------------
  const ttAnalysis = analyzeTimetable(
    plan.timetable,
    artists,
    plan.infrastructures,
    attendance,
    festival.style,
    days,
  );

  // Pénalité artistes réservés mais non programmés (si timetable utilisé)
  let wastedArtistsPenalty = 0;
  if (plan.timetable.length > 0) {
    const unscheduled = plan.bookedArtistIds.filter((id) => !ttAnalysis.scheduledArtistIds.has(id));
    const unscheduledHighPop = unscheduled
      .map((id) => artists.find((a) => a.id === id))
      .filter((a): a is Artist => !!a && a.popularity >= 50);
    wastedArtistsPenalty = unscheduledHighPop.length * 4;
  }

  // ---- Couvertures infrastructure -----------------------------------------
  const coverage = (cat: keyof typeof NEED_FRACTION) =>
    clamp(infra.serves[cat] / (safeAttendance * NEED_FRACTION[cat]), 0, 1.5);
  const toiletCov = coverage('toilets');
  const barCov = coverage('bars');
  const foodCov = coverage('food');
  const secCov = clamp(infra.serves.security / safeAttendance, 0, 1.4);
  const staffCov = clamp(infra.serves.staff / safeAttendance, 0, 1.4);
  const parkingCov = clamp(infra.serves.parking / (safeAttendance * DEMAND_FRACTION.parking!), 0, 1.3);

  const qualityFactor = (cat: keyof typeof REF_UNIT_SAT) =>
    infra.counts[cat] > 0
      ? clamp(infra.satisfaction[cat] / infra.counts[cat] / REF_UNIT_SAT[cat], 0.6, 1.25)
      : 0.6;

  // ---- Score Programmation ------------------------------------------------
  const programmingBase =
    0.5 * lineup.satisfaction + 0.3 * lineup.quality + 0.2 * lineup.headlinerPop;
  const expectedActs = clamp(capacity / 2500, 4, 16);
  const countFactor = 0.55 + 0.45 * clamp(lineup.count / expectedActs, 0, 1.2);
  const programmingRaw = clamp(lineup.count === 0 ? 0 : programmingBase * countFactor, 0, 100);
  const programming = clamp(programmingRaw + ttAnalysis.satDelta * 0.5 - wastedArtistsPenalty, 0, 100);

  // ---- Score Infrastructure -----------------------------------------------
  const essScores = [
    clamp(toiletCov, 0, 1.1) * qualityFactor('toilets'),
    clamp(barCov, 0, 1.1) * qualityFactor('bars'),
    clamp(foodCov, 0, 1.1) * qualityFactor('food'),
  ];
  const infraCore = (essScores.reduce((a, b) => a + b, 0) / essScores.length) * 90;
  const comfortBonus =
    (infra.counts.parking > 0 ? clamp(parkingCov, 0, 1) * 4 : 0) +
    (infra.counts.camping > 0 ? 4 : 0) +
    (infra.counts.vip > 0 ? 4 : 0);
  const infrastructure = clamp(infraCore + comfortBonus, 0, 100);

  // ---- Score Organisation -------------------------------------------------
  const safetyScore =
    (clamp(secCov, 0, 1) * 0.45 + clamp(staffCov, 0, 1) * 0.35 + clamp(parkingCov, 0, 1) * 0.2) * 100;
  const crowdPenalty =
    occupancy > 0.88 ? (occupancy - 0.88) * 150 * (1 - clamp(infra.safety, 0, 0.8)) : 0;
  const organization = clamp(safetyScore + ttAnalysis.orgDelta - crowdPenalty, 0, 100);

  // ---- Satisfaction globale -----------------------------------------------
  const priceRatio = plan.ticketPrice / Math.max(1, reference);
  const pricePenalty = priceRatio > 1.08 ? (priceRatio - 1.08) * 44 : 0;

  const sponsorMap = new Map(sponsors.map((s) => [s.id, s]));
  let sponsorPenalty = 0;
  for (const id of plan.acceptedSponsorIds) {
    const sp = sponsorMap.get(id);
    if (!sp) continue;
    const compatible = sp.affinityStyles.includes(festival.style) || festival.style === 'Multi-genres';
    if (!compatible) sponsorPenalty += sp.imageRisk * 0.6;
  }

  let global =
    programming * TUNING.satWeights.programming +
    infrastructure * TUNING.satWeights.infrastructure +
    organization * TUNING.satWeights.organization;
  global += weatherDef.satisfaction + eventEffects.satisfaction - pricePenalty - sponsorPenalty;
  global = clamp(global, 0, 100);

  // ---- Recettes (multi-jours) ---------------------------------------------
  const concessionRevenue = (['bars', 'food', 'camping', 'parking'] as const).reduce((sum, cat) => {
    const frac = DEMAND_FRACTION[cat] ?? 1;
    const served = Math.min(infra.serves[cat], safeAttendance * frac);
    const dayConcessionMult = cat === 'camping' || cat === 'parking' ? 1 : days;
    return sum + served * infra.revenuePerHead[cat] * dayConcessionMult;
  }, 0);
  const vipServed = Math.min(infra.serves.vip, safeAttendance * (DEMAND_FRACTION.vip ?? 0.12));
  const vipRevenue = vipServed * infra.revenuePerHead.vip;
  const ticketRevenue = attendance * plan.ticketPrice;
  const sponsorsRevenue = sponsorIncome(plan.acceptedSponsorIds, sponsors);
  const totalRevenue = ticketRevenue + sponsorsRevenue + concessionRevenue + vipRevenue;

  // ---- Dépenses (multi-jours pour staff/site) -----------------------------
  const staffSecCostBase = infra.staffSecurityCost;
  const locationCostBase = location.baseCost;
  const expenses = {
    artists: lineup.cost,
    infrastructure: infra.infraCost,
    marketing: marketing.cost,
    staffSecurity: staffSecCostBase * days,
    location: locationCostBase * days,
    events: -eventEffects.money,
    total: 0,
  };
  expenses.total =
    expenses.artists +
    expenses.infrastructure +
    expenses.marketing +
    expenses.staffSecurity +
    expenses.location +
    expenses.events;

  const profit = totalRevenue - expenses.total;

  // ---- Réputation ---------------------------------------------------------
  let repDelta =
    (global - 60) * 0.95 +
    (occupancy - 0.55) * 28 +
    (lineup.headlinerPop - 50) * 0.18 +
    infra.reputation * 0.22 +
    eventEffects.reputation;
  // La réputation est de plus en plus difficile à augmenter en haut
  if (repDelta > 0) repDelta *= clamp(1 - reputation / 1400, 0.2, 1);
  repDelta = clamp(repDelta, -80, 90);
  const reputationAfter = clamp(reputation + repDelta, 0, 1000);

  // ---- Popularité (dynamique progressive) ---------------------------------
  // Croissance forte si bonne satisfaction, déclin significatif si mauvaise
  const satFactor = (global - 52) / 50;
  const occupancyBonus = (occupancy - 0.5) * 9;
  const popularityDelta = satFactor * 14 + occupancyBonus + (eventEffects.buzz ? 5 : 0);
  const popularityAfter = clamp(popularity + popularityDelta, 0, 100);

  return {
    lineup, infra, marketing, capacity, attendance, occupancy,
    programming, infrastructure, organization, global,
    reference, priceRatio, toiletCov, barCov, foodCov,
    revenue: { tickets: ticketRevenue, sponsors: sponsorsRevenue, barsFood: concessionRevenue, vip: vipRevenue, total: totalRevenue },
    expenses, profit, repDelta, reputationAfter, popularityAfter, level,
    weatherDef, ttAnalysis,
  };
}

/** Lance la simulation complète d'une édition et produit le rapport. */
export function runSimulation(input: SimulationInput): EditionResult {
  const days = input.festival.days ?? 1;
  const rng = makeRng(`${input.festival.name}:${input.edition}:sim`);
  const { effects, resolved } = applyEvents(input.eventChoices);
  // Variance accrue pour plus de réalisme
  const randomness = 0.88 + rng() * 0.26;

  const core = computeCore(input, effects, randomness);
  const levelBefore = getReputationLevel(input.reputation).id as ReputationLevelId;
  const levelAfter = getReputationLevel(core.reputationAfter).id as ReputationLevelId;
  const budgetAfter = input.budget + core.profit;

  const ctx: FeedbackContext = {
    global: core.global,
    programming: core.programming,
    infrastructure: core.infrastructure,
    organization: core.organization,
    weather: input.weather,
    priceRatio: core.priceRatio,
    occupancy: core.occupancy,
    barCoverage: core.barCov,
    toiletCoverage: core.toiletCov,
    foodCoverage: core.foodCov,
    headliner: core.lineup.headliners[0]?.name ?? 'la tête d\'affiche',
    buzz: effects.buzz,
  };
  const reviews = generateReviews(ctx, rng, 6);

  const report: EditionReport = {
    edition: input.edition,
    festivalName: input.festival.name,
    weather: input.weather,
    attendance: core.attendance,
    capacity: core.capacity,
    ticketsSold: core.attendance,
    ticketPrice: input.plan.ticketPrice,
    revenue: core.revenue,
    expenses: core.expenses,
    profit: core.profit,
    satisfaction: {
      global: Math.round(core.global),
      infrastructure: Math.round(core.infrastructure),
      programming: Math.round(core.programming),
      organization: Math.round(core.organization),
    },
    reputationBefore: Math.round(input.reputation),
    reputationAfter: Math.round(core.reputationAfter),
    reputationDelta: Math.round(core.repDelta),
    levelBefore,
    levelAfter,
    events: resolved,
    reviews,
    headliners: core.lineup.headliners.map((h) => h.name),
    budgetBefore: input.budget,
    budgetAfter,
    timetableScore: core.ttAnalysis.score > 0 ? core.ttAnalysis.score : null,
    timetableIssues: core.ttAnalysis.issues,
    festivalDays: days,
  };

  return {
    report,
    reputationAfter: core.reputationAfter,
    popularityAfter: core.popularityAfter,
    budgetAfter,
  };
}

export interface EditionProjection {
  capacity: number;
  expectedAttendance: number;
  occupancy: number;
  reference: number;
  expectedRevenue: number;
  expectedExpenses: number;
  expectedProfit: number;
  satisfaction: number;
  programming: number;
  infrastructure: number;
  organization: number;
}

/** Projection « toutes choses neutres » pour aider le joueur pendant la prépa. */
export function projectEdition(input: Omit<SimulationInput, 'eventChoices'>): EditionProjection {
  const neutral: EventEffects = {
    attendanceMult: 1,
    satisfaction: 0,
    money: 0,
    reputation: 0,
    buzz: false,
  };
  const core = computeCore(input, neutral, 1);
  return {
    capacity: core.capacity,
    expectedAttendance: core.attendance,
    occupancy: core.occupancy,
    reference: core.reference,
    expectedRevenue: core.revenue.total,
    expectedExpenses: core.expenses.total,
    expectedProfit: core.profit,
    satisfaction: core.global,
    programming: core.programming,
    infrastructure: core.infrastructure,
    organization: core.organization,
  };
}
