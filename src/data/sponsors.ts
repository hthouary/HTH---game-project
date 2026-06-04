import type { Sponsor } from '../types';

// Marques fictives. `tier` = palier de réputation requis pour débloquer l'offre.
export const SPONSORS: Sponsor[] = [
  // --- Tier 1 : local ---
  {
    id: 'sp_voltz', name: 'Voltz Energy', category: 'Boisson énergisante', emoji: '⚡',
    amount: 18000, minReputation: 0, affinityStyles: ['Techno', 'EDM', 'Hardstyle'],
    imageRisk: 4, requirement: 'Stand de distribution gratuite à l\'entrée.', tier: 1,
  },
  {
    id: 'sp_brassdupont', name: 'Brasserie Dupont', category: 'Bière', emoji: '🍺',
    amount: 14000, minReputation: 0, affinityStyles: ['Rock', 'Multi-genres'],
    imageRisk: 3, requirement: 'Exclusivité bière sur tous les bars.', tier: 1,
  },
  {
    id: 'sp_pizzapronto', name: 'Pizza Pronto', category: 'Fast-food', emoji: '🍕',
    amount: 9000, minReputation: 0, affinityStyles: ['Pop', 'Rap', 'Multi-genres'],
    imageRisk: 2, requirement: 'Food trucks aux couleurs de la marque.', tier: 1,
  },
  {
    id: 'sp_radiolokal', name: 'Radio Lokal', category: 'Téléphonie', emoji: '📻',
    amount: 7000, minReputation: 0, affinityStyles: ['Multi-genres', 'Rock', 'Pop'],
    imageRisk: 1, requirement: 'Mentions à l\'antenne et logo sur l\'affiche.', tier: 1,
  },

  // --- Tier 2 : régional ---
  {
    id: 'sp_turbocola', name: 'TurboCola', category: 'Boisson énergisante', emoji: '🥤',
    amount: 42000, minReputation: 200, affinityStyles: ['EDM', 'Pop', 'Rap'],
    imageRisk: 5, requirement: 'Une scène doit porter le nom de la marque.', tier: 2,
  },
  {
    id: 'sp_blondine', name: 'Blondine', category: 'Bière', emoji: '🍻',
    amount: 38000, minReputation: 200, affinityStyles: ['Rock', 'Multi-genres', 'EDM'],
    imageRisk: 4, requirement: 'Bar éphémère géant à leur effigie.', tier: 2,
  },
  {
    id: 'sp_zephir', name: 'Zéphir Mobile', category: 'Téléphonie', emoji: '📱',
    amount: 45000, minReputation: 200, affinityStyles: ['Pop', 'Rap', 'EDM'],
    imageRisk: 3, requirement: 'Bornes de recharge sponsorisées partout.', tier: 2,
  },
  {
    id: 'sp_kicksport', name: 'KickSport', category: 'Équipementier', emoji: '👟',
    amount: 40000, minReputation: 200, affinityStyles: ['Rap', 'Hardstyle', 'Techno'],
    imageRisk: 4, requirement: 'Espace lifestyle et drops exclusifs.', tier: 2,
  },
  {
    id: 'sp_flowtv', name: 'Flow TV', category: 'Streaming', emoji: '📺',
    amount: 36000, minReputation: 200, affinityStyles: ['Pop', 'Multi-genres'],
    imageRisk: 2, requirement: 'Captation et diffusion en direct.', tier: 2,
  },

  // --- Tier 3 : national ---
  {
    id: 'sp_nitrox', name: 'Nitrox', category: 'Boisson énergisante', emoji: '🔋',
    amount: 95000, minReputation: 400, affinityStyles: ['Hardstyle', 'Techno', 'EDM'],
    imageRisk: 7, requirement: 'Naming d\'une scène + dôme immersif de marque.', tier: 3,
  },
  {
    id: 'sp_drivex', name: 'DriveX Motors', category: 'Automobile', emoji: '🚗',
    amount: 110000, minReputation: 400, affinityStyles: ['Pop', 'Rock', 'EDM'],
    imageRisk: 6, requirement: 'Exposition de véhicules + zone test-drive.', tier: 3,
  },
  {
    id: 'sp_streamax', name: 'Streamax', category: 'Streaming', emoji: '🎬',
    amount: 90000, minReputation: 400, affinityStyles: ['Pop', 'Rap', 'Multi-genres'],
    imageRisk: 3, requirement: 'Documentaire exclusif sur le festival.', tier: 3,
  },
  {
    id: 'sp_banquenova', name: 'Banque Nova', category: 'Banque', emoji: '🏦',
    amount: 85000, minReputation: 400, affinityStyles: ['Pop', 'Rock'],
    imageRisk: 8, requirement: 'Paiement cashless exclusif Banque Nova.', tier: 3,
  },
  {
    id: 'sp_aeris', name: 'Aéris Telecom', category: 'Téléphonie', emoji: '📡',
    amount: 100000, minReputation: 400, affinityStyles: ['EDM', 'Pop', 'Techno'],
    imageRisk: 4, requirement: 'Couverture 5G et appli officielle co-brandée.', tier: 3,
  },

  // --- Tier 4 : européen ---
  {
    id: 'sp_voltzpro', name: 'Voltz Worldwide', category: 'Boisson énergisante', emoji: '🌐',
    amount: 220000, minReputation: 600, affinityStyles: ['EDM', 'Hardstyle', 'Techno', 'Rap'],
    imageRisk: 8, requirement: 'Sponsor-titre du festival (naming global).', tier: 4,
  },
  {
    id: 'sp_velocita', name: 'Velocità', category: 'Automobile', emoji: '🏎️',
    amount: 260000, minReputation: 600, affinityStyles: ['EDM', 'Pop', 'Techno'],
    imageRisk: 7, requirement: 'Show automobile et stage premium de marque.', tier: 4,
  },
  {
    id: 'sp_globalpay', name: 'GlobalPay', category: 'Banque', emoji: '💳',
    amount: 240000, minReputation: 600, affinityStyles: ['Pop', 'EDM', 'Rap'],
    imageRisk: 6, requirement: 'Écosystème cashless & billetterie intégrée.', tier: 4,
  },
  {
    id: 'sp_hyperstream', name: 'HyperStream', category: 'Streaming', emoji: '🛰️',
    amount: 210000, minReputation: 600, affinityStyles: ['Pop', 'Rap', 'EDM', 'Multi-genres'],
    imageRisk: 3, requirement: 'Diffusion mondiale en live et droits exclusifs.', tier: 4,
  },

  // --- Tier 5 : mondial ---
  {
    id: 'sp_aurum', name: 'Aurum Mobility', category: 'Automobile', emoji: '⚜️',
    amount: 520000, minReputation: 820, affinityStyles: ['EDM', 'Pop', 'Techno', 'Rap'],
    imageRisk: 9, requirement: 'Partenariat mondial pluriannuel exclusif.', tier: 5,
  },
  {
    id: 'sp_planetcola', name: 'Planet Cola', category: 'Boisson énergisante', emoji: '🪐',
    amount: 480000, minReputation: 820, affinityStyles: ['EDM', 'Pop', 'Hardstyle', 'Rap'],
    imageRisk: 8, requirement: 'Activation immersive géante + naming mondial.', tier: 5,
  },
];
