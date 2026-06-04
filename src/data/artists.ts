import type { Artist, MusicStyle } from '../types';

// ----------------------------------------------------------------------------
// 120 artistes fictifs répartis sur les 6 genres principaux.
// On stocke un nom + une popularité de base, et un générateur déterministe
// dérive le reste des statistiques (stable d'une partie à l'autre).
// ----------------------------------------------------------------------------

type Seed = [name: string, basePop: number];

const ROSTER: Record<Exclude<MusicStyle, 'Multi-genres'>, Seed[]> = {
  Techno: [
    ['Klangwerk', 92], ['Nina Volt', 88], ['Subterra', 80], ['Modular Mind', 76],
    ['Béton Brut', 71], ['Acid Kollektiv', 66], ['Tunnelvision', 62], ['Helga Tek', 58],
    ['Monolith', 55], ['Drift Sequence', 50], ['Noir Machine', 47], ['Pulsar 9', 44],
    ['Kraftzone', 40], ['Echo Chamber', 36], ['Basalt', 32], ['Vox Analog', 28],
    ['Sirène 303', 24], ['Granit', 20], ['Oktave', 17], ['Maelström', 14],
  ],
  EDM: [
    ['Skybreakr', 95], ['DJ Solaris', 90], ['Neon Pulse', 83], ['Aurora Beats', 78],
    ['Hypernova', 72], ['Voltage', 67], ['Elektra Sky', 63], ['Mainstage Mafia', 59],
    ['Lumina', 54], ['Crescendo', 49], ['DJ Apex', 46], ['Starfall', 42],
    ['Festivo', 38], ['Sunburst', 34], ['Galactik', 30], ['Pyro', 26],
    ['Nova Ray', 22], ['Stratos', 18], ['Big Room Kids', 15], ['Comète', 12],
  ],
  Hardstyle: [
    ['Brutalizm', 89], ['Atmozfears X', 84], ['Defqode', 82], ['Raw Fury', 75],
    ['Rebelion X', 69], ['Distortion', 64], ['Adrenalize', 59], ['Pulse Riot', 56],
    ['Kick Brigade', 53], ['Euphoria', 48], ['Hardshock', 44], ['Kore', 41],
    ['Screamerz', 39], ['Titanium Kick', 35], ['Frenchcore Frank', 31], ['Warhead', 27],
    ['Bass Modulatorz', 23], ['Stormrave', 21], ['Hooliganz', 19], ['Defcon', 14],
  ],
  Rap: [
    ['Lil Vortex', 94], ['Young Saga', 89], ['Sékla', 82], ['Krew$', 77],
    ['Flow State', 71], ['Gold Tongue', 66], ['Trappeur', 61], ['Punchline Paul', 57],
    ['Dizz', 53], ['La Plume', 49], ['Verbal Killah', 45], ['Phénix', 41],
    ['16 Mesures', 37], ['Capuche', 33], ['Drill Sergent', 29], ['Maskar', 25],
    ['Rimes Brutes', 21], ['MC Bavard', 18], ['Sablo', 15], ['Le Môme', 12],
  ],
  Rock: [
    ['The Velvet Hammers', 87], ['Stone Avalanche', 81], ['Neon Wolves', 74], ['Black Tide', 68],
    ['Electric Mardi', 63], ['Howl', 58], ['Crimson Echo', 53], ['Iron Garden', 49],
    ['The Riffs', 45], ['Static Saints', 41], ['Wildfire', 37], ['Midnight Convoy', 33],
    ['Thunder Alley', 29], ['The Feedback', 26], ['Paper Tigers', 22], ['Saint Rivière', 19],
    ['The Overdrive', 16], ['Granite Souls', 13], ['Howling Pines', 11], ['The Basement', 9],
  ],
  Pop: [
    ['Lila Sun', 96], ['Aria', 91], ['Marco Vibe', 84], ['Céleste', 79],
    ['Golden Hour', 73], ['The Honeys', 68], ['Naïa', 63], ['Max Étoile', 58],
    ['Lova', 54], ['Vega', 50], ['Sweet Static', 46], ['Coco Reverie', 42],
    ['Pastel', 38], ['Disco Plage', 34], ['Sirius', 30], ['Jolie Môme', 26],
    ['Candie', 22], ['Loane', 19], ['Émile & les Cœurs', 16], ['Bubblegum', 12],
  ],
};

// ----- RNG déterministe (mulberry32 + hash de chaîne) ------------------------
function hashString(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function tierFromPop(pop: number): number {
  if (pop >= 85) return 5;
  if (pop >= 70) return 4;
  if (pop >= 52) return 3;
  if (pop >= 34) return 2;
  return 1;
}

// Surcoût technique selon la famille du genre
const TECH_BONUS: Record<Exclude<MusicStyle, 'Multi-genres'>, number> = {
  Techno: 18, EDM: 24, Hardstyle: 20, Rap: 6, Rock: 10, Pop: 12,
};
const COST_FACTOR: Record<Exclude<MusicStyle, 'Multi-genres'>, number> = {
  Techno: 0.95, EDM: 1.2, Hardstyle: 1.0, Rap: 1.25, Rock: 1.05, Pop: 1.15,
};

function buildArtist(genre: Exclude<MusicStyle, 'Multi-genres'>, seed: Seed, index: number): Artist {
  const [name, basePop] = seed;
  const id = `art_${genre.toLowerCase()}_${String(index + 1).padStart(2, '0')}`;
  const rng = mulberry32(hashString(id + name));

  const popularity = clamp(Math.round(basePop + (rng() * 6 - 3)), 5, 99);

  // Cachet : courbe convexe ~ (pop/100)^2.6 * plafond, + facteur genre + variance
  const baseCost = Math.pow(popularity / 100, 2.6) * 620000 * COST_FACTOR[genre];
  const cost = Math.max(2500, Math.round((baseCost * (0.88 + rng() * 0.28)) / 500) * 500);

  const showQuality = clamp(Math.round(40 + popularity * 0.45 + (rng() * 30 - 12)), 20, 99);
  const technicalRequirement = clamp(
    Math.round(25 + TECH_BONUS[genre] + popularity * 0.25 + (rng() * 26 - 13)),
    10,
    99,
  );
  // Les très grosses têtes d'affiche sont (un peu) plus capricieuses
  const reliability = clamp(Math.round(96 - popularity * 0.28 + (rng() * 22 - 11)), 45, 99);
  const satisfaction = clamp(
    Math.round(showQuality * 0.55 + popularity * 0.4 + (rng() * 10 - 5)),
    18,
    99,
  );

  return {
    id,
    name,
    genre,
    popularity,
    cost,
    showQuality,
    technicalRequirement,
    reliability,
    satisfaction,
    tier: tierFromPop(popularity),
  };
}

/** Construit le catalogue initial complet (déterministe). */
export function buildInitialArtists(): Artist[] {
  const out: Artist[] = [];
  (Object.keys(ROSTER) as Array<Exclude<MusicStyle, 'Multi-genres'>>).forEach((genre) => {
    ROSTER[genre].forEach((seed, i) => out.push(buildArtist(genre, seed, i)));
  });
  return out.sort((a, b) => b.popularity - a.popularity);
}

export const TOTAL_ARTISTS = Object.values(ROSTER).reduce((n, arr) => n + arr.length, 0);
