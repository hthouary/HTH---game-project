import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { SLOT_LABELS, SLOTS_PER_DAY } from '../types';
import { INFRASTRUCTURES } from '../data/infrastructures';
import { genreAffinity } from '../data/styles';
import { Badge, SectionHeader, cx } from './ui';
import { formatNumber } from '../utils/format';
import type { Artist, TimetableSlot } from '../types';

const STAGE_IDS = ['stage_small', 'stage_medium', 'stage_big', 'stage_main'];
const STAGE_LABELS: Record<string, string> = {
  stage_small: 'Petite',
  stage_medium: 'Moyenne',
  stage_big: 'Grande',
  stage_main: 'Mainstage',
};
const STAGE_EMOJIS: Record<string, string> = {
  stage_small: '🎪',
  stage_medium: '🎭',
  stage_big: '🏟️',
  stage_main: '🎆',
};

export default function TimetablePanel() {
  const game = useGameStore((s) => s.game);
  const setTimetableSlot = useGameStore((s) => s.setTimetableSlot);
  const clearTimetableSlot = useGameStore((s) => s.clearTimetableSlot);
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState(0);

  if (!game.festival) return null;

  const days = game.festival.days ?? 1;
  const festivalStyle = game.festival.style;
  const bookedArtists = game.plan.bookedArtistIds
    .map((id) => game.artists.find((a) => a.id === id))
    .filter((a): a is Artist => !!a)
    .sort((a, b) => b.popularity - a.popularity);

  // Scènes achetées
  const availableStages = STAGE_IDS.filter(
    (id) => (game.plan.infrastructures[id] ?? 0) > 0,
  );

  const stageCapacity = (stageId: string) => {
    const opt = INFRASTRUCTURES.find((i) => i.id === stageId);
    return opt ? opt.capacity : 0;
  };

  // Cherche un slot dans le timetable
  const getSlot = (stageId: string, slotIndex: number): TimetableSlot | undefined =>
    game.plan.timetable.find(
      (s) => s.stageId === stageId && s.day === activeDay && s.slotIndex === slotIndex,
    );

  // Artistes déjà programmés aujourd'hui
  const scheduledTodayIds = new Set(
    game.plan.timetable.filter((s) => s.day === activeDay).map((s) => s.artistId),
  );

  // Artistes déjà programmés du tout
  const scheduledIds = new Set(game.plan.timetable.map((s) => s.artistId));

  // Calcule l'affluence attendue dans un créneau (pour l'affichage)
  const SLOT_CROWD = [0.25, 0.45, 0.65, 1.0, 0.85];
  const baseAttendance = 5000; // approximation visuelle
  const crowdAtSlot = (slotIndex: number) =>
    Math.round(baseAttendance * SLOT_CROWD[slotIndex]);

  // Remplissage estimé de la scène
  const fillEstimate = (
    artist: Artist,
    stageId: string,
    slotIndex: number,
  ): { ratio: number; color: string; label: string } => {
    const otherArtistsInSlot = game.plan.timetable
      .filter(
        (s) =>
          s.day === activeDay &&
          s.slotIndex === slotIndex &&
          s.artistId !== artist.id,
      )
      .map((s) => game.artists.find((a) => a.id === s.artistId))
      .filter((a): a is Artist => !!a);

    const thisAff = genreAffinity(festivalStyle, artist.genre);
    const totalDraw =
      artist.popularity * thisAff +
      otherArtistsInSlot.reduce(
        (sum, a) => sum + a.popularity * genreAffinity(festivalStyle, a.genre),
        0,
      );

    const crowd = crowdAtSlot(slotIndex);
    const artistShare = totalDraw > 0 ? (artist.popularity * thisAff) / totalDraw : 1;
    const at = Math.round(crowd * artistShare);
    const cap = stageCapacity(stageId);
    const ratio = cap > 0 ? at / cap : 0;

    if (ratio > 1.25) return { ratio, color: 'bg-red-500/20 border-red-500/50 text-red-300', label: '🔥 Surcharge !' };
    if (ratio > 1.0) return { ratio, color: 'bg-orange-500/20 border-orange-500/50 text-orange-300', label: '⚠ Débordement' };
    if (ratio >= 0.6) return { ratio, color: 'bg-green-500/20 border-green-500/50 text-green-300', label: '✓ Parfait' };
    if (ratio >= 0.3) return { ratio, color: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300', label: '~ Moyen' };
    return { ratio, color: 'bg-slate-700/40 border-slate-600/40 text-slate-400', label: '∅ Clairsemé' };
  };

  const handleCellClick = (stageId: string, slotIndex: number) => {
    const existing = getSlot(stageId, slotIndex);
    if (existing) {
      // Clic sur cellule occupée → désélectionner si c'est le même artiste, sinon remplacer
      if (selectedArtistId) {
        const artist = game.artists.find((a) => a.id === selectedArtistId);
        if (artist && existing.artistId !== selectedArtistId) {
          setTimetableSlot({ artistId: selectedArtistId, stageId, day: activeDay, slotIndex });
          setSelectedArtistId(null);
        } else {
          clearTimetableSlot(stageId, activeDay, slotIndex);
        }
      } else {
        clearTimetableSlot(stageId, activeDay, slotIndex);
      }
      return;
    }
    if (!selectedArtistId) return;
    setTimetableSlot({ artistId: selectedArtistId, stageId, day: activeDay, slotIndex });
    setSelectedArtistId(null);
  };

  const totalScheduled = scheduledIds.size;
  const totalBooked = bookedArtists.length;

  return (
    <div className="space-y-4 animate-fade-in">
      <SectionHeader
        emoji="🗓️"
        title="Programme horaire"
        subtitle="Assignez vos artistes aux scènes et aux créneaux. Le bon artiste sur la bonne scène au bon moment maximise votre satisfaction. Cliquez un artiste puis une cellule pour l'assigner."
      />

      {/* Résumé */}
      <div className="panel p-3 grid grid-cols-3 gap-3 text-sm">
        <div>
          <div className="text-xs text-slate-400">Artistes programmés</div>
          <div className={cx('font-extrabold text-lg', totalScheduled < totalBooked && 'text-festi-gold')}>
            {totalScheduled} / {totalBooked}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Scènes disponibles</div>
          <div className={cx('font-extrabold text-lg', availableStages.length === 0 && 'text-festi-danger')}>
            {availableStages.length === 0 ? '⚠ Aucune' : availableStages.length}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Créneaux totaux</div>
          <div className="font-extrabold text-lg">{availableStages.length * SLOTS_PER_DAY * days}</div>
        </div>
      </div>

      {availableStages.length === 0 && (
        <div className="panel p-4 text-center text-festi-danger">
          ⚠ Achetez au moins une scène dans la section Infrastructures pour créer votre programme.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-4">

        {/* Sidebar : artistes à programmer */}
        <div className="panel p-3 space-y-2">
          <div className="font-semibold text-sm mb-2 flex items-center justify-between">
            <span>🎤 Artistes réservés</span>
            {selectedArtistId && (
              <button
                className="text-xs text-slate-400 hover:text-white"
                onClick={() => setSelectedArtistId(null)}
              >
                × Désélectionner
              </button>
            )}
          </div>

          {bookedArtists.length === 0 && (
            <p className="text-xs text-slate-500 italic">Aucun artiste réservé. Allez en Programmation.</p>
          )}

          <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
            {bookedArtists.map((artist) => {
              const aff = genreAffinity(festivalStyle, artist.genre);
              const isSelected = selectedArtistId === artist.id;
              const isScheduled = scheduledIds.has(artist.id);
              const isScheduledToday = scheduledTodayIds.has(artist.id);
              return (
                <button
                  key={artist.id}
                  onClick={() => setSelectedArtistId(isSelected ? null : artist.id)}
                  className={cx(
                    'w-full text-left panel-2 p-2 transition-all',
                    isSelected && 'ring-2 ring-festi-accent bg-festi-accent/10',
                    isScheduledToday && !isSelected && 'opacity-50',
                  )}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-sm truncate">{artist.name}</span>
                    {isScheduled && <span className="text-[10px] text-festi-mint shrink-0">✓ programmé</span>}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400">
                    <span>{artist.genre}</span>
                    <span>·</span>
                    <span>Pop {artist.popularity}</span>
                    {aff < 0.7 && <Badge color="muted">affin. {Math.round(aff * 100)}%</Badge>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Grille du timetable */}
        <div className="panel p-3">
          {/* Onglets jours */}
          {days > 1 && (
            <div className="flex gap-2 mb-3 flex-wrap">
              {Array.from({ length: days }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveDay(i)}
                  className={cx(
                    'px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors',
                    activeDay === i
                      ? 'bg-festi-accent text-white'
                      : 'panel-2 hover:border-festi-accent/40',
                  )}
                >
                  Jour {i + 1}
                </button>
              ))}
            </div>
          )}

          {availableStages.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="p-2 text-left text-slate-400 w-28">Créneau</th>
                    {availableStages.map((stageId) => (
                      <th key={stageId} className="p-2 text-center">
                        <div className="font-bold">
                          {STAGE_EMOJIS[stageId]} {STAGE_LABELS[stageId]}
                        </div>
                        <div className="text-slate-500 font-normal">
                          {formatNumber(stageCapacity(stageId))} places
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SLOT_LABELS.map((slotLabel, slotIdx) => (
                    <tr key={slotIdx} className="border-t border-festi-border/50">
                      <td className="p-2 text-slate-400 whitespace-nowrap">
                        <div>{slotLabel}</div>
                        <div className="text-[10px] text-slate-600">
                          {Math.round(SLOT_CROWD[slotIdx] * 100)}% foule
                        </div>
                      </td>
                      {availableStages.map((stageId) => {
                        const slot = getSlot(stageId, slotIdx);
                        const artist = slot
                          ? game.artists.find((a) => a.id === slot.artistId)
                          : undefined;

                        const fill = artist ? fillEstimate(artist, stageId, slotIdx) : null;
                        const isEmpty = !artist;

                        return (
                          <td key={stageId} className="p-1.5">
                            <button
                              onClick={() => handleCellClick(stageId, slotIdx)}
                              className={cx(
                                'w-full min-h-[52px] rounded-lg border text-left px-2 py-1.5 transition-all',
                                isEmpty && selectedArtistId
                                  ? 'border-festi-accent/40 bg-festi-accent/5 hover:bg-festi-accent/10'
                                  : isEmpty
                                  ? 'border-festi-border/30 bg-festi-panel2/30 hover:border-festi-border'
                                  : (fill?.color ?? ''),
                              )}
                            >
                              {artist ? (
                                <>
                                  <div className="font-semibold leading-tight truncate">
                                    {artist.name}
                                  </div>
                                  <div className="text-[10px] opacity-70 mt-0.5">
                                    Pop {artist.popularity} · {fill?.label}
                                  </div>
                                  <div className="text-[9px] opacity-50 mt-0.5">
                                    ~{Math.round((fill?.ratio ?? 0) * stageCapacity(stageId) / 1000)}k / {Math.round(stageCapacity(stageId) / 1000)}k
                                  </div>
                                </>
                              ) : (
                                <div className="text-slate-600 text-center text-lg">
                                  {selectedArtistId ? '+' : '·'}
                                </div>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Légende */}
          <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded border border-green-500/50 bg-green-500/20 inline-block" />
              Parfait (60–100%)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded border border-yellow-500/50 bg-yellow-500/20 inline-block" />
              Moyen (30–60%)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded border border-orange-500/50 bg-orange-500/20 inline-block" />
              Débordement (&gt;100%)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded border border-red-500/50 bg-red-500/20 inline-block" />
              Surcharge critique (&gt;125%)
            </span>
          </div>
        </div>
      </div>

      {/* Artistes non programmés */}
      {totalBooked > 0 && totalScheduled < totalBooked && (
        <div className="panel p-3 bg-festi-gold/5 border-festi-gold/20">
          <p className="text-sm text-festi-gold font-semibold">
            ⚠ {totalBooked - totalScheduled} artiste{totalBooked - totalScheduled > 1 ? 's' : ''} réservé
            {totalBooked - totalScheduled > 1 ? 's' : ''} non programmé
            {totalBooked - totalScheduled > 1 ? 's' : ''} — leur cachet sera quand même dépensé mais ils ne monteront pas sur scène.
          </p>
        </div>
      )}
    </div>
  );
}
