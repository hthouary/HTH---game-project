import type {
  Artist,
  EditionPlan,
  InfraCategory,
  LocationDef,
  MarketingPlan,
  MusicStyle,
  ReputationLevel,
  Sponsor,
} from '../types';
import { INFRA_MAP } from '../data/infrastructures';
import { MARKETING_MAP } from '../data/marketing';
import { genreAffinity, STYLE_MAP } from '../data/styles';
import { clamp } from '../utils/format';

// Part de l'affluence susceptible de consommer dans chaque catégorie payante.
export const DEMAND_FRACTION: Partial<Record<InfraCategory, number>> = {
  bars: 0.95,
  food: 0.9,
  vip: 0.12,
  camping: 0.45,
  parking: 0.55,
};

export interface InfraAggregate {
  stageCapacity: number;
  cost: number;
  // par catégorie
  serves: Record<InfraCategory, number>;
  satisfaction: Record<InfraCategory, number>;
  revenuePerHead: Record<InfraCategory, number>;
  reputation: number;
  safety: number;
  // coûts ventilés
  infraCost: number; // hors staff/sécurité
  staffSecurityCost: number;
  counts: Record<InfraCategory, number>;
}

const EMPTY_CAT = (): Record<InfraCategory, number> => ({
  stage: 0, toilets: 0, bars: 0, food: 0, camping: 0, parking: 0, vip: 0, security: 0, staff: 0,
});

export function aggregateInfrastructure(infrastructures: Record<string, number>): InfraAggregate {
  const agg: InfraAggregate = {
    stageCapacity: 0,
    cost: 0,
    serves: EMPTY_CAT(),
    satisfaction: EMPTY_CAT(),
    revenuePerHead: EMPTY_CAT(),
    reputation: 0,
    safety: 0,
    infraCost: 0,
    staffSecurityCost: 0,
    counts: EMPTY_CAT(),
  };

  // accumulateur pondéré pour le panier moyen
  const rphWeighted = EMPTY_CAT();

  for (const [id, qty] of Object.entries(infrastructures)) {
    if (!qty) continue;
    const opt = INFRA_MAP[id];
    if (!opt) continue;
    const c = opt.category;
    agg.cost += opt.cost * qty;
    agg.counts[c] += qty;
    agg.stageCapacity += opt.capacity * qty;
    agg.serves[c] += opt.serves * qty;
    agg.satisfaction[c] += opt.satisfaction * qty;
    agg.reputation += opt.reputation * qty;
    agg.safety += opt.safety * qty;
    rphWeighted[c] += opt.revenuePerHead * opt.serves * qty;

    if (c === 'staff' || c === 'security') agg.staffSecurityCost += opt.cost * qty;
    else agg.infraCost += opt.cost * qty;
  }

  // panier moyen pondéré par la capacité de service
  (Object.keys(agg.serves) as InfraCategory[]).forEach((c) => {
    agg.revenuePerHead[c] = agg.serves[c] > 0 ? rphWeighted[c] / agg.serves[c] : 0;
  });

  return agg;
}

export function computeCapacity(
  stageCapacity: number,
  location: LocationDef,
  level: ReputationLevel,
): number {
  return Math.max(0, Math.min(stageCapacity, location.maxCapacity, level.capacityCap));
}

export interface LineupAggregate {
  count: number;
  cost: number;
  /** Demande tirée par la notoriété (pondérée par l'affinité de genre) */
  drawPower: number;
  /** Qualité artistique perçue 0-100 */
  quality: number;
  /** Satisfaction artistique 0-100 */
  satisfaction: number;
  /** Popularité de la plus grosse tête d'affiche */
  headlinerPop: number;
  /** Adéquation moyenne au style du festival 0-1 */
  genreMatch: number;
  /** Charge technique cumulée */
  techLoad: number;
  /** Fiabilité moyenne 0-100 */
  reliability: number;
  headliners: Artist[];
}

