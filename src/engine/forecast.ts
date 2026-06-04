import type { LocationId, WeatherId } from '../types';
import { LOCATION_MAP } from '../data/locations';
import { weightedPick } from '../utils/rng';

/** Génère une prévision météo selon le climat de la localisation. */
export function generateForecast(location: LocationId, rng: () => number): WeatherId {
  const loc = LOCATION_MAP[location];
  return weightedPick(loc.weather, rng());
}
