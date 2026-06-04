import { useGameStore } from '../store/gameStore';
import { getLevelById } from '../data/reputation';
import { WEATHER_MAP } from '../data/weather';
import { Badge, Meter, StarRating, cx } from './ui';
import {
  deltaColor,
  formatMoney,
  formatNumber,
  ratingColor,
  scoreToStars,
  signed,
} from '../utils/format';
import type { EditionReport } from '../types';

function Line({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: string }) {
  return (
    <div className={cx('flex items-center justify-between py-1', strong && 'font-bold text-base border-t border-festi-border mt-1 pt-2')}>
      <span className={cx('text-sm', !strong && 'text-slate-300')}>{label}</span>
      <span className={cx('tabular-nums', tone)}>{value}</span>
    </div>
  );
}

export default function ReportScreen() {
  const game = useGameStore((s) => s.game);
  const cont = useGameStore((s) => s.continueToNextEdition);
  const report: EditionReport | undefined = game.history[game.history.length - 1];
  if (!report) return null;

  const weather = WEATHER_MAP[report.weather];
  const levelBefore = getLevelById(report.levelBefore);
  const levelAfter = getLevelById(report.levelAfter);
  const leveledUp = report.levelBefore !== report.levelAfter && report.reputationDelta > 0;
  const sat = report.satisfaction;

  return (
    <div className="min-h-screen px-3 sm:px-4 py-6">
      <div className="max-w-5xl mx-auto space-y-5 animate-fade-in">
        {/* En-tête */}
        <header className="text-center">
          <div className="text-4xl mb-1">{report.profit >= 0 ? '🎉' : '😓'}</div>
          <h1 className="text-3xl sm:text-4xl font-black">
            Édition {report.edition} — Rapport
          </h1>
          <p className="text-slate-400 mt-1">
            {report.festivalName} · {weather.emoji} {weather.label} · {report.festivalDays ?? 1}j ·{' '}
            {formatNumber(report.attendance)} festivaliers
          </p>
        </header>

        {leveledUp && (
          <div className="panel p-4 text-center bg-gradient-to-r from-festi-accent/20 to-festi-gold/20 border-festi-gold/50 animate-pop">
            <div className="text-2xl font-black">🏆 NIVEAU SUPÉRIEUR !</div>
            <p className="text-slate-200">
              Votre festival passe de {levelBefore.emoji} <b>{levelBefore.label}</b> à {levelAfter.emoji}{' '}
              <b>{levelAfter.label}</b>.
            </p>
            <p className="text-sm text-festi-gold mt-1">{levelAfter.perk}</p>
          </div>
        )}

        {/* Bandeau résultats clés */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="panel-2 p-4 text-center">
            <div className="text-xs text-slate-400">Bénéfice net</div>
            <div className={cx('text-2xl font-black tabular-nums', deltaColor(report.profit))}>
              {formatMoney(report.profit)}
            </div>
          </div>
          <div className="panel-2 p-4 text-center">
            <div className="text-xs text-slate-400">Satisfaction</div>
            <div className={cx('text-2xl font-black tabular-nums', ratingColor(sat.global))}>{sat.global}/100</div>
            <StarRating rating={scoreToStars(sat.global)} className="text-sm" />
          </div>
          <div className="panel-2 p-4 text-center">
            <div className="text-xs text-slate-400">Réputation</div>
            <div className={cx('text-2xl font-black tabular-nums', deltaColor(report.reputationDelta))}>
              {signed(report.reputationDelta)}
            </div>
            <div className="text-[11px] text-slate-500">{report.reputationBefore} → {report.reputationAfter}</div>
          </div>
          <div className="panel-2 p-4 text-center">
            <div className="text-xs text-slate-400">Remplissage</div>
            <div className="text-2xl font-black tabular-nums">
              {Math.round((report.attendance / Math.max(1, report.capacity)) * 100)}%
            </div>
            <div className="text-[11px] text-slate-500">
              {formatNumber(report.attendance)} / {formatNumber(report.capacity)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Finances */}
          <div className="panel p-4 sm:p-5">
            <h3 className="font-bold mb-2 flex items-center gap-2">💰 Finances</h3>
            <div className="text-festi-mint font-semibold text-sm mb-1">Recettes</div>
            <Line label="🎟️ Billetterie" value={formatMoney(report.revenue.tickets)} />
            <Line label="🤝 Sponsors" value={formatMoney(report.revenue.sponsors)} />
            <Line label="🍺 Bars, food &amp; extras" value={formatMoney(report.revenue.barsFood)} />
            <Line label="👑 Zone VIP" value={formatMoney(report.revenue.vip)} />
            <Line label="Total recettes" value={formatMoney(report.revenue.total)} strong tone="text-festi-mint" />

            <div className="text-festi-danger font-semibold text-sm mt-4 mb-1">Dépenses</div>
            <Line label="🎤 Cachets artistes" value={formatMoney(report.expenses.artists)} />
            <Line label="🏗️ Infrastructures" value={formatMoney(report.expenses.infrastructure)} />
            <Line label="🛡️ Personnel &amp; sécurité" value={formatMoney(report.expenses.staffSecurity)} />
            <Line label="📣 Marketing" value={formatMoney(report.expenses.marketing)} />
            <Line label="📍 Location du site" value={formatMoney(report.expenses.location)} />
            <Line
              label="🎲 Imprévus"
              value={report.expenses.events >= 0 ? formatMoney(report.expenses.events) : `+${formatMoney(-report.expenses.events)}`}
            />
            <Line label="Total dépenses" value={formatMoney(report.expenses.total)} strong tone="text-festi-danger" />

            <div className="mt-3 pt-2 border-t-2 border-festi-border flex items-center justify-between">
              <span className="font-bold">Bénéfice / perte</span>
              <span className={cx('text-xl font-black tabular-nums', deltaColor(report.profit))}>
                {formatMoney(report.profit)}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-1 text-right">
              Trésorerie : {formatMoney(report.budgetBefore)} → <b className="text-slate-200">{formatMoney(report.budgetAfter)}</b>
            </div>
          </div>

          {/* Satisfaction & réputation */}
          <div className="space-y-5">
            <div className="panel p-4 sm:p-5">
              <h3 className="font-bold mb-3 flex items-center gap-2">😀 Satisfaction</h3>
              <div className="space-y-3">
                <Meter label="🎤 Programmation" value={sat.programming} />
                <Meter label="🏗️ Infrastructures" value={sat.infrastructure} />
                <Meter label="🛡️ Organisation" value={sat.organization} />
                <div className="pt-2 border-t border-festi-border">
                  <Meter label="Note globale" value={sat.global} />
                </div>
              </div>
            </div>

            <div className="panel p-4 sm:p-5">
              <h3 className="font-bold mb-3 flex items-center gap-2">⭐ Réputation</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{levelAfter.emoji}</span>
                  <div>
                    <div className="font-bold">{levelAfter.label}</div>
                    <div className="text-xs text-slate-400">{report.reputationAfter} points</div>
                  </div>
                </div>
                <Badge color={report.reputationDelta >= 0 ? 'mint' : 'danger'}>
                  {signed(report.reputationDelta)} pts
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Événements */}
        {report.events.length > 0 && (
          <div className="panel p-4 sm:p-5">
            <h3 className="font-bold mb-3 flex items-center gap-2">🎲 Faits marquants</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {report.events.map((e, i) => (
                <div key={i} className="panel-2 p-3">
                  <div className="font-semibold flex items-center gap-2">
                    <span>{e.emoji}</span> {e.label}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">→ {e.chosenOption}</div>
                  <div className="text-xs text-festi-accent mt-0.5">{e.outcome}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timetable issues */}
        {report.timetableIssues && report.timetableIssues.length > 0 && (
          <div className="panel p-4 sm:p-5">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              🗓️ Problèmes de planning
              {report.timetableScore != null && (
                <Badge color={report.timetableScore >= 70 ? 'mint' : report.timetableScore >= 45 ? 'gold' : 'danger'}>
                  Score {report.timetableScore}/100
                </Badge>
              )}
            </h3>
            <div className="space-y-1.5">
              {report.timetableIssues.map((issue, i) => (
                <div key={i} className="text-sm text-festi-gold/90 flex items-start gap-2">
                  <span className="shrink-0 mt-0.5">⚠</span>
                  <span>{issue}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Avis */}
        <div className="panel p-4 sm:p-5">
          <h3 className="font-bold mb-3 flex items-center gap-2">💬 Ce que disent les festivaliers</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {report.reviews.map((r, i) => (
              <div key={i} className="panel-2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-300 truncate">{r.author}</span>
                  <StarRating rating={r.rating} className="text-sm shrink-0" />
                </div>
                <p className="text-sm text-slate-200 mt-1.5 italic">« {r.text} »</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="sticky bottom-3 z-10">
          <button className="btn-primary w-full text-lg py-4" onClick={cont}>
            ➡️ Préparer l'édition {report.edition + 1}
          </button>
        </div>
      </div>
    </div>
  );
}
