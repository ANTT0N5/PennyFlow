import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/database/db';
import { useCategories } from '@/hooks/useFinance';
import { useSettingsStore } from '@/context/SettingsContext';
import { useTranslation } from '@/hooks/useTranslation';
import { formatCurrency } from '@/utils/format';
import { format, differenceInDays, addDays, addWeeks, addMonths, addYears } from '@/utils/date';
import { CalendarIcon, ClockIcon, RepeatIcon } from '@/components/ui/Icons';
import type { RecurringTransaction } from '@/types';

export function UpcomingPaymentsWidget() {
  const recurring = useLiveQuery(() => db.recurring.toArray(), []) ?? [];
  const categories = useCategories();
  const { settings } = useSettingsStore();
  const { t } = useTranslation();

  // Calcular próximos cobros
  const upcoming = useMemo(() => {
    const now = new Date();
    const in30Days = addDays(now, 30);

    return recurring
      .filter((r) => r.active)
      .map((r) => {
        // Buscar próxima fecha >= hoy
        let next = new Date(r.nextExecution);
        while (next < now) {
          if (r.pattern === 'daily') next = addDays(next, 1);
          else if (r.pattern === 'weekly') next = addWeeks(next, 1);
          else if (r.pattern === 'monthly') next = addMonths(next, 1);
          else if (r.pattern === 'yearly') next = addYears(next, 1);
          else next = addDays(next, r.customDays || 30);
        }

        return {
          recurring: r,
          nextDate: next,
          daysLeft: differenceInDays(next, now)
        };
      })
      .filter((x) => x.daysLeft <= 30)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [recurring]);

  if (upcoming.length === 0) return null;

  const total = upcoming
    .filter((u) => u.recurring.type === 'expense')
    .reduce((s, u) => s + u.recurring.amount, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold flex items-center gap-2">
          <CalendarIcon size={16} /> {t('upcoming.title')}
        </h2>
        {total > 0 && (
          <span className="text-xs font-semibold text-danger-600">
            −{formatCurrency(total, settings, { hideSign: true, privacy: settings.privacyMode })}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {upcoming.slice(0, 5).map(({ recurring, nextDate, daysLeft }) => {
          const cat = categories.find((c) => c.id === recurring.categoryId);
          const isToday = daysLeft === 0;
          const isTomorrow = daysLeft === 1;
          const isSoon = daysLeft <= 3;

          return (
            <div
              key={recurring.id}
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0"
                style={{ background: (cat?.color || '#6366f1') + '20' }}
              >
                {cat?.icon || '📦'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{recurring.concept}</div>
                <div className="text-xs text-muted flex items-center gap-1">
                  <RepeatIcon size={10} />
                  {recurring.pattern === 'monthly' ? 'Mensual' : recurring.pattern === 'weekly' ? 'Semanal' : recurring.pattern === 'yearly' ? 'Anual' : recurring.pattern === 'daily' ? 'Diario' : `Cada ${recurring.customDays}d`}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className={`text-sm font-semibold ${recurring.type === 'expense' ? 'text-negative' : 'text-positive'}`}>
                  {recurring.type === 'expense' ? '−' : '+'}{formatCurrency(recurring.amount, settings, { hideSign: true, privacy: settings.privacyMode })}
                </div>
                <div className={`text-[10px] flex items-center gap-0.5 justify-end ${
                  isToday ? 'text-danger-600 font-medium' : isSoon ? 'text-warning-600' : 'text-muted'
                }`}>
                  <ClockIcon size={9} />
                  {isToday ? t('upcoming.today') : isTomorrow ? t('upcoming.tomorrow') : daysLeft === 0 ? t('upcoming.today') : `${t('upcoming.inDays')} ${daysLeft}${t('recurring.days')}`}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {upcoming.length > 5 && (
        <div className="text-xs text-muted text-center mt-2">
          +{upcoming.length - 5} {t('upcoming.moreIn30')}
        </div>
      )}
    </motion.div>
  );
}
