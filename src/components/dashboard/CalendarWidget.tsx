import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTransactions, useCategories } from '@/hooks/useFinance';
import { useSettingsStore } from '@/context/SettingsContext';
import { useTranslation } from '@/hooks/useTranslation';
import { formatCurrency } from '@/utils/format';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths
} from '@/utils/date';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from '@/components/ui/Icons';

const WEEKDAYS_ES = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const WEEKDAYS_ES_LONG = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const WEEKDAYS_EN = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function CalendarWidget() {
  const transactions = useTransactions();
  const categories = useCategories();
  const { settings } = useSettingsStore();
  const { t } = useTranslation();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: settings.firstDayOfWeek });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: settings.firstDayOfWeek });
    return eachDayOfInterval({ start, end });
  }, [currentMonth, settings.firstDayOfWeek]);

  const transactionsByDay = useMemo(() => {
    const map: Record<string, typeof transactions> = {};
    for (const t of transactions) {
      const key = new Date(t.date).toDateString();
      if (!map[key]) map[key] = [];
      map[key].push(t);
    }
    return map;
  }, [transactions]);

  const selectedTx = selectedDate
    ? transactionsByDay[selectedDate.toDateString()] || []
    : [];

  const weekdays = settings.language === 'es' ? WEEKDAYS_ES : WEEKDAYS_EN;
  // Reordenar según firstDayOfWeek
  const orderedWeekdays = settings.firstDayOfWeek === 0
    ? [weekdays[6], ...weekdays.slice(0, 6)]
    : weekdays;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold flex items-center gap-2">
          <CalendarIcon size={16} /> {t('calendar.title')}
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="btn-icon w-8 h-8"
            aria-label="Mes anterior"
          >
            <ChevronLeftIcon size={16} />
          </button>
          <span className="text-sm font-medium min-w-[110px] text-center">
            {format(currentMonth, 'MMMM yyyy', { locale: undefined })}
          </span>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="btn-icon w-8 h-8"
            aria-label="Mes siguiente"
          >
            <ChevronRightIcon size={16} />
          </button>
        </div>
      </div>

      {/* Cabecera días semana */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {orderedWeekdays.map((day, i) => (
          <div key={i} className="text-center text-[10px] font-medium text-muted py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Días */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dayTx = transactionsByDay[day.toDateString()] || [];
          const income = dayTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
          const expenses = dayTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
          const hasTx = dayTx.length > 0;
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());
          const isSelected = selectedDate && isSameDay(day, selectedDate);

          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDate(day)}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs relative transition-all ${
                isSelected
                  ? 'bg-primary-600 text-white'
                  : isToday
                    ? 'bg-primary-100 dark:bg-primary-600/20 text-primary-700 dark:text-primary-300 font-bold'
                    : hasTx
                      ? 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
              } ${!isCurrentMonth ? 'opacity-40' : ''}`}
            >
              <span>{format(day, 'd', { locale: undefined })}</span>
              {hasTx && !isSelected && (
                <div className="flex gap-0.5 mt-0.5">
                  {income > 0 && <span className="w-1 h-1 rounded-full bg-success-500" />}
                  {expenses > 0 && <span className="w-1 h-1 rounded-full bg-danger-500" />}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Detalle del día seleccionado */}
      {selectedDate && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800"
        >
          <div className="text-xs text-muted mb-2">
            {format(selectedDate, 'EEEE, d MMMM', { locale: undefined })}
          </div>
          {selectedTx.length === 0 ? (
            <p className="text-sm text-muted text-center py-3">{t('calendar.noMovements')}</p>
          ) : (
            <div className="space-y-1">
              {selectedTx.map((tx) => {
                const cat = categories.find((c) => c.id === tx.categoryId);
                return (
                  <div key={tx.id} className="flex items-center gap-2 py-1.5">
                    <span className="text-base shrink-0">{cat?.icon || '📦'}</span>
                    <span className="text-sm flex-1 truncate">{tx.concept}</span>
                    <span className={`text-xs font-semibold ${tx.type === 'expense' ? 'text-negative' : 'text-positive'}`}>
                      {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount, settings, { hideSign: true, privacy: settings.privacyMode })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
