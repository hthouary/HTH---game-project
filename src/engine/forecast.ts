import type { LocationId, WeatherId } from '../types';
import { LOCATION_MAP } from '../data/locations';
import { weightedPick } from '../utils/rng';

const MONTH_WEATHER_ADJUST: Record<WeatherId, number[]> = {
  // index = month-1 (0 = janvier), valeur = multiplicateur des poids de base
  'Grand soleil': [0.4, 0.5, 0.7, 0.9, 1.1, 1.4, 1.6, 1.5, 1.2, 0.8, 0.6, 0.4],
  Nuageux:       [1.2, 1.1, 1.1, 1.0, 1.0, 0.9, 0.8, 0.8, 1.0, 1.1, 1.2, 1.2],
  Pluie:         [1.5, 1.4, 1.2, 1.1, 1.0, 0.7, 0.5, 0.6, 0.9, 1.2, 1.4, 1.5],
  Orage:         [0.5, 0.5, 0.7, 0.9, 1.1, 1.2, 1.3, 1.4, 1.2, 0.8, 0.6, 0.5],
  Canicule:      [0.0, 0.0, 0.0, 0.1, 0.3, 0.8, 1.5, 1.4, 0.6, 0.1, 0.0, 0.0],
  'Vent fort':   [1.4, 1.3, 1.2, 1.0, 0.8, 0.7, 0.6, 0.7, 0.9, 1.1, 1.3, 1.5],
};

/** Génère une prévision météo selon le climat de la localisation et le mois. */
export function generateForecast(location: LocationId, rng: () => number, month?: number): WeatherId {
  const loc = LOCATION_MAP[location];
  const m = (month ?? 7) - 1; // 0-indexed

  const adjusted: Record<WeatherId, number> = {} as Record<WeatherId, number>;
  for (const [id, weights] of Object.entries(MONTH_WEATHER_ADJUST) as [WeatherId, number[]][]) {
    const base = loc.weather[id] ?? 0;
    adjusted[id] = Math.max(0, base * weights[m]);
  }

  return weightedPick(adjusted, rng());
}