export function aggregateLineup(
  bookedArtistIds: string[],
  artists: Artist[],
  style: MusicStyle,
): LineupAggregate {
  const map = new Map(artists.map((a) => [a.id, a]));
  const booked = bookedArtistIds.map((id) => map.get(id)).filter((a): a is Artist => !!a);

  if (booked.length === 0) {
    return {
      count: 0, cost: 0, drawPower: 0, quality: 0, satisfaction: 0,
      headlinerPop: 0, genreMatch: 0, techLoad: 0, reliability: 0, headliners: [],
    };
  }

  let cost = 0;
  let drawPower = 0;
  let qualityWeighted = 0;
  let satWeighted = 0;
  let popSum = 0;
  let matchWeighted = 0;
  let techLoad = 0;
  let reliabilitySum = 0;
  let headlinerPop = 0;

  for (const a of booked) {
    const aff = genreAffinity(style, a.genre);
    cost += a.cost;
    drawPower += a.popularity * aff;
    // pondère qualité/satisfaction par la popularité (les têtes d'affiche comptent plus)
    const w = a.popularity + 15;
    qualityWeighted += a.showQuality * aff * w;
    satWeighted += a.satisfaction * aff * w;
    popSum += w;
    matchWeighted += aff * w;
    techLoad += a.technicalRequirement;
    reliabilitySum += a.reliability;
    headlinerPop = Math.max(headlinerPop, a.popularity);
  }

  const headliners = [...booked].sort((x, y) => y.popularity - x.popularity).slice(0, 3);

  return {
    count: booked.length,
    cost,
    drawPower,
    quality: clamp(qualityWeighted / popSum, 0, 100),
    satisfaction: clamp(satWeighted / popSum, 0, 100),
    headlinerPop,
    genreMatch: clamp(matchWeighted / popSum, 0, 1),
    techLoad,
    reliability: reliabilitySum / booked.length,
    headliners,
  };
}

export interface MarketingAggregate {
  cost: number;
  reach: number;
  /** Notoriété effective (portée × efficacité × adéquation public) */
  awareness: number;
}

export function aggregateMarketing(plan: MarketingPlan, style: MusicStyle): MarketingAggregate {
  let cost = 0;
  let reach = 0;
  let awareness = 0;

  for (const [id, units] of Object.entries(plan.units)) {
    if (!units) continue;
    const ch = MARKETING_MAP[id as keyof typeof MARKETING_MAP];
    if (!ch) continue;
    cost += ch.unitCost * units;
    const r = ch.reachPerUnit * units;
    reach += r;
    const match =
      style === 'Multi-genres' ? 1.0 : ch.bestFor.includes(style) ? 1.25 : 0.8;
    // rendement légèrement décroissant sur un même canal
    const diminishing = 1 / (1 + units * 0.04);
    awareness += r * ch.efficiency * match * (0.8 + diminishing * 0.2);
  }

  return { cost, reach, awareness };
}

export function sponsorIncome(acceptedIds: string[], sponsors: Sponsor[]): number {
  const map = new Map(sponsors.map((s) => [s.id, s]));
  return acceptedIds.reduce((sum, id) => sum + (map.get(id)?.amount ?? 0), 0);
}

/** Coût total engagé pendant la planification (hors évènements & revenus). */
export function committedSpend(
  plan: EditionPlan,
  artists: Artist[],
  style: MusicStyle,
  location: LocationDef,
): number {
  const lineup = aggregateLineup(plan.bookedArtistIds, artists, style);
  const infra = aggregateInfrastructure(plan.infrastructures);
  const marketing = aggregateMarketing(plan.marketing, style);
  return lineup.cost + infra.cost + marketing.cost + location.baseCost;
}

/** Prix de référence « juste » attendu par le public, selon l'offre. */
export function referenceTicketPrice(
  lineup: LineupAggregate,
  reputation: number,
  style: MusicStyle,
): number {
  const styleDef = STYLE_MAP[style];
  const base = 22 + lineup.headlinerPop * 0.55 + lineup.count * 1.2 + reputation * 0.045;
  return Math.round(base * (0.9 + styleDef.audienceFactor * 0.1));
}
