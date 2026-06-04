import type { MarketingChannel, MarketingChannelId } from '../types';

// Une « unité » = un palier d'investissement dans le canal.
export const MARKETING_CHANNELS: MarketingChannel[] = [
  {
    id: 'Instagram',
    label: 'Instagram',
    emoji: '📸',
    description: 'Visuels léchés et stories. Polyvalent, excellent pour l\'image de marque.',
    unitCost: 4000,
    reachPerUnit: 9000,
    efficiency: 0.55,
    bestFor: ['EDM', 'Pop', 'Rap', 'Techno'],
  },
  {
    id: 'TikTok',
    label: 'TikTok',
    emoji: '🎵',
    description: 'Viralité maximale auprès des 16-25 ans. Imprévisible mais explosif.',
    unitCost: 3500,
    reachPerUnit: 14000,
    efficiency: 0.5,
    bestFor: ['Rap', 'Hardstyle', 'EDM', 'Techno'],
  },
  {
    id: 'Facebook',
    label: 'Facebook',
    emoji: '👍',
    description: 'Touche un public plus âgé et les groupes locaux. Conversion solide.',
    unitCost: 3000,
    reachPerUnit: 8000,
    efficiency: 0.6,
    bestFor: ['Rock', 'Pop'],
  },
  {
    id: 'Google Ads',
    label: 'Google Ads',
    emoji: '🔎',
    description: 'Capte l\'intention d\'achat. Conversion élevée, portée moyenne.',
    unitCost: 5000,
    reachPerUnit: 7000,
    efficiency: 0.72,
    bestFor: ['Pop', 'Rock', 'EDM'],
  },
  {
    id: 'Influenceurs',
    label: 'Influenceurs',
    emoji: '🌟',
    description: 'Partenariats créateurs. Cher mais crédibilité et engagement au top.',
    unitCost: 8000,
    reachPerUnit: 16000,
    efficiency: 0.66,
    bestFor: ['Rap', 'Techno', 'Hardstyle', 'EDM'],
  },
  {
    id: 'Affichage',
    label: 'Affichage / Print',
    emoji: '📰',
    description: 'Affiches, radio locale, presse. Notoriété régionale, faible ciblage.',
    unitCost: 6000,
    reachPerUnit: 11000,
    efficiency: 0.4,
    bestFor: ['Rock', 'Pop', 'Multi-genres'],
  },
];

export const MARKETING_MAP: Record<MarketingChannelId, MarketingChannel> =
  MARKETING_CHANNELS.reduce(
    (acc, c) => {
      acc[c.id] = c;
      return acc;
    },
    {} as Record<MarketingChannelId, MarketingChannel>,
  );
