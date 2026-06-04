import { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { LOCATION_MAP } from '../data/locations';
import {
  aggregateInfrastructure,
  aggregateLineup,
  aggregateMarketing,
  siteCost,
  sponsorIncome,
} from '../engine/economy';
import { projectEdition, type EditionProjection } from '../engine/simulation';
import type { Festival } from '../types';

export interface PlanSummary {
  festival: Festival;
  lineup: ReturnType<typeof aggregateLineup>;
  infra: ReturnType<typeof aggregateInfrastructure>;
  marketing: ReturnType<typeof aggregateMarketing>;
  sponsorIncome: number;
  /** Dépenses engagées (artistes + infra + marketing + site) */
  committed: number;
  /** Trésorerie restante pour engager d'autres dépenses */
  available: number;
  projection: EditionProjection;
  locationCost: number;
}

/** Calcule en direct l'état de la planification de l'édition en cours. */
export function usePlanSummary(): PlanSummary | null {
  const game = useGameStore((s) => s.game);

  return useMemo(() => {
    if (!game.festival) return null;
    const location = LOCATION_MAP[game.festival.location];
    const scheduledIds = game.plan.timetable.length > 0
      ? new Set(game.plan.timetable.map((s) => s.artistId))
      : undefined;
    const lineup = aggregateLineup(game.plan.bookedArtistIds, game.artists, game.festival.style, scheduledIds);
    const infra = aggregateInfrastructure(game.plan.infrastructures);
    const marketing = aggregateMarketing(game.plan.marketing, game.festival.style);
    const spIncome = sponsorIncome(game.plan.acceptedSponsorIds, game.sponsorOffers);
    const days = game.festival.days ?? 1;
    const capacity = game.festival.capacity ?? 10000;
    const site = siteCost(location, capacity, days);
    const committed =
      lineup.cost + infra.infraCost + infra.staffSecurityCost * days + marketing.cost + site;
    const available = game.budget + spIncome - committed;

    const projection = projectEdition({
      festival: game.festival,
      edition: game.edition,
      budget: game.budget,
      reputation: game.reputation,
      popularity: game.popularity,
      artists: game.artists,
      sponsors: game.sponsorOffers,
      plan: game.plan,
      weather: game.forecast,
    });

    return {
      festival: game.festival,
      lineup,
      infra,
      marketing,
      sponsorIncome: spIncome,
      committed,
      available,
      projection,
      locationCost: site,
    };
  }, [game]);
}
