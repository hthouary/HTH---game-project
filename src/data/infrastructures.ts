import type { InfraOption, InfraCategory } from '../types';

// Chaque option est achetable en plusieurs exemplaires (quantité).
// - `capacity` : ajoute à la jauge d'accueil du site (scènes uniquement)
// - `serves`   : nombre de festivaliers correctement « servis » par exemplaire
// - `revenuePerHead` : panier moyen généré par festivalier servi
// - `safety`   : réduction du risque d'incident (cumulatif, plafonné)
export const INFRASTRUCTURES: InfraOption[] = [
  // ----- SCÈNES -------------------------------------------------------------
  {
    id: 'stage_small', category: 'stage', label: 'Petite scène', emoji: '🎪',
    description: 'Idéale pour les découvertes et la scène locale.',
    cost: 15000, capacity: 4000, serves: 0, satisfaction: 3, reputation: 2,
    safety: 0, revenuePerHead: 0, tier: 1,
  },
  {
    id: 'stage_medium', category: 'stage', label: 'Scène moyenne', emoji: '🎭',
    description: 'Bon compromis pour accueillir des têtes d\'affiche montantes.',
    cost: 40000, capacity: 10000, serves: 0, satisfaction: 6, reputation: 5,
    safety: 0, revenuePerHead: 0, tier: 2,
  },
  {
    id: 'stage_big', category: 'stage', label: 'Grande scène', emoji: '🏟️',
    description: 'Son et lumière puissants pour les grandes affiches.',
    cost: 90000, capacity: 20000, serves: 0, satisfaction: 10, reputation: 10,
    safety: 0, revenuePerHead: 0, tier: 3,
  },
  {
    id: 'stage_main', category: 'stage', label: 'Mainstage', emoji: '🎆',
    description: 'Scène monumentale digne des plus grands festivals du monde.',
    cost: 180000, capacity: 35000, serves: 0, satisfaction: 16, reputation: 18,
    safety: 0, revenuePerHead: 0, tier: 4,
  },

  // ----- SANITAIRES ---------------------------------------------------------
  {
    id: 'toilets_basic', category: 'toilets', label: 'Toilettes sèches', emoji: '🚻',
    description: 'Le strict nécessaire. Mieux que rien.',
    cost: 4000, capacity: 0, serves: 4000, satisfaction: 4, reputation: 0,
    safety: 0, revenuePerHead: 0, tier: 1,
  },
  {
    id: 'toilets_comfort', category: 'toilets', label: 'Sanitaires confort', emoji: '🧼',
    description: 'Cabines entretenues, points d\'eau, files raisonnables.',
    cost: 9000, capacity: 0, serves: 6000, satisfaction: 8, reputation: 2,
    safety: 0, revenuePerHead: 0, tier: 1,
  },
  {
    id: 'toilets_premium', category: 'toilets', label: 'Sanitaires premium', emoji: '🚽',
    description: 'Blocs chauffés et nettoyés en continu. Le grand luxe.',
    cost: 18000, capacity: 0, serves: 9000, satisfaction: 12, reputation: 4,
    safety: 0, revenuePerHead: 0, tier: 2,
  },

  // ----- BARS ---------------------------------------------------------------
  {
    id: 'bar_mobile', category: 'bars', label: 'Bar mobile', emoji: '🍺',
    description: 'Comptoir nomade. Rapide à déployer.',
    cost: 6000, capacity: 0, serves: 3500, satisfaction: 4, reputation: 0,
    safety: 0, revenuePerHead: 9, tier: 1,
  },
  {
    id: 'bar_village', category: 'bars', label: 'Bar village', emoji: '🍻',
    description: 'Espace bar central avec plusieurs comptoirs.',
    cost: 16000, capacity: 0, serves: 7000, satisfaction: 7, reputation: 2,
    safety: 0, revenuePerHead: 15, tier: 2,
  },
  {
    id: 'bar_club', category: 'bars', label: 'Méga bar / Club', emoji: '🍸',
    description: 'Bar géant et cocktails. Gros générateur de revenus.',
    cost: 35000, capacity: 0, serves: 12000, satisfaction: 10, reputation: 5,
    safety: 0, revenuePerHead: 24, tier: 3,
  },

  // ----- FOOD ---------------------------------------------------------------
  {
    id: 'food_truck', category: 'food', label: 'Food truck', emoji: '🌭',
    description: 'Burgers, frites et snacks. Indispensable.',
    cost: 5000, capacity: 0, serves: 3000, satisfaction: 4, reputation: 0,
    safety: 0, revenuePerHead: 11, tier: 1,
  },
  {
    id: 'food_court', category: 'food', label: 'Food court', emoji: '🍕',
    description: 'Plusieurs stands variés réunis. Réduit les files.',
    cost: 14000, capacity: 0, serves: 7000, satisfaction: 7, reputation: 2,
    safety: 0, revenuePerHead: 17, tier: 2,
  },
  {
    id: 'food_gastro', category: 'food', label: 'Village gastronomique', emoji: '🍣',
    description: 'Street-food de chef et options veggie. Prestige culinaire.',
    cost: 30000, capacity: 0, serves: 12000, satisfaction: 10, reputation: 5,
    safety: 0, revenuePerHead: 25, tier: 3,
  },

  // ----- CAMPING ------------------------------------------------------------
  {
    id: 'camping_basic', category: 'camping', label: 'Camping standard', emoji: '⛺',
    description: 'Champ balisé pour planter sa tente.',
    cost: 12000, capacity: 0, serves: 8000, satisfaction: 5, reputation: 1,
    safety: 0, revenuePerHead: 7, tier: 1,
  },
  {
    id: 'camping_glamping', category: 'camping', label: 'Glamping', emoji: '🏕️',
    description: 'Tentes équipées, lits, douches chaudes. Confort haut de gamme.',
    cost: 28000, capacity: 0, serves: 4000, satisfaction: 9, reputation: 5,
    safety: 0, revenuePerHead: 28, tier: 2,
  },

  // ----- PARKING ------------------------------------------------------------
  {
    id: 'parking_std', category: 'parking', label: 'Parking standard', emoji: '🅿️',
    description: 'Champs de stationnement balisés.',
    cost: 8000, capacity: 0, serves: 6000, satisfaction: 3, reputation: 0,
    safety: 0, revenuePerHead: 5, tier: 1,
  },
  {
    id: 'parking_premium', category: 'parking', label: 'Parking + navettes', emoji: '🚌',
    description: 'Stationnement proche et navettes régulières. Fluidité maximale.',
    cost: 20000, capacity: 0, serves: 12000, satisfaction: 6, reputation: 2,
    safety: 0, revenuePerHead: 9, tier: 2,
  },

  // ----- ZONE VIP -----------------------------------------------------------
  {
    id: 'vip_lounge', category: 'vip', label: 'Carré VIP', emoji: '🥂',
    description: 'Espace privatif, vue scène et service dédié.',
    cost: 25000, capacity: 0, serves: 1500, satisfaction: 6, reputation: 6,
    safety: 0, revenuePerHead: 65, tier: 2,
  },
  {
    id: 'vip_premium', category: 'vip', label: 'Loges Premium', emoji: '👑',
    description: 'Loges privées, conciergerie, bracelets dorés. Prestige absolu.',
    cost: 60000, capacity: 0, serves: 3000, satisfaction: 9, reputation: 12,
    safety: 0, revenuePerHead: 130, tier: 3,
  },

  // ----- SÉCURITÉ -----------------------------------------------------------
  {
    id: 'security_std', category: 'security', label: 'Sécurité standard', emoji: '🦺',
    description: 'Agents aux entrées et fouilles de base.',
    cost: 18000, capacity: 0, serves: 10000, satisfaction: 3, reputation: 1,
    safety: 0.22, revenuePerHead: 0, tier: 1,
  },
  {
    id: 'security_pro', category: 'security', label: 'Sécurité renforcée', emoji: '🛡️',
    description: 'Dispositif complet : maîtres-chiens, PC sécurité, secours.',
    cost: 40000, capacity: 0, serves: 25000, satisfaction: 6, reputation: 4,
    safety: 0.4, revenuePerHead: 0, tier: 2,
  },

  // ----- PERSONNEL ----------------------------------------------------------
  {
    id: 'staff_volunteer', category: 'staff', label: 'Équipe bénévoles', emoji: '🤝',
    description: 'Bénévoles motivés. Économique mais formation limitée.',
    cost: 10000, capacity: 0, serves: 8000, satisfaction: 3, reputation: 0,
    safety: 0.08, revenuePerHead: 0, tier: 1,
  },
  {
    id: 'staff_pro', category: 'staff', label: 'Staff professionnel', emoji: '👷',
    description: 'Équipes expérimentées, logistique et accueil irréprochables.',
    cost: 30000, capacity: 0, serves: 20000, satisfaction: 7, reputation: 3,
    safety: 0.18, revenuePerHead: 0, tier: 2,
  },
];

