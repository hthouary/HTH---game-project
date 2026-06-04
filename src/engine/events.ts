import type { RandomEventDef, WeatherId, LocationId } from '../types';
import { RANDOM_EVENTS } from '../data/events';
import { clamp } from '../utils/format';

export interface EventRollContext {
  safety: number; // réduction cumulée du risque (0..~0.8)
  location: LocationId;
  forecast: WeatherId;
  barCoverage: number; // serves bars / capacité
  toiletCoverage: number;
  occupancyEstimate: number; // affluence attendue / capacité
  marketingAwareness: number;
  reputation: number;
  avgReliability: number; // fiabilité moyenne du line-up 0-100
}

function modifier(def: RandomEventDef, ctx: EventRollContext): number {
  let m = 1;
  if (def.type === 'negative') {
    // la sécurité/staff réduit globalement le risque
    m *= clamp(1 - ctx.safety * 0.55, 0.3, 1);
  }
  switch (def.id) {
    case 'neighbor_complaint':
      if (ctx.location === 'Ville') m *= 1.7;
      else if (ctx.location === 'Zone industrielle') m *= 0.35;
      else if (ctx.location === 'Campagne') m *= 0.7;
      break;
    case 'storm_warning':
      if (['Orage', 'Pluie'].includes(ctx.forecast)) m *= 2.2;
      else if (ctx.forecast === 'Vent fort') m *= 1.5;
      if (ctx.location === 'Montagne') m *= 1.4;
      break;
    case 'bar_shortage':
      m *= ctx.barCoverage < 1 ? 1.8 : 0.45;
      break;
    case 'crowd_crush':
      m *= ctx.occupancyEstimate > 0.92 ? 2.1 : 0.6;
      break;
    case 'sick_artist':
      // line-up peu fiable => plus de risque
      m *= clamp(1.6 - ctx.avgReliability / 100, 0.6, 1.6);
      break;
    case 'logistics_accident':
      if (['Montagne', 'Campagne'].includes(ctx.location)) m *= 1.4;
      break;
    case 'viral_buzz':
      m *= clamp(0.6 + ctx.marketingAwareness / 60000, 0.6, 2.2);
      break;
    case 'press_award':
      m *= clamp(0.5 + ctx.reputation / 600, 0.5, 1.8);
      break;
    case 'surprise_guest':
      m *= clamp(0.5 + ctx.reputation / 700, 0.5, 1.6);
      break;
  }
  return m;
}

/**
 * Tire les évènements déclenchés pour l'édition. Déterministe via `rng`.
 * On limite à 3 évènements max pour ne pas noyer le joueur.
 */
export function rollEvents(ctx: EventRollContext, rng: () => number): RandomEventDef[] {
  const triggered: RandomEventDef[] = [];
  for (const def of RANDOM_EVENTS) {
    const p = clamp(def.baseProbability * modifier(def, ctx), 0, 0.95);
    if (rng() < p) triggered.push(def);
  }
  // garantit au moins un évènement pour le piquant, plafonne à 3
  if (triggered.length === 0) {
    const positives = RANDOM_EVENTS.filter((e) => e.type === 'positive');
    triggered.push(positives[Math.floor(rng() * positives.length)]);
  }
  return triggered.slice(0, 3);
}

export interface ResolvedChoice {
  def: RandomEventDef;
  optionIndex: number;
}

export interface EventEffects {
  attendanceMult: number;
  satisfaction: number;
  money: number; // inclut le coût des options choisies
  reputation: number;
  buzz: boolean;
}

export function applyEvents(choices: ResolvedChoice[]): {
  effects: EventEffects;
  resolved: { defId: string; label: string; emoji: string; chosenOption: string; outcome: string }[];
} {
  const effects: EventEffects = {
    attendanceMult: 1,
    satisfaction: 0,
    money: 0,
    reputation: 0,
    buzz: false,
  };
  const resolved = [];

  for (const { def, optionIndex } of choices) {
    const opt = def.options[optionIndex] ?? def.options[def.options.length - 1];
    const m = opt.mitigation;

    if (def.impact.attendance !== undefined) {
      effects.attendanceMult *= 1 + (def.impact.attendance - 1) * m;
    }
    if (def.impact.satisfaction !== undefined) effects.satisfaction += def.impact.satisfaction * m;
    if (def.impact.money !== undefined) effects.money += def.impact.money * m;
    if (def.impact.reputation !== undefined) effects.reputation += def.impact.reputation * m;
    effects.money -= opt.cost;

    if (def.id === 'viral_buzz' && m > 0) effects.buzz = true;

    const outcome =
      def.type === 'positive'
        ? m > 1 ? 'Opportunité saisie et amplifiée !' : m > 0 ? 'Effet positif encaissé.' : 'Occasion manquée.'
        : m <= 0.25 ? 'Crise maîtrisée de justesse.' : m <= 0.6 ? 'Dégâts limités.' : 'Impact subi de plein fouet.';

    resolved.push({
      defId: def.id,
      label: def.label,
      emoji: def.emoji,
      chosenOption: opt.label,
      outcome,
    });
  }

  return { effects, resolved };
}
