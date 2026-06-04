// ============================================================================
// FESTITOCHE — Modèle de données du jeu
// ============================================================================

// ----- Styles musicaux -------------------------------------------------------
export type MusicStyle =
  | 'Techno'
  | 'EDM'
  | 'Hardstyle'
  | 'Rap'
  | 'Rock'
  | 'Pop'
  | 'Multi-genres';

export interface MusicStyleDef {
  id: MusicStyle;
  label: string;
  emoji: string;
  description: string;
  /** Multiplicateur sur le public potentiel (1 = neutre) */
  audienceFactor: number;
  /** Multiplicateur sur le coût des artistes du genre */
  costFactor: number;
  /** Genres « proches » qui rapportent quand même de la satisfaction */
  affinity: MusicStyle[];
  /** Publics cibles préférés pour le marketing */
  targetChannels: MarketingChannelId[];
}

// ----- Localisations ---------------------------------------------------------
export type LocationId =
  | 'Ville'
  | 'Campagne'
  | 'Montagne'
  | 'Bord de lac'
  | 'Bord de mer'
  | 'Zone industrielle';

export interface LocationDef {
  id: LocationId;
  label: string;
  emoji: string;
  description: string;
  /** Coût fixe de location du terrain par édition */
  baseCost: number;
  /** Capacité d'accueil maximale possible sur ce site */
  maxCapacity: number;
  /** Influence le public potentiel (1 = neutre) */
  audienceFactor: number;
  /** Bonus/malus de réputation de départ */
  reputationBias: number;
  /** Pondération du climat — probabilités d'évènements météo */
  weather: Record<WeatherId, number>;
  /** Contraintes propres au site (texte + impact satisfaction) */
  constraint: string;
}

// ----- Météo -----------------------------------------------------------------
export type WeatherId =
  | 'Grand soleil'
  | 'Nuageux'
  | 'Pluie'
  | 'Orage'
  | 'Canicule'
  | 'Vent fort';

export interface WeatherDef {
  id: WeatherId;
  label: string;
  emoji: string;
  /** Impact multiplicatif sur la fréquentation */
  attendanceFactor: number;
  /** Impact additif sur la satisfaction (points) */
  satisfaction: number;
}

// ----- Artistes --------------------------------------------------------------
export interface Artist {
  id: string;
  name: string;
  genre: MusicStyle;
  /** 0-100 : notoriété, évolue chaque année */
  popularity: number;
  /** Cachet en euros */
  cost: number;
  /** 0-100 : qualité du show sur scène */
  showQuality: number;
  /** 0-100 : exigence technique (impacte le coût d'organisation et le risque) */
  technicalRequirement: number;
  /** 0-100 : fiabilité (risque d'annulation / retard) */
  reliability: number;
  /** 0-100 : satisfaction générée chez les festivaliers */
  satisfaction: number;
  /** Palier de réputation minimal pour pouvoir le recruter */
  tier: number;
}

// ----- Infrastructures -------------------------------------------------------
export type InfraCategory =
  | 'stage'
  | 'toilets'
  | 'bars'
  | 'food'
  | 'camping'
  | 'parking'
  | 'vip'
  | 'security'
  | 'staff';

export interface InfraOption {
  id: string;
  category: InfraCategory;
  label: string;
  emoji: string;
  description: string;
  cost: number;
  /** Capacité d'accueil apportée (pour les scènes / camping) */
  capacity: number;
  /** Combien de festivaliers cet équipement « sert » correctement */
  serves: number;
  /** Impact direct sur la satisfaction si bien dimensionné (points) */
  satisfaction: number;
  /** Impact sur la réputation */
  reputation: number;
  /** Réduction du risque d'incident (0-1), pour sécurité/staff */
  safety: number;
  /** Revenu généré par festivalier (bars, food, vip) */
  revenuePerHead: number;
  /** Palier de réputation minimal */
  tier: number;
}

// ----- Marketing -------------------------------------------------------------
export type MarketingChannelId =
  | 'Instagram'
  | 'TikTok'
  | 'Facebook'
  | 'Google Ads'
  | 'Influenceurs'
  | 'Affichage';

export interface MarketingChannel {
  id: MarketingChannelId;
  label: string;
  emoji: string;
  description: string;
  /** Coût d'une « unité » d'investissement */
  unitCost: number;
  /** Portée brute par unité (personnes touchées) */
  reachPerUnit: number;
  /** Efficacité de conversion de base (0-1) */
  efficiency: number;
  /** Tranches d'âge / publics où le canal est le plus efficace */
  bestFor: MusicStyle[];
}

export interface MarketingPlan {
  /** channelId -> nombre d'unités achetées */
  units: Partial<Record<MarketingChannelId, number>>;
}

// ----- Sponsors --------------------------------------------------------------
export type SponsorCategory =
  | 'Boisson énergisante'
  | 'Bière'
  | 'Automobile'
  | 'Téléphonie'
  | 'Équipementier'
  | 'Streaming'
  | 'Banque'
  | 'Fast-food';

export interface Sponsor {
  id: string;
  name: string;
  category: SponsorCategory;
  emoji: string;
  /** Montant proposé */
  amount: number;
  /** Réputation minimale exigée */
  minReputation: number;
  /** Genres avec lesquels la marque colle bien */
  affinityStyles: MusicStyle[];
  /** Impact sur l'image si incompatible (points de satisfaction) */
  imageRisk: number;
  /** Exigence textuelle */
  requirement: string;
  tier: number;
}

