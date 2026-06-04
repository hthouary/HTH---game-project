import type { WeatherDef, WeatherId } from '../types';

export const WEATHERS: WeatherDef[] = [
  { id: 'Grand soleil', label: 'Grand soleil', emoji: '☀️', attendanceFactor: 1.12, satisfaction: 8 },
  { id: 'Nuageux', label: 'Nuageux', emoji: '⛅', attendanceFactor: 1.0, satisfaction: 0 },
  { id: 'Pluie', label: 'Pluie', emoji: '🌧️', attendanceFactor: 0.82, satisfaction: -14 },
  { id: 'Orage', label: 'Orage', emoji: '⛈️', attendanceFactor: 0.7, satisfaction: -22 },
  { id: 'Canicule', label: 'Canicule', emoji: '🥵', attendanceFactor: 0.92, satisfaction: -10 },
  { id: 'Vent fort', label: 'Vent fort', emoji: '💨', attendanceFactor: 0.95, satisfaction: -6 },
];

export const WEATHER_MAP: Record<WeatherId, WeatherDef> = WEATHERS.reduce(
  (acc, w) => {
    acc[w.id] = w;
    return acc;
  },
  {} as Record<WeatherId, WeatherDef>,
);
