import type { VisitorReview, WeatherId } from '../types';
import { clamp } from '../utils/format';

export interface FeedbackContext {
  global: number;
  programming: number;
  infrastructure: number;
  organization: number;
  weather: WeatherId;
  priceRatio: number; // prix payé / prix de référence
  occupancy: number; // affluence / capacité
  barCoverage: number;
  toiletCoverage: number;
  foodCoverage: number;
  headliner: string;
  buzz: boolean;
}

const FIRST_NAMES = [
  'Léa', 'Hugo', 'Manon', 'Lucas', 'Chloé', 'Théo', 'Camille', 'Nathan', 'Sarah',
  'Maxime', 'Inès', 'Enzo', 'Jade', 'Tom', 'Louna', 'Raphaël', 'Emma', 'Noah',
  'Lina', 'Gabriel', 'Zoé', 'Adam', 'Romane', 'Eliott', 'Anaïs', 'Yanis',
];

interface Phrase {
  // condition renvoyant un poids (0 = inapplicable)
  weight: (c: FeedbackContext) => number;
  text: (c: FeedbackContext) => string;
  // influence sur la note de l'avis (-2..+2)
  mood: number;
}

const PHRASES: Phrase[] = [
  // --- Programmation ---
  { mood: 2, weight: (c) => (c.programming >= 78 ? 3 : 0),
    text: (c) => `Programmation de folie, ${c.headliner} était incroyable en tête d'affiche !` },
  { mood: 1, weight: (c) => (c.programming >= 62 && c.programming < 78 ? 2 : 0),
    text: () => `Très belle affiche, plusieurs découvertes que j'ai adorées.` },
  { mood: -2, weight: (c) => (c.programming < 45 ? 3 : 0),
    text: () => `La prog était décevante, peu de noms qui donnaient vraiment envie.` },
  { mood: -1, weight: (c) => (c.programming >= 45 && c.programming < 58 ? 1.5 : 0),
    text: () => `Line-up correct mais sans tête d'affiche marquante.` },

  // --- Bars ---
  { mood: -2, weight: (c) => (c.barCoverage < 0.7 ? 3 : 0),
    text: () => `Files d'attente interminables aux bars, j'ai passé ma soirée à faire la queue.` },
  { mood: 1, weight: (c) => (c.barCoverage >= 1.1 ? 1.5 : 0),
    text: () => `Aucune attente aux bars, le service était super fluide.` },

  // --- Toilettes ---
  { mood: -2, weight: (c) => (c.toiletCoverage < 0.7 ? 3 : 0),
    text: () => `Les sanitaires étaient sous-dimensionnés et sales en fin de journée.` },
  { mood: 1, weight: (c) => (c.toiletCoverage >= 1.2 ? 1 : 0),
    text: () => `Bonne surprise : des sanitaires propres et nombreux !` },

  // --- Food ---
  { mood: -1, weight: (c) => (c.foodCoverage < 0.7 ? 2 : 0),
    text: () => `Pas assez de stands de nourriture, difficile de manger sans attendre 30 min.` },
  { mood: 2, weight: (c) => (c.foodCoverage >= 1.1 && c.infrastructure >= 65 ? 1.5 : 0),
    text: () => `Le village food était top, beaucoup de choix et de qualité.` },

  // --- Organisation / sécurité / crowd ---
  { mood: -2, weight: (c) => (c.occupancy > 0.97 && c.organization < 60 ? 3 : 0),
    text: () => `Beaucoup trop de monde devant la scène, c'était dangereux et étouffant.` },
  { mood: 2, weight: (c) => (c.organization >= 75 ? 2 : 0),
    text: () => `Organisation au top : sécurité présente, entrées rapides, rien à redire.` },
  { mood: -1, weight: (c) => (c.organization < 50 ? 2 : 0),
    text: () => `Grosse pagaille à l'entrée et au parking, l'orga peut mieux faire.` },

  // --- Météo ---
  { mood: -2, weight: (c) => (['Pluie', 'Orage'].includes(c.weather) ? 2 : 0),
    text: () => `La pluie a un peu gâché l'ambiance, prévoyez des bottes !` },
  { mood: -1, weight: (c) => (c.weather === 'Canicule' ? 2 : 0),
    text: () => `Une vraie fournaise, il manquait des points d'eau et d'ombre.` },
  { mood: 1, weight: (c) => (c.weather === 'Grand soleil' ? 1.5 : 0),
    text: () => `Soleil radieux tout le week-end, conditions parfaites !` },

  // --- Prix ---
  { mood: -1, weight: (c) => (c.priceRatio > 1.35 ? 2.5 : 0),
    text: () => `Le billet était clairement trop cher pour ce qui était proposé.` },
  { mood: 2, weight: (c) => (c.priceRatio < 0.8 ? 1.5 : 0),
    text: () => `Excellent rapport qualité-prix, je reviendrai sans hésiter !` },

  // --- Buzz / général ---
  { mood: 2, weight: (c) => (c.buzz ? 2 : 0),
    text: () => `L'ambiance était dingue, tout le monde en parle sur les réseaux !` },
  { mood: 2, weight: (c) => (c.global >= 80 ? 2.5 : 0),
    text: () => `Meilleur festival de l'année, une organisation exemplaire et une prog en or.` },
  { mood: -2, weight: (c) => (c.global < 40 ? 2.5 : 0),
    text: () => `Très déçu sur toute la ligne, je ne suis pas sûr de revenir l'an prochain.` },
  { mood: 0, weight: (c) => (c.global >= 50 && c.global < 65 ? 1.5 : 0),
    text: () => `Festival sympa dans l'ensemble, quelques détails à améliorer.` },
];

