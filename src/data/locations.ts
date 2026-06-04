import type { LocationDef, LocationId } from '../types';

export const LOCATIONS: LocationDef[] = [
  {
    id: 'Ville',
    label: 'Ville',
    emoji: '🏙️',
    description: 'Accès facile, transports en commun, mais voisinage et nuisances sonores.',
    baseCost: 80000,
    maxCapacity: 40000,
    audienceFactor: 1.25,
    reputationBias: 5,
    weather: { 'Grand soleil': 3, Nuageux: 4, Pluie: 2, Orage: 1, Canicule: 1, 'Vent fort': 1 },
    constraint: 'Couvre-feu strict & plaintes du voisinage fréquentes.',
  },
  {
    id: 'Campagne',
    label: 'Campagne',
    emoji: '🌾',
    description: 'Grands espaces bon marché, camping facile, mais accès routier limité.',
    baseCost: 35000,
    maxCapacity: 60000,
    audienceFactor: 0.95,
    reputationBias: 0,
    weather: { 'Grand soleil': 4, Nuageux: 3, Pluie: 3, Orage: 2, Canicule: 1, 'Vent fort': 1 },
    constraint: 'Routes étroites : logistique et parking plus compliqués.',
  },
  {
    id: 'Montagne',
    label: 'Montagne',
    emoji: '⛰️',
    description: 'Cadre spectaculaire et instagrammable, mais météo capricieuse et accès difficile.',
    baseCost: 55000,
    maxCapacity: 30000,
    audienceFactor: 0.85,
    reputationBias: 10,
    weather: { 'Grand soleil': 3, Nuageux: 3, Pluie: 3, Orage: 3, Canicule: 0, 'Vent fort': 3 },
    constraint: 'Météo imprévisible et risques d\'orages en altitude.',
  },
  {
    id: 'Bord de lac',
    label: 'Bord de lac',
    emoji: '🏞️',
    description: 'Décor idyllique très apprécié, baignade possible, public premium.',
    baseCost: 65000,
    maxCapacity: 35000,
    audienceFactor: 1.1,
    reputationBias: 12,
    weather: { 'Grand soleil': 4, Nuageux: 3, Pluie: 2, Orage: 2, Canicule: 1, 'Vent fort': 2 },
    constraint: 'Zone naturelle protégée : normes environnementales strictes.',
  },
  {
    id: 'Bord de mer',
    label: 'Bord de mer',
    emoji: '🏖️',
    description: 'Ambiance vacances, énorme attractivité touristique l\'été.',
    baseCost: 90000,
    maxCapacity: 45000,
    audienceFactor: 1.3,
    reputationBias: 15,
    weather: { 'Grand soleil': 5, Nuageux: 3, Pluie: 2, Orage: 1, Canicule: 2, 'Vent fort': 3 },
    constraint: 'Vent marin et sable : matériel technique mis à rude épreuve.',
  },
  {
    id: 'Zone industrielle',
    label: 'Zone industrielle',
    emoji: '🏭',
    description: 'Friche urbaine brute, parfaite pour la techno, peu de contraintes de voisinage.',
    baseCost: 45000,
    maxCapacity: 50000,
    audienceFactor: 1.0,
    reputationBias: -5,
    weather: { 'Grand soleil': 3, Nuageux: 4, Pluie: 3, Orage: 2, Canicule: 2, 'Vent fort': 2 },
    constraint: 'Image « brute » : moins valorisante pour les sponsors familiaux.',
  },
];

export const LOCATION_MAP: Record<LocationId, LocationDef> = LOCATIONS.reduce(
  (acc, l) => {
    acc[l.id] = l;
    return acc;
  },
  {} as Record<LocationId, LocationDef>,
);
