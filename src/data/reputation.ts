import type { ReputationLevel, ReputationLevelId } from '../types';

// Réputation sur une échelle 0 → 1000.
export const REPUTATION_LEVELS: ReputationLevel[] = [
  {
    id: 'local',
    label: 'Festival local',
    emoji: '📍',
    min: 0,
    tier: 1,
    capacityCap: 8000,
    perk: 'Artistes émergents, sponsors locaux, infrastructures de base.',
  },
  {
    id: 'régional',
    label: 'Festival régional',
    emoji: '🗺️',
    min: 200,
    tier: 2,
    capacityCap: 16000,
    perk: 'Têtes d\'affiche montantes, sponsors régionaux, scène moyenne.',
  },
  {
    id: 'national',
    label: 'Festival national',
    emoji: '🏆',
    min: 400,
    tier: 3,
    capacityCap: 28000,
    perk: 'Stars nationales, grands sponsors, grande scène & zone VIP.',
  },
  {
    id: 'européen',
    label: 'Festival européen',
    emoji: '🇪🇺',
    min: 600,
    tier: 4,
    capacityCap: 45000,
    perk: 'Têtes d\'affiche internationales, sponsors majeurs, Mainstage.',
  },
  {
    id: 'mondial',
    label: 'Festival mondial',
    emoji: '🌍',
    min: 820,
    tier: 5,
    capacityCap: 60000,
    perk: 'Superstars planétaires, méga-sponsors, infrastructures de prestige.',
  },
];

export function getReputationLevel(reputation: number): ReputationLevel {
  let current = REPUTATION_LEVELS[0];
  for (const lvl of REPUTATION_LEVELS) {
    if (reputation >= lvl.min) current = lvl;
  }
  return current;
}

export function getLevelById(id: ReputationLevelId): ReputationLevel {
  return REPUTATION_LEVELS.find((l) => l.id === id) ?? REPUTATION_LEVELS[0];
}

/** Progression vers le prochain palier (0-1) + palier suivant éventuel */
export function reputationProgress(reputation: number): {
  level: ReputationLevel;
  next: ReputationLevel | null;
  progress: number;
} {
  const level = getReputationLevel(reputation);
  const idx = REPUTATION_LEVELS.findIndex((l) => l.id === level.id);
  const next = REPUTATION_LEVELS[idx + 1] ?? null;
  if (!next) return { level, next: null, progress: 1 };
  const progress = (reputation - level.min) / (next.min - level.min);
  return { level, next, progress: Math.max(0, Math.min(1, progress)) };
}