// ----- Événements aléatoires -------------------------------------------------
export interface RandomEventOption {
  label: string;
  /** Coût immédiat de la solution */
  cost: number;
  /** Modificateur appliqué à l'impact (1 = aucune réduction, 0 = annulé) */
  mitigation: number;
  description: string;
}

export interface RandomEventDef {
  id: string;
  label: string;
  emoji: string;
  description: string;
  /** Probabilité de base (0-1) */
  baseProbability: number;
  type: 'negative' | 'positive';
  /** Impacts par défaut si non géré */
  impact: {
    attendance?: number; // multiplicateur
    satisfaction?: number; // additif
    money?: number; // additif (euros)
    reputation?: number; // additif
  };
  options: RandomEventOption[];
}

// Un évènement résolu pendant une édition
export interface ResolvedEvent {
  defId: string;
  label: string;
  emoji: string;
  chosenOption: string;
  outcome: string;
}

// ----- État de planification de l'édition en cours ---------------------------
export interface EditionPlan {
  bookedArtistIds: string[];
  /** Programme horaire des artistes */
  timetable: TimetableSlot[];
  /** infraOptionId -> quantité achetée */
  infrastructures: Record<string, number>;
  marketing: MarketingPlan;
  acceptedSponsorIds: string[];
  ticketPrice: number;
}

// ----- Niveaux de réputation -------------------------------------------------
export type ReputationLevelId =
  | 'local'
  | 'régional'
  | 'national'
  | 'européen'
  | 'mondial';

export interface ReputationLevel {
  id: ReputationLevelId;
  label: string;
  emoji: string;
  min: number;
  tier: number;
  capacityCap: number;
  perk: string;
}

// ----- Rapport de fin d'édition ----------------------------------------------
export interface EditionReport {
  edition: number;
  festivalName: string;
  weather: WeatherId;
  // Fréquentation
  attendance: number;
  capacity: number;
  ticketsSold: number;
  ticketPrice: number;
  // Finances
  revenue: {
    tickets: number;
    sponsors: number;
    barsFood: number;
    vip: number;
    total: number;
  };
  expenses: {
    artists: number;
    infrastructure: number;
    marketing: number;
    staffSecurity: number;
    location: number;
    events: number;
    total: number;
  };
  profit: number;
  // Satisfaction
  satisfaction: {
    global: number;
    infrastructure: number;
    programming: number;
    organization: number;
  };
  // Réputation
  reputationBefore: number;
  reputationAfter: number;
  reputationDelta: number;
  levelBefore: ReputationLevelId;
  levelAfter: ReputationLevelId;
  // Détails
  events: ResolvedEvent[];
  reviews: VisitorReview[];
  headliners: string[];
  budgetBefore: number;
  budgetAfter: number;
  /** Score du timetable (0-100) — null si pas de timetable */
  timetableScore: number | null;
  /** Problèmes détectés dans le timetable */
  timetableIssues: string[];
  /** Nombre de jours du festival */
  festivalDays: number;
}

export interface VisitorReview {
  author: string;
  rating: number; // 0-5
  text: string;
}

// ----- Planning horaire (timetable) -----------------------------------------
export const SLOTS_PER_DAY = 5;
export const SLOT_LABELS = ['Ouverture (12h)', 'Après-midi (15h)', 'Pré-soirée (18h)', 'Soirée (21h)', 'Nuit (00h)'];
export const SLOT_CROWD_FACTOR = [0.25, 0.45, 0.65, 1.0, 0.85] as const;

export interface TimetableSlot {
  artistId: string;
  /** ID de l'infra scène (stage_small, stage_medium, stage_big, stage_main) */
  stageId: string;
  /** Jour dans le festival (0-indexed) */
  day: number;
  /** Créneau horaire dans la journée (0-4) */
  slotIndex: number;
}

// ----- Festival (état persistant principal) ----------------------------------
export interface Festival {
  name: string;
  style: MusicStyle;
  location: LocationId;
  /** Mois de l'édition (1 = janvier, 12 = décembre) */
  month: number;
  /** Durée en jours (1 à 4) */
  days: number;
}

// ----- Phases du jeu ---------------------------------------------------------
export type GamePhase =
  | 'dashboard'
  | 'programming'
  | 'timetable'
  | 'infrastructure'
  | 'marketing'
  | 'sponsors'
  | 'tickets'
  | 'simulation'
  | 'report';

// ----- État global -----------------------------------------------------------
export interface GameState {
  // null = pas de partie en cours -> écran de création
  festival: Festival | null;
  edition: number;
  budget: number;
  reputation: number;
  /** Popularité du festival (0-100), distincte de la réputation absolue */
  popularity: number;
  /** Satisfaction moyenne de la dernière édition (0-100) */
  lastSatisfaction: number;
  /** Billets vendus à la dernière édition */
  lastTicketsSold: number;
  // Catalogue d'artistes (mutable : la popularité évolue)
  artists: Artist[];
  // Sponsors qui font une offre cette année
  sponsorOffers: Sponsor[];
  // Météo prévue pour l'édition à venir
  forecast: WeatherId;
  // Planification en cours
  plan: EditionPlan;
  // Historique
  history: EditionReport[];
  // Phase d'UI courante
  phase: GamePhase;
  // Pour la sauvegarde / versioning
  createdAt: number;
  updatedAt: number;
  version: number;
}
