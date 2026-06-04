import type { MusicStyleDef, MusicStyle } from '../types';

export const MUSIC_STYLES: MusicStyleDef[] = [
  {
    id: 'Techno',
    label: 'Techno',
    emoji: '🔊',
    description: 'Kicks profonds, ambiance underground et nuits interminables.',
    audienceFactor: 0.9,
    costFactor: 0.95,
    affinity: ['EDM', 'Hardstyle'],
    targetChannels: ['Instagram', 'TikTok', 'Influenceurs'],
  },
  {
    id: 'EDM',
    label: 'EDM',
    emoji: '🎛️',
    description: 'Gros drops, mainstream festif, public large et international.',
    audienceFactor: 1.15,
    costFactor: 1.2,
    affinity: ['Techno', 'Hardstyle', 'Pop'],
    targetChannels: ['Instagram', 'TikTok', 'Google Ads'],
  },
  {
    id: 'Hardstyle',
    label: 'Hardstyle',
    emoji: '⚡',
    description: 'BPM élevés, communauté passionnée et fidèle.',
    audienceFactor: 0.8,
    costFactor: 1.0,
    affinity: ['Techno', 'EDM'],
    targetChannels: ['TikTok', 'Influenceurs', 'Instagram'],
  },
  {
    id: 'Rap',
    label: 'Rap',
    emoji: '🎤',
    description: 'Têtes d\'affiche ultra-populaires, public jeune et connecté.',
    audienceFactor: 1.2,
    costFactor: 1.25,
    affinity: ['Pop'],
    targetChannels: ['TikTok', 'Instagram', 'Influenceurs'],
  },
  {
    id: 'Rock',
    label: 'Rock',
    emoji: '🎸',
    description: 'Légendes des guitares, public fidèle et large tranche d\'âge.',
    audienceFactor: 1.0,
    costFactor: 1.05,
    affinity: ['Pop'],
    targetChannels: ['Facebook', 'Affichage', 'Google Ads'],
  },
  {
    id: 'Pop',
    label: 'Pop',
    emoji: '✨',
    description: 'Le plus grand public possible, familial et grand public.',
    audienceFactor: 1.3,
    costFactor: 1.15,
    affinity: ['Rap', 'Rock', 'EDM'],
    targetChannels: ['Instagram', 'Facebook', 'Google Ads'],
  },
  {
    id: 'Multi-genres',
    label: 'Multi-genres',
    emoji: '🌈',
    description: 'Programmation éclectique : touche tous les publics mais sans niche forte.',
    audienceFactor: 1.1,
    costFactor: 1.1,
    affinity: ['Techno', 'EDM', 'Hardstyle', 'Rap', 'Rock', 'Pop'],
    targetChannels: ['Instagram', 'TikTok', 'Facebook', 'Google Ads', 'Affichage'],
  },
];

export const STYLE_MAP: Record<MusicStyle, MusicStyleDef> = MUSIC_STYLES.reduce(
  (acc, s) => {
    acc[s.id] = s;
    return acc;
  },
  {} as Record<MusicStyle, MusicStyleDef>,
);

/** Affinité entre deux genres : 1 = identique, 0.6 = proche, 0.25 = éloigné */
export function genreAffinity(festivalStyle: MusicStyle, artistGenre: MusicStyle): number {
  if (festivalStyle === artistGenre) return 1;
  const def = STYLE_MAP[festivalStyle];
  if (festivalStyle === 'Multi-genres') return 0.85;
  if (artistGenre === 'Multi-genres') return 0.7;
  if (def.affinity.includes(artistGenre)) return 0.6;
  return 0.25;
}