export const INFRA_MAP: Record<string, InfraOption> = INFRASTRUCTURES.reduce(
  (acc, i) => {
    acc[i.id] = i;
    return acc;
  },
  {} as Record<string, InfraOption>,
);

export interface InfraCategoryMeta {
  id: InfraCategory;
  label: string;
  emoji: string;
  /** Catégorie « essentielle » : son insuffisance pénalise fortement la satisfaction */
  essential: boolean;
  hint: string;
}

export const INFRA_CATEGORIES: InfraCategoryMeta[] = [
  { id: 'stage', label: 'Scènes', emoji: '🎪', essential: true, hint: 'Déterminent la capacité d\'accueil du festival.' },
  { id: 'toilets', label: 'Sanitaires', emoji: '🚻', essential: true, hint: 'Indispensables : des files = des avis négatifs.' },
  { id: 'bars', label: 'Bars', emoji: '🍺', essential: true, hint: 'Confort + grosse source de revenus.' },
  { id: 'food', label: 'Restauration', emoji: '🍕', essential: true, hint: 'Nourrir tout le monde, sans faire la queue.' },
  { id: 'security', label: 'Sécurité', emoji: '🛡️', essential: true, hint: 'Réduit fortement le risque d\'incidents.' },
  { id: 'staff', label: 'Personnel', emoji: '👷', essential: true, hint: 'Organisation fluide et accueil.' },
  { id: 'camping', label: 'Camping', emoji: '⛺', essential: false, hint: 'Permet de rester plusieurs jours.' },
  { id: 'parking', label: 'Parking', emoji: '🅿️', essential: false, hint: 'Accès et fluidité des arrivées.' },
  { id: 'vip', label: 'Zone VIP', emoji: '👑', essential: false, hint: 'Petite jauge, très gros panier moyen.' },
];

export const CATEGORY_LABEL: Record<InfraCategory, string> = INFRA_CATEGORIES.reduce(
  (acc, c) => {
    acc[c.id] = c.label;
    return acc;
  },
  {} as Record<InfraCategory, string>,
);
