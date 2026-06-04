import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  EditionPlan,
  GamePhase,
  GameState,
  LocationId,
  MarketingChannelId,
  MusicStyle,
  Sponsor,
} from '../types';
import { buildInitialArtists } from '../data/artists';
import { SPONSORS } from '../data/sponsors';
import { LOCATION_MAP } from '../data/locations';
import { generateForecast } from '../engine/forecast';
import { runSimulation, type SimulationInput } from '../engine/simulation';
import { evolveArtists } from '../engine/popularity';
import { type ResolvedChoice } from '../engine/events';
import { clamp } from '../utils/format';
import { makeRng } from '../utils/rng';

const STORAGE_KEY = 'festitoche-save-v1';
const SAVE_VERSION = 1;
const STARTING_BUDGET = 250000;

function emptyPlan(): EditionPlan {
  return {
    bookedArtistIds: [],
    infrastructures: {},
    marketing: { units: {} },
    acceptedSponsorIds: [],
    ticketPrice: 39,
  };
}

function emptyGame(): GameState {
  return {
    festival: null,
    edition: 1,
    budget: 0,
    reputation: 0,
    popularity: 0,
    lastSatisfaction: 0,
    lastTicketsSold: 0,
    artists: [],
    sponsorOffers: [],
    forecast: 'Nuageux',
    plan: emptyPlan(),
    history: [],
    phase: 'dashboard',
    createdAt: 0,
    updatedAt: 0,
    version: SAVE_VERSION,
  };
}

/** Sélectionne les offres de sponsors disponibles pour l'édition (déterministe). */
function generateSponsorOffers(reputation: number, edition: number, name: string): Sponsor[] {
  const eligible = SPONSORS.filter((s) => reputation >= s.minReputation);
  if (eligible.length <= 6) return [...eligible].sort((a, b) => b.amount - a.amount);

  const rng = makeRng(`${name}:${edition}:sponsors`);
  const pool = [...eligible];
  // mélange de Fisher-Yates
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 6).sort((a, b) => b.amount - a.amount);
}

interface GameStore {
  game: GameState;
  // cycle de vie
  hasSave: () => boolean;
  newGame: (name: string, style: MusicStyle, location: LocationId) => void;
  abandonGame: () => void;
  setPhase: (phase: GamePhase) => void;
  // planification
  toggleArtist: (id: string) => void;
  setInfra: (id: string, qty: number) => void;
  incInfra: (id: string, delta: number) => void;
  setMarketing: (channel: MarketingChannelId, units: number) => void;
  toggleSponsor: (id: string) => void;
  setTicketPrice: (price: number) => void;
  resetPlan: () => void;
  // simulation
  runEdition: (choices: ResolvedChoice[]) => void;
  continueToNextEdition: () => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      game: emptyGame(),

      hasSave: () => get().game.festival !== null,

      newGame: (name, style, location) => {
        const loc = LOCATION_MAP[location];
        const reputation = clamp(48 + loc.reputationBias, 0, 1000);
        const rng = makeRng(`${name}:1:forecast`);
        const now = Date.now();
        set({
          game: {
            festival: { name: name.trim() || 'Mon Festival', style, location },
            edition: 1,
            budget: STARTING_BUDGET,
            reputation,
            popularity: 8,
            lastSatisfaction: 0,
            lastTicketsSold: 0,
            artists: buildInitialArtists(),
            sponsorOffers: generateSponsorOffers(reputation, 1, name),
            forecast: generateForecast(location, rng),
            plan: emptyPlan(),
            history: [],
            phase: 'dashboard',
            createdAt: now,
            updatedAt: now,
            version: SAVE_VERSION,
          },
        });
      },

      abandonGame: () => set({ game: emptyGame() }),

      setPhase: (phase) => set((s) => ({ game: { ...s.game, phase } })),

      toggleArtist: (id) =>
        set((s) => {
          const booked = s.game.plan.bookedArtistIds;
          const next = booked.includes(id)
            ? booked.filter((a) => a !== id)
            : [...booked, id];
          return { game: { ...s.game, plan: { ...s.game.plan, bookedArtistIds: next } } };
        }),

