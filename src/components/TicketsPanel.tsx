import { useGameStore } from '../store/gameStore';
import { usePlanSummary } from '../hooks/usePlanSummary';
import { Meter, SectionHeader, cx } from './ui';
import { formatMoney, formatMoneyShort, formatNumber, ratingColor } from '../utils/format';

export default function TicketsPanel() {
  const game = useGameStore((s) => s.game);
  const setTicketPrice = useGameStore((s) => s.setTicketPrice);
  const summary = usePlanSummary();
  if (!game.festival || !summary) return null;

  const price = game.plan.ticketPrice;
  const { projection } = summary;
  const reference = projection.reference;
  const ratio = price / Math.max(1, reference);

  const verdict =
    ratio > 1.35
      ? { text: '💸 Bien trop cher : vous découragez le public.', tone: 'text-festi-danger' }
      : ratio > 1.12
        ? { text: '⚠️ Un peu cher : attention au remplissage et aux avis.', tone: 'text-orange-400' }
        : ratio < 0.8
          ? { text: '📉 Très bon marché : salle pleine mais marge faible par billet.', tone: 'text-festi-gold' }
          : { text: '👍 Prix équilibré par rapport à votre offre.', tone: 'text-festi-mint' };

  return (
    <div className="space-y-4 animate-fade-in">
      <SectionHeader
        emoji="🎟️"
        title="Billetterie"
        subtitle="Fixez le prix du billet. Trop cher, vous perdez du public ; trop bas, vous laissez de l'argent sur la table."
      />

      <div className="panel p-5">
        <div className="flex items-end justify-between gap-4 flex-wrap mb-2">
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wide">Prix du billet</div>
            <div className="text-5xl font-black tabular-nums">
              {price}
              <span className="text-2xl text-slate-400"> €</span>
            </div>
          </div>
          <div className="text-right text-sm">
            <div className="text-slate-400">Prix « juste » estimé</div>
            <div className="text-xl font-bold text-festi-accent">{reference} €</div>
          </div>
        </div>

        <input
          type="range"
          min={0}
          max={Math.max(200, reference * 2)}
          step={1}
          value={price}
          onChange={(e) => setTicketPrice(Number(e.target.value))}
          className="w-full accent-festi-accent2 cursor-pointer"
        />
        <div className="flex justify-between text-[11px] text-slate-500">
          <span>Gratuit</span>
          <span>{Math.max(200, reference * 2)} €</span>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          <button className="btn-ghost py-1.5 px-3" onClick={() => setTicketPrice(price - 5)}>
            −5 €
          </button>
          <button className="btn-ghost py-1.5 px-3" onClick={() => setTicketPrice(price + 5)}>
            +5 €
          </button>
          <button className="btn-primary py-1.5 px-3" onClick={() => setTicketPrice(reference)}>
            🎯 Prix conseillé ({reference} €)
          </button>
        </div>

        <div className={cx('mt-3 font-semibold', verdict.tone)}>{verdict.text}</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="panel-2 p-4 text-center">
          <div className="text-xs text-slate-400">Affluence estimée</div>
          <div className="text-2xl font-extrabold tabular-nums">{formatNumber(projection.expectedAttendance)}</div>
          <div className="text-[11px] text-slate-500">{Math.round(projection.occupancy * 100)}% de la capacité</div>
        </div>
        <div className="panel-2 p-4 text-center">
          <div className="text-xs text-slate-400">Recette billetterie</div>
          <div className="text-2xl font-extrabold tabular-nums text-festi-mint">
            {formatMoneyShort(projection.expectedAttendance * price)}
          </div>
          <div className="text-[11px] text-slate-500">{formatMoney(price)} × billets</div>
        </div>
        <div className="panel-2 p-4 text-center">
          <div className="text-xs text-slate-400">Bénéfice projeté</div>
          <div className={cx('text-2xl font-extrabold tabular-nums', ratingColor(projection.expectedProfit > 0 ? 80 : 20))}>
            {formatMoneyShort(projection.expectedProfit)}
          </div>
          <div className="text-[11px] text-slate-500">toutes recettes &amp; dépenses</div>
        </div>
      </div>

      <div className="panel p-4">
        <Meter label="😀 Satisfaction globale estimée" value={projection.satisfaction} hint="Un prix excessif pénalise la satisfaction et les avis." />
      </div>
    </div>
  );
}