interface WeightedPhrase {
  phrase: Phrase;
  weight: number;
}

function pickWeighted(pool: WeightedPhrase[], rng: () => number): WeightedPhrase | null {
  const total = pool.reduce((s, p) => s + p.weight, 0);
  if (total <= 0) return null;
  let r = rng() * total;
  for (const p of pool) {
    r -= p.weight;
    if (r <= 0) return p;
  }
  return pool[pool.length - 1];
}

export function generateReviews(ctx: FeedbackContext, rng: () => number, count = 6): VisitorReview[] {
  const reviews: VisitorReview[] = [];
  const usedTexts = new Set<string>();
  const usedNames = new Set<string>();

  const pool: WeightedPhrase[] = PHRASES.map((phrase) => ({ phrase, weight: phrase.weight(ctx) }));

  let safety = 0;
  while (reviews.length < count && safety < 50) {
    safety++;
    const active = pool.filter((p) => p.weight > 0);
    const chosen = pickWeighted(active, rng);
    if (!chosen) break;

    const text = chosen.phrase.text(ctx);
    if (usedTexts.has(text)) {
      chosen.weight = 0;
      continue;
    }
    usedTexts.add(text);
    chosen.weight *= 0.25; // réduit la probabilité de re-sélection

    let name = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)];
    let guard = 0;
    while (usedNames.has(name) && guard < 12) {
      name = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)];
      guard++;
    }
    usedNames.add(name);

    const base = ctx.global / 20; // 0-5
    const rating = clamp(
      Math.round((base + chosen.phrase.mood + (rng() * 0.6 - 0.3)) * 2) / 2,
      0.5,
      5,
    );

    reviews.push({
      author: `${name} · @${name.toLowerCase()}${Math.floor(rng() * 90 + 10)}`,
      rating,
      text,
    });
  }

  if (reviews.length === 0) {
    reviews.push({
      author: 'Festivalier anonyme',
      rating: clamp(Math.round((ctx.global / 20) * 2) / 2, 0.5, 5),
      text: 'Une édition dans la moyenne, sans grande surprise.',
    });
  }

  return reviews;
}