      setInfra: (id, qty) =>
        set((s) => {
          const infra = { ...s.game.plan.infrastructures };
          if (qty <= 0) delete infra[id];
          else infra[id] = qty;
          return { game: { ...s.game, plan: { ...s.game.plan, infrastructures: infra } } };
        }),

      incInfra: (id, delta) => {
        const cur = get().game.plan.infrastructures[id] ?? 0;
        get().setInfra(id, Math.max(0, cur + delta));
      },

      setMarketing: (channel, units) =>
        set((s) => {
          const u = { ...s.game.plan.marketing.units };
          if (units <= 0) delete u[channel];
          else u[channel] = units;
          return { game: { ...s.game, plan: { ...s.game.plan, marketing: { units: u } } } };
        }),

      toggleSponsor: (id) =>
        set((s) => {
          const accepted = s.game.plan.acceptedSponsorIds;
          const next = accepted.includes(id)
            ? accepted.filter((a) => a !== id)
            : [...accepted, id];
          return { game: { ...s.game, plan: { ...s.game.plan, acceptedSponsorIds: next } } };
        }),

      setTicketPrice: (price) =>
        set((s) => ({
          game: { ...s.game, plan: { ...s.game.plan, ticketPrice: clamp(Math.round(price), 0, 500) } },
        })),

      resetPlan: () => set((s) => ({ game: { ...s.game, plan: emptyPlan() } })),

      runEdition: (choices: ResolvedChoice[]) => {
        const g = get().game;
        if (!g.festival) return;
        const input: SimulationInput = {
          festival: g.festival,
          edition: g.edition,
          budget: g.budget,
          reputation: g.reputation,
          popularity: g.popularity,
          artists: g.artists,
          sponsors: g.sponsorOffers,
          plan: g.plan,
          weather: g.forecast,
          eventChoices: choices,
        };
        const result = runSimulation(input);
        set({
          game: {
            ...g,
            budget: result.budgetAfter,
            reputation: result.reputationAfter,
            popularity: result.popularityAfter,
            lastSatisfaction: result.report.satisfaction.global,
            lastTicketsSold: result.report.ticketsSold,
            history: [...g.history, result.report],
            phase: 'report',
            updatedAt: Date.now(),
          },
        });
      },

      continueToNextEdition: () =>
        set((s) => {
          const g = s.game;
          if (!g.festival) return {};
          const lastReport = g.history[g.history.length - 1];
          const satisfaction = lastReport?.satisfaction.global ?? 50;
          const rng = makeRng(`${g.festival.name}:${g.edition}:evolve`);
          const nextEdition = g.edition + 1;

          // évolution du catalogue d'artistes
          const artists = evolveArtists(g.artists, g.plan.bookedArtistIds, satisfaction, rng);
          const artistIds = new Set(artists.map((a) => a.id));

          // nouvelles offres de sponsors & météo
          const sponsorOffers = generateSponsorOffers(g.reputation, nextEdition, g.festival.name);
          const offerIds = new Set(sponsorOffers.map((o) => o.id));
          const forecast = generateForecast(g.festival.location, makeRng(`${g.festival.name}:${nextEdition}:forecast`));

          // report de la planification précédente (QoL) en filtrant ce qui n'existe plus
          const carriedPlan: EditionPlan = {
            bookedArtistIds: g.plan.bookedArtistIds.filter((id) => artistIds.has(id)),
            infrastructures: { ...g.plan.infrastructures },
            marketing: { units: { ...g.plan.marketing.units } },
            acceptedSponsorIds: g.plan.acceptedSponsorIds.filter((id) => offerIds.has(id)),
            ticketPrice: g.plan.ticketPrice,
          };

          return {
            game: {
              ...g,
              edition: nextEdition,
              artists,
              sponsorOffers,
              forecast,
              plan: carriedPlan,
              phase: 'dashboard',
              updatedAt: Date.now(),
            },
          };
        }),
    }),
    {
      name: STORAGE_KEY,
      version: SAVE_VERSION,
      partialize: (state) => ({ game: state.game }),
    },
  ),
);
