import type { Artist } from '../types';
import { clamp } from '../utils/format';

function tierFromPop(pop: number): number {
  if (pop >= 85) return 5;
  if (pop >= 70) return 4;
  if (pop >= 52) return 3;
  if (pop >= 34) return 2;
  return 1;
}

/**
 * Fait évoluer la popularité de tout le catalogue d'une année sur l'autre.
 * - marche aléatoire + retour à la moyenne (les stars s'essoufflent, des talents émergent)
 * - bonus pour les artistes qui ont joué une édition réussie
 */
export function evolveArtists(
  artists: Artist[],
  bookedIds: string[],
  festivalGlobal: number,
  rng: () => number,
): Artist[] {
  const booked = new Set(bookedIds);

  return artists.map((a) => {
    let drift = rng() * 8 - 4; // ±4 marche aléatoire

    // retour à la moyenne : les très gros redescendent, les petits peuvent percer
    if (a.popularity > 85) drift -= rng() * 4;
    else if (a.popularity < 38) drift += rng() * 5 - 1;

    // un artiste programmé dans un festival réussi gagne en notoriété
    if (booked.has(a.id) && festivalGlobal >= 62) {
      drift += 2 + (festivalGlobal - 62) * 0.12 + rng() * 2;
    } else if (booked.has(a.id) && festivalGlobal < 45) {
      drift -= rng() * 2; // un bide n'aide pas
    }

    const popularity = clamp(Math.round(a.popularity + drift), 5, 99);

    // le cachet suit la notoriété (courbe convexe), en gardant le « caractère » de l'artiste
    const ratio = Math.pow(popularity / Math.max(1, a.popularity), 2.4);
    const cost = Math.max(2500, Math.round((a.cost * ratio) / 500) * 500);

    // léger glissement des autres stats vers/depuis la popularité
    const showQuality = clamp(Math.round(a.showQuality + (rng() * 4 - 2)), 20, 99);
    const satisfaction = clamp(Math.round(a.satisfaction + (rng() * 4 - 2)), 18, 99);

    return {
      ...a,
      popularity,
      cost,
      showQuality,
      satisfaction,
      tier: tierFromPop(popularity),
    };
  });
}
