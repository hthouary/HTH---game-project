import type {
  Artist,
  EditionPlan,
  EditionReport,
  Festival,
  ReputationLevelId,
  Sponsor,
  WeatherId,
} from '../types';
import { LOCATION_MAP } from '../data/locations';
import { WEATHER_MAP } from '../data/weather';
import { STYLE_MAP } from '../data/styles';
import { getReputationLevel } from '../data/reputation';
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

// ---- Paramètres de réglage (game balance) ----------------------------------
const TUNING = {
  drawWeight: 38,
  awarenessWeight: 0.42,
  popularityWeight: 90,
  reputationWeight: 5,
  base: 200,
  satWeights: { programming: 0.4, infrastructure: 0.32, organization: 0.28 },
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

// Cœur de calcul, partagé entre la simulation réelle et la projection.
function computeCore(
  input: Omit<SimulationInput, 'eventChoices'>,
  eventEffects: EventEffects,
  randomness: number,
) {
  const { festival, reputation, popularity, artists, sponsors, plan, weather } = input;
  const styleDef = STYLE_MAP[festival.style];
  const location = LOCATION_MAP[festival.location];
  const weatherDef = WEATHER_MAP[weather];
  const level = getReputationLevel(reputation);

  const lineup = aggregateLineup(plan.bookedArtistIds, artists, festival.style);
  const infra = aggregateInfrastructure(plan.infrastructures);
  const marketing = aggregateMarketing(plan.marketing, festival.style);
  const capacity = computeCapacity(infra.stageCapacity, location, level);

  // ---- Demande & fréquentation --------------------------------------------
  const reference = referenceTicketPrice(lineup, reputation, festival.style);
  const priceFactor = clamp(1.5 - 0.5 * (plan.ticketPrice / Math.max(1, reference)), 0.12, 1.35);

  const basePool =
    lineup.drawPower * TUNING.drawWeight +
    marketing.awareness * TUNING.awarenessWeight +
    popularity * TUNING.popularityWeight +
    reputation * TUNING.reputationWeight +
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
  const expectedActs = clamp(capacity / 3000, 3, 14);
  const countFactor = 0.65 + 0.35 * clamp(lineup.count / expectedActs, 0, 1.2);
  const programming = clamp(lineup.count === 0 ? 0 : programmingBase * countFactor, 0, 100);

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
    occupancy > 0.9 ? (occupancy - 0.9) * 130 * (1 - clamp(infra.safety, 0, 0.8)) : 0;
  const organization = clamp(safetyScore - crowdPenalty, 0, 100);

  // ---- Satisfaction globale -----------------------------------------------
  const priceRatio = plan.ticketPrice / Math.max(1, reference);
  const pricePenalty = priceRatio > 1.1 ? (priceRatio - 1.1) * 38 : 0;

  // pénalité d'image des sponsors incompatibles
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
  const concessionRevenue = (['bars', 'food', 'camping', 'parking'] as const).reduce((sum, cat) => {
    const frac = DEMAND_FRACTION[cat] ?? 1;
    const served = Math.min(infra.serves[cat], safeAttendance * frac);
    return sum + served * infra.revenuePerHead[cat];
  }, 0);
  const vipServed = Math.min(infra.serves.vip, safeAttendance * (DEMAND_FRACTION.vip ?? 0.12));
  const vipRevenue = vipServed * infra.revenuePerHead.vip;
  const ticketRevenue = attendance * plan.ticketPrice;
  const sponsorsRevenue = sponsorIncome(plan.acceptedSponsorIds, sponsors);
  const totalRevenue = ticketRevenue + sponsorsRevenue + concessionRevenue + vipRevenue;

  // ---- Dépenses -----------------------------------------------------------
  const expenses = {
    artists: lineup.cost,
    infrastructure: infra.infraCost,
    marketing: marketing.cost,
    staffSecurity: infra.staffSecurityCost,
    location: location.baseCost,
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
    (global - 58) * 0.9 +
    (occupancy - 0.55) * 30 +
    (lineup.headlinerPop - 50) * 0.2 +
    infra.reputation * 0.25 +
    eventEffects.reputation;
  if (repDelta > 0) repDelta *= clamp(1 - reputation / 1300, 0.25, 1);
  repDelta = clamp(repDelta, -70, 95);
  const reputationAfter = clamp(reputation + repDelta, 0, 1000);

  // ---- Popularité du festival ---------------------------------------------
  const popularityAfter = clamp(
    popularity * 0.6 + global * 0.22 + occupancy * 12 + (eventEffects.buzz ? 6 : 0),
    0,
    100,
  );

  return {
    lineup, infra, marketing, capacity, attendance, occupancy,
    programming, infrastructure, organization, global,
    reference, priceRatio, toiletCov, barCov, foodCov,
    revenue: { tickets: ticketRevenue, sponsors: sponsorsRevenue, barsFood: concessionRevenue, vip: vipRevenue, total: totalRevenue },
    expenses, profit, repDelta, reputationAfter, popularityAfter, level,
    weatherDef,
  };
}

/** Lance la simulation complète d'une édition et produit le rapport. */
export function runSimulation(input: SimulationInput): EditionResult {
  const rng = makeRng(`${input.festival.name}:${input.edition}:sim`);
  const { effects, resolved } = applyEvents(input.eventChoices);
  const randomness = 0.95 + rng() * 0.1;

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
