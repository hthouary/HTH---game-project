import { Modal, StarRating, Badge, cx } from './ui';
import { getLevelById } from '../data/reputation';
import { WEATHER_MAP } from '../data/weather';
import { deltaColor, formatMoney, formatNumber, scoreToStars } from '../utils/format';
import type { EditionReport } from '../types';

export default function HistoryModal({
  open,
  onClose,
  history,
}: {
  open: boolean;
  onClose: () => void;
  history: EditionReport[];
}) {
  const reversed = [...history].reverse();
  return (
    <Modal open={open} onClose={onClose} title="📚 Historique des éditions" wide>
      {history.length === 0 ? (
        <p className="text-slate-400 text-center py-8">
          Aucune édition jouée pour l'instant. Lancez votre première édition !
        </p>
      ) : (
        <div className="space-y-2">
          {reversed.map((r) => {
            const weather = WEATHER_MAP[r.weather];
            const level = getLevelById(r.levelAfter);
            return (
              <div key={r.edition} className="panel-2 p-3 flex items-center gap-3 flex-wrap">
                <div className="w-12 text-center shrink-0">
                  <div className="text-[10px] text-slate-500 uppercase">Éd.</div>
                  <div className="text-xl font-black">{r.edition}</div>
                </div>
                <div className="flex-1 min-w-[140px]">
                  <div className="flex items-center gap-2">
                    <span>{weather.emoji}</span>
                    <span className="font-semibold">{formatNumber(r.attendance)} festivaliers</span>
                    <Badge color="muted">{level.emoji} {level.label}</Badge>
                  </div>
                  <StarRating rating={scoreToStars(r.satisfaction.global)} className="text-sm" />
                </div>
                <div className="text-right shrink-0">
                  <div className={cx('font-bold tabular-nums', deltaColor(r.profit))}>{formatMoney(r.profit)}</div>
                  <div className="text-[11px] text-slate-400">
                    Réput. {r.reputationAfter}{' '}
                    <span className={deltaColor(r.reputationDelta)}>
                      ({r.reputationDelta >= 0 ? '+' : ''}{r.reputationDelta})
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
