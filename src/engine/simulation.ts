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
  siteCost,
  DEMAND_FRACTION,
  referenceTicketPrice,
  sponsorIncome,
} from './economy';
import { applyEvents, type EventEffects, type ResolvedChoice } from './events';
import { generateReviews, type FeedbackContext } from './feedback';
import { clamp } from '../utils/format';
import { makeRng } from '../utils/rng';

// Facteurs de foule par créneau horaire (part du public présent simultanément)
const SLOT_CROWD: readonly number[] = [0.25, 0.45, 0.65, 1.0, 0.85];

// Courbes de présence par jour selon la durée (jour d'ouverture plus calme, etc.)
const DAY_CURVES: Record<number, readonly number[]> = {
  1: [1.0],
  2: [0.94, 1.0],
  3: [0.88, 1.0, 0.95],
  4: [0.82, 1.0, 1.0, 0.9],
};

// ---- Paramètres de réglage (game balance) ----------------------------------
const TUNING = {
  drawWeight: 32,
  awarenessWeight: 0.35,
  popularityWeight: 105,
  reputationWeight: 6,
  base: 120,
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

// ---- Répartition de l'affluence jour par jour -------------------------------
function distributeByDay(
  totalDemand: number,
  capacity: number,
  timetable: TimetableSlot[],
  artistMap: Map<string, Artist>,
  style: string,
  days: number,
): number[] {
  const dayDraw = new Array(days).fill(0);
  let ttDraw = 0;
  for (const slot of timetable) {
    if (slot.day < 0 || slot.day >= days) continue;
    const a = artistMap.get(slot.artistId);
    if (!a) continue;
    const d = a.popularity * genreAffinity(style as any, a.genre) * (SLOT_CROWD[slot.slotIndex] ?? 0.5);
    dayDraw[slot.day] += d;
    ttDraw += d;
  }

  const maxDraw = Math.max(...dayDraw, 0);
  const useTimetable = ttDraw > 0 && maxDraw > 0;
  const curve = DAY_CURVES[days] ?? DAY_CURVES[1];

  const presence: number[] = [];
  for (let d = 0; d < days; d++) {
    // Taux de présence du jour : piloté par le line-up programmé si dispo, sinon courbe naturelle.
    const rate = useTimetable
      ? 0.5 + 0.5 * (dayDraw[d] / maxDraw)
      : (curve[d] ?? 0.9);
    presence.push(Math.min(Math.round(totalDemand * rate), capacity));
  }
  return presence;
}

// ---- Analyse timetable ------------------------------------------------------
export interface TimetableAnalysis {
  score: number;
  satDelta: number;
  orgDelta: number;
  issues: string[];
  scheduledArtistIds: Set<string>;
}

export function analyzeTimetable(
  timetable: TimetableSlot[],
  artists: Artist[],
  infrastructures: Record<string, number>,
  perDayAttendance: number[],
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
    const dayPresence = perDayAttendance[day] ?? 0;
    for (let slot = 0; slot < SLOTS_PER_DAY; slot++) {
      const slotEntries = timetable.filter((s) => s.day === day && s.slotIndex === slot);
      if (slotEntries.length === 0) continue;

      const crowdPresent = Math.round(dayPresence * SLOT_CROWD[slot]);
      if (crowdPresent === 0) continue;

      let totalDraw = 0;
      for (const entry of slotEntries) {
        const artist = artistMap.get(entry.artistId);
        if (!artist) continue;
        totalDraw += artist.popularity * genreAffinity(festivalStyle as any, artist.genre);
      }
      if (totalDraw <= 0) continue;

      // Clash de têtes d'affiche au même créneau
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

      // Remplissage de chaque scène
      for (const entry of slotEntries) {
        const artist = artistMap.get(entry.artistId);
        if (!artist) continue;
        const stageOpt = INFRA_MAP[entry.stageId];
        if (!stageOpt) continue;

        const stageQty = infrastructures[entry.stageId] ?? 0;
        const stageCapacity = stageOpt.capacity * Math.max(1, stageQty);
        const aff = genreAffinity(festivalStyle as any, artist.genre);
        const artistShare = (artist.popularity * aff) / totalDraw;
        const crowdAtStage = Math.round(crowdPresent * artistShare);
        const fillRatio = stageCapacity > 0 ? crowdAtStage / stageCapacity : 0;

        if (stageQty === 0) {
          totalPenalty += 15;
          issues.push(`${artist.name} assigné à une scène non achetée (${stageOpt.label}) !`);
          continue;
        }

        if (fillRatio > 1.25) {
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
          const penalty = Math.round((0.25 - fillRatio) * 20);
          totalPenalty += penalty;
          issues.push(
            `${stageOpt.label} clairsemée avec ${artist.name} (${Math.round(fillRatio * 100)}% capac.) — spectacle sans ambiance (-${penalty} sat)`,
          );
        } else if (fillRatio >= 0.7 && fillRatio <= 1.05) {
          totalBonus += 1.5;
        }
      }
    }
  }

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
  const artistMap = new Map(artists.map((a) => [a.id, a]));

  const scheduledIds = plan.timetable.length > 0
    ? new Set(plan.timetable.map((s) => s.artistId))
    : null;

  const lineup = aggregateLineup(plan.bookedArtistIds, artists, festival.style, scheduledIds ?? undefined);
  const infra = aggregateInfrastructure(plan.infrastructures);
  const marketing = aggregateMarketing(plan.marketing, festival.style);

  // La capacité est choisie par le joueur (plafonnée par la taille du site)
  const capacity = computeCapacity(festival.capacity ?? 10000, location);

  // ---- Demande potentielle (attractivité réelle) --------------------------
  const reference = referenceTicketPrice(lineup, reputation, popularity, festival.style, days);
  const priceFactor = clamp(1.5 - 0.55 * (plan.ticketPrice / Math.max(1, reference)), 0.08, 1.4);

  // Effet boule de neige : éditions réussies amplifient l'attractivité
  const editionMomentum = Math.min((edition - 1) * 7 * Math.pow(clamp(popularity / 75, 0, 1.3), 1.5), 900);
  // Un festival plus long attire davantage de monde (rendement décroissant)
  const dayAppeal = 1 + (days - 1) * 0.12;

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
    dayAppeal *
    styleDef.audienceFactor *
    location.audienceFactor *
    weatherDef.attendanceFactor *
    eventEffects.attendanceMult *
    randomness;

  // Affluence (porteurs de pass uniques), plafonnée par la capacité choisie
  const attendance = Math.max(0, Math.min(Math.round(demand), capacity));
  const demandPressure = capacity > 0 ? demand / capacity : 0;
  const soldOut = demandPressure >= 0.98 && attendance > 0;
  const occupancy = capacity > 0 ? attendance / capacity : 0;
  const safeAttendance = Math.max(1, attendance);

  // ---- Présence jour par jour ---------------------------------------------
  const perDayAttendance = distributeByDay(
    Math.min(demand, capacity),
    capacity,
    plan.timetable,
    artistMap,
    festival.style,
    days,
  );
  const peakPresence = Math.max(1, ...perDayAttendance);

  // ---- Analyse timetable --------------------------------------------------
  const ttAnalysis = analyzeTimetable(
    plan.timetable,
    artists,
    plan.infrastructures,
    perDayAttendance,
    festival.style,
    days,
  );

  // Artistes réservés mais non programmés → cachet payé pour rien
  let wastedArtistsPenalty = 0;
  if (plan.timetable.length > 0) {
    const unscheduled = plan.bookedArtistIds.filter((id) => !ttAnalysis.scheduledArtistIds.has(id));
    const unscheduledHighPop = unscheduled
      .map((id) => artistMap.get(id))
      .filter((a): a is Artist => !!a && a.popularity >= 50);
    wastedArtistsPenalty = unscheduledHighPop.length * 4;
  }

  // ---- Couvertures infrastructure (mesurées sur le jour de pointe) ---------
  const coverage = (cat: keyof typeof NEED_FRACTION) =>
    clamp(infra.serves[cat] / (peakPresence * NEED_FRACTION[cat]), 0, 1.5);
  const toiletCov = coverage('toilets');
  const barCov = coverage('bars');
  const foodCov = coverage('food');
  const secCov = clamp(infra.serves.security / peakPresence, 0, 1.4);
  const staffCov = clamp(infra.serves.staff / peakPresence, 0, 1.4);
  const parkingCov = clamp(infra.serves.parking / (safeAttendance * DEMAND_FRACTION.parking!), 0, 1.3);

  const qualityFactor = (cat: keyof typeof REF_UNIT_SAT) =>
    infra.counts[cat] > 0
      ? clamp(infra.satisfaction[cat] / infra.counts[cat] / REF_UNIT_SAT[cat], 0.6, 1.25)
      : 0.6;

  // ---- Score Programmation ------------------------------------------------
  const programmingBase =
    0.5 * lineup.satisfaction + 0.3 * lineup.quality + 0.2 * lineup.headlinerPop;
  const expectedActs = clamp((peakPresence / 2500) * days, 4, 24);
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
  // La sécurité/le personnel doivent suivre la présence réelle du jour de pointe.
  const safetyScore =
    (clamp(secCov, 0, 1) * 0.45 + clamp(staffCov, 0, 1) * 0.35 + clamp(parkingCov, 0, 1) * 0.2) * 100;
  // Surcharge des scènes : au pic, presque tout le monde veut voir un show.
  const peakStageCapacity = infra.stageCapacity;
  const peakConcurrent = peakPresence * 0.92;
  const stageStrain = peakStageCapacity > 0 ? peakConcurrent / peakStageCapacity : 3;
  const stageCrush = stageStrain > 1 ? (stageStrain - 1) * 55 * (1 - clamp(infra.safety, 0, 0.8)) : 0;
  const organization = clamp(safetyScore + ttAnalysis.orgDelta - stageCrush, 0, 100);

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

  // ---- Recettes -----------------------------------------------------------
  // Bars & food : consommation chaque jour (présence quotidienne).
  let concessionRevenue = 0;
  for (const cat of ['bars', 'food'] as const) {
    const frac = DEMAND_FRACTION[cat] ?? 1;
    for (const dayPres of perDayAttendance) {
      const served = Math.min(infra.serves[cat], dayPres * frac);
      concessionRevenue += served * infra.revenuePerHead[cat];
    }
  }
  // Camping & parking : forfait sur tout le festival (une fois).
  for (const cat of ['camping', 'parking'] as const) {
    const frac = DEMAND_FRACTION[cat] ?? 1;
    const served = Math.min(infra.serves[cat], safeAttendance * frac);
    concessionRevenue += served * infra.revenuePerHead[cat];
  }
  const vipServed = Math.min(infra.serves.vip, safeAttendance * (DEMAND_FRACTION.vip ?? 0.12));
  const vipRevenue = vipServed * infra.revenuePerHead.vip;
  // Billetterie : pass unique pour tout le festival.
  const ticketRevenue = attendance * plan.ticketPrice;
  const sponsorsRevenue = sponsorIncome(plan.acceptedSponsorIds, sponsors);
  const totalRevenue = ticketRevenue + sponsorsRevenue + concessionRevenue + vipRevenue;

  // ---- Dépenses -----------------------------------------------------------
  const expenses = {
    artists: lineup.cost,
    infrastructure: infra.infraCost,
    marketing: marketing.cost,
    staffSecurity: infra.staffSecurityCost * days,
    location: siteCost(location, capacity, days),
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
  // L'ampleur (affluence absolue) et le prestige comptent ; un faible remplissage
  // ne pénalise pas en soi (mais ne rapporte pas de bonus d'ampleur).
  const attendanceScale = clamp(attendance / 22000, 0, 1.2);
  let repDelta =
    (global - 60) * 0.95 +
    (lineup.headlinerPop - 50) * 0.18 +
    infra.reputation * 0.22 +
    attendanceScale * 12 +
    (soldOut ? 6 : 0) +
    eventEffects.reputation;
  if (repDelta > 0) repDelta *= clamp(1 - reputation / 1400, 0.2, 1);
  repDelta = clamp(repDelta, -80, 90);
  const reputationAfter = clamp(reputation + repDelta, 0, 1000);

  // ---- Popularité (hype) --------------------------------------------------
  // Pilotée par la satisfaction + la rareté (complet) — pas par le taux de remplissage.
  const satFactor = (global - 52) / 50;
  const scarcityHype = soldOut ? clamp((demandPressure - 0.98) * 9, 0, 9) : 0;
  const popularityDelta = satFactor * 15 + scarcityHype + (eventEffects.buzz ? 5 : 0);
  const popularityAfter = clamp(popularity + popularityDelta, 0, 100);

  return {
    lineup, infra, marketing, capacity, attendance, occupancy, demand, demandPressure, soldOut,
    perDayAttendance, peakPresence,
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
    perDayAttendance: core.perDayAttendance,
    soldOut: core.soldOut,
    demandPressure: core.demandPressure,
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
  demandPressure: number;
  soldOut: boolean;
  perDayAttendance: number[];
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
    demandPressure: core.demandPressure,
    soldOut: core.soldOut,
    perDayAttendance: core.perDayAttendance,
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
