import { useGameStore } from '../store/gameStore';
import { usePlanSummary } from '../hooks/usePlanSummary';
import { Badge, SectionHeader, cx } from './ui';
import { formatMoney, formatMoneyShort } from '../utils/format';

export default function SponsorsPanel() {
  const game = useGameStore((s) => s.game);
  const toggleSponsor = useGameStore((s) => s.toggleSponsor);
  const summary = usePlanSummary();
  if (!game.festival || !summary) return null;

  const style = game.festival.style;
  const accepted = new Set(game.plan.acceptedSponsorIds);

  return (
    <div className="space-y-4 animate-fade-in">
      <SectionHeader
        emoji="🤝"
        title="Sponsors & partenaires"
        subtitle="Les sponsors financent votre festival, mais une marque incompatible avec votre image dégrade la satisfaction du public."
      />

      <div className="panel p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
        <div>
          <div className="text-xs text-slate-400">Offres disponibles</div>
          <div className="font-extrabold text-lg">{game.sponsorOffers.length}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Sponsors signés</div>
          <div className="font-extrabold text-lg">{game.plan.acceptedSponsorIds.length}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Revenus sécurisés</div>
          <div className="font-extrabold text-lg text-festi-mint">{formatMoneyShort(summary.sponsorIncome)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {game.sponsorOffers.map((sp) => {
          const isAccepted = accepted.has(sp.id);
          const compatible = sp.affinityStyles.includes(style) || style === 'Multi-genres';
          return (
            <div
              key={sp.id}
              className={cx(
                'panel-2 p-4 flex flex-col gap-2',
                isAccepted && 'ring-2 ring-festi-gold border-festi-gold/60 bg-festi-gold/5',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold flex items-center gap-1.5">
                    <span className="text-xl">{sp.emoji}</span> {sp.name}
                  </div>
                  <Badge color="muted" className="mt-1">{sp.category}</Badge>
                </div>
                <div className="text-right">
                  <div className="font-extrabold tabular-nums text-festi-gold">{formatMoney(sp.amount)}</div>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-snug">📋 {sp.requirement}</p>

              <div>
                {compatible ? (
                  <Badge color="mint">✓ Compatible avec votre image</Badge>
                ) : (
                  <Badge color="danger">⚠ Risque d'image (−{Math.round(sp.imageRisk * 0.6)} satisfaction)</Badge>
                )}
              </div>

              <button
                className={cx('w-full mt-auto', isAccepted ? 'btn-danger' : 'btn-gold')}
                onClick={() => toggleSponsor(sp.id)}
              >
                {isAccepted ? '✓ Signé — retirer' : '✍️ Signer le partenariat'}
              </button>
            </div>
          );
        })}
      </div>

      {game.sponsorOffers.length === 0 && (
        <div className="panel p-8 text-center text-slate-400">
          Aucune offre pour le moment — développez votre réputation pour attirer des sponsors.
        </div>
      )}
    </div>
  );
}
