import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTransactions, useCategories } from '@/hooks/useFinance';
import { useSettingsStore } from '@/context/SettingsContext';
import { formatCurrency, formatCompactCurrency, formatPercentage } from '@/utils/format';
import {
  getPeriodRange,
  getPreviousPeriodRange,
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  formatShortMonth
} from '@/utils/date';
import { generateInsights, projectMonthEnd } from '@/services/ai';
import { useTranslation } from '@/hooks/useTranslation';
import { EmptyState, Loading } from '@/components/ui/Feedback';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { SparklesIcon, TrendingUpIcon, TrendingDownIcon } from '@/components/ui/Icons';

type PeriodType = 'week' | 'month' | 'year';

export default function Statistics() {
  const { settings } = useSettingsStore();
  const { t } = useTranslation();
  const transactions = useTransactions();
  const categories = useCategories();
  const [period, setPeriod] = useState<PeriodType>('month');

  const data = useMemo(() => {
    if (!transactions.length) return null;
    const range = getPeriodRange(period, new Date(), settings.firstDayOfWeek);
    const prevRange = getPreviousPeriodRange(period, new Date(), settings.firstDayOfWeek);

    const periodTx = transactions.filter((t) => t.date >= range.start && t.date <= range.end);
    const prevTx = transactions.filter((t) => t.date >= prevRange.start && t.date <= prevRange.end);

    const income = periodTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = periodTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const prevIncome = prevTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const prevExpenses = prevTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    // Media diaria
    const days = period === 'week' ? 7 : period === 'month' ? new Date().getDate() : 365;
    const dailyAvgExpense = expenses / days;
    const dailyAvgIncome = income / days;

    // Media semanal
    const weeks = period === 'week' ? 1 : period === 'month' ? 4 : 52;
    const weeklyAvgExpense = expenses / weeks;
    const weeklyAvgIncome = income / weeks;

    // Media mensual
    const months = period === 'week' ? 0.25 : period === 'month' ? 1 : 12;
    const monthlyAvgExpense = expenses / months;
    const monthlyAvgIncome = income / months;

    // Series temporales
    let dailyData: { label: string; income: number; expenses: number }[] = [];
    if (period === 'week') {
      const days = eachDayOfInterval({ start: new Date(range.start), end: new Date(range.end) });
      dailyData = days.map((d) => {
        const dayTx = periodTx.filter((t) => {
          const td = new Date(t.date);
          return td.getFullYear() === d.getFullYear() && td.getMonth() === d.getMonth() && td.getDate() === d.getDate();
        });
        return {
          label: format(d, 'EEE', { locale: undefined }),
          income: dayTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
          expenses: dayTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
        };
      });
    } else if (period === 'month') {
      const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
      dailyData = Array.from({ length: Math.min(daysInMonth, new Date().getDate()) }, (_, i) => {
        const day = i + 1;
        const dayTx = periodTx.filter((t) => new Date(t.date).getDate() === day);
        return {
          label: String(day),
          income: dayTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
          expenses: dayTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
        };
      });
    } else {
      // year - por mes
      const monthsData = [];
      for (let m = 0; m < 12; m++) {
        const monthStart = new Date(new Date().getFullYear(), m, 1).getTime();
        const monthEnd = new Date(new Date().getFullYear(), m + 1, 0, 23, 59, 59).getTime();
        const monthTx = transactions.filter((t) => t.date >= monthStart && t.date <= monthEnd);
        monthsData.push({
          label: format(new Date(new Date().getFullYear(), m, 1), 'MMM', { locale: undefined }),
          income: monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
          expenses: monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
        });
      }
      dailyData = monthsData;
    }

    // Ranking de categorías
    const categoryTotals: Record<string, number> = {};
    for (const t of periodTx) {
      if (t.type !== 'expense') continue;
      categoryTotals[t.categoryId] = (categoryTotals[t.categoryId] || 0) + t.amount;
    }
    const ranking = Object.entries(categoryTotals)
      .map(([catId, amount]) => ({
        category: categories.find((c) => c.id === catId)!,
        amount,
        percentage: expenses > 0 ? (amount / expenses) * 100 : 0
      }))
      .filter((x) => x.category)
      .sort((a, b) => b.amount - a.amount);

    // Día de la semana con mayor gasto
    const daySpending: Record<number, number> = {};
    for (const t of periodTx) {
      if (t.type !== 'expense') continue;
      const d = getDay(new Date(t.date));
      daySpending[d] = (daySpending[d] || 0) + t.amount;
    }
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const dayData = dayNames.map((name, i) => ({ name, value: daySpending[i] || 0 }));

    const insights = generateInsights(transactions, settings.language);
    const projection = projectMonthEnd(transactions);

    return {
      income,
      expenses,
      balance: income - expenses,
      prevIncome,
      prevExpenses,
      dailyAvgExpense,
      dailyAvgIncome,
      weeklyAvgExpense,
      weeklyAvgIncome,
      monthlyAvgExpense,
      monthlyAvgIncome,
      dailyData,
      ranking,
      dayData,
      insights,
      projection
    };
  }, [transactions, categories, period, settings]);

  if (!data) return <EmptyState icon={<TrendingUpIcon size={28} />} title={t('statistics.noData')} description={t('statistics.noDataDesc')} />;

  const privacy = settings.privacyMode;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{t('statistics.title')}</h1>
        <p className="text-sm text-muted">{t('statistics.subtitle')}</p>
      </div>

      {/* Selector de periodo */}
      <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
        {([
          { v: 'week', l: t('statistics.week') },
          { v: 'month', l: t('statistics.month') },
          { v: 'year', l: t('statistics.year') }
        ] as const).map((opt) => (
          <button
            key={opt.v}
            onClick={() => setPeriod(opt.v)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === opt.v
                ? 'bg-white dark:bg-slate-700 shadow-soft text-slate-900 dark:text-white'
                : 'text-slate-500'
            }`}
          >
            {opt.l}
          </button>
        ))}
      </div>

      {/* Resumen del periodo */}
      <div className="grid grid-cols-3 gap-2">
        <div className="card">
          <div className="text-xs text-muted">{t('common.income')}</div>
          <div className="font-bold text-positive text-sm">
            {formatCompactCurrency(data.income, settings, privacy)}
          </div>
        </div>
        <div className="card">
          <div className="text-xs text-muted">{t('common.expenses')}</div>
          <div className="font-bold text-negative text-sm">
            {formatCompactCurrency(data.expenses, settings, privacy)}
          </div>
        </div>
        <div className="card">
          <div className="text-xs text-muted">{t('common.balance')}</div>
          <div className={`font-bold text-sm ${data.balance >= 0 ? 'text-positive' : 'text-negative'}`}>
            {formatCompactCurrency(data.balance, settings, privacy)}
          </div>
        </div>
      </div>

      {/* Medias */}
      <div className="card">
        <h2 className="font-semibold mb-3">{t('statistics.averages')}</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">{t('statistics.dailyExpense')}</span>
            <span className="font-medium">{formatCurrency(data.dailyAvgExpense, settings, { privacy })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">{t('statistics.weeklyExpense')}</span>
            <span className="font-medium">{formatCurrency(data.weeklyAvgExpense, settings, { privacy })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">{t('statistics.monthlyExpense')}</span>
            <span className="font-medium">{formatCurrency(data.monthlyAvgExpense, settings, { privacy })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">{t('statistics.dailyIncome')}</span>
            <span className="font-medium text-positive">{formatCurrency(data.dailyAvgIncome, settings, { privacy })}</span>
          </div>
        </div>
      </div>

      {/* Gráfico de barras */}
      <div className="card">
        <h2 className="font-semibold mb-3">{t('statistics.evolution')}</h2>
        <div className="h-56 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} className="dark:opacity-20" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={40} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgb(30 41 59)',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 12,
                  color: 'white'
                }}
                formatter={(value: number) => formatCurrency(value, settings, { privacy })}
              />
              <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Ingresos" />
              <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Gastos" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ranking de categorías */}
      {data.ranking.length > 0 && (
        <div className="card">
          <h2 className="font-semibold mb-3">{t('statistics.categoryRanking')}</h2>
          <div className="space-y-2">
            {data.ranking.map((r, idx) => (
              <div key={r.category.id} className="flex items-center gap-3">
                <div className="text-sm text-muted w-4">{idx + 1}</div>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                  style={{ background: (r.category.color || '#6366f1') + '20' }}
                >
                  {r.category.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate">{r.category.name}</span>
                    <span className="text-sm font-semibold ml-2">
                      {formatCurrency(r.amount, settings, { privacy })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${r.percentage}%`,
                          background: r.category.color || '#6366f1'
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted w-12 text-right">
                      {formatPercentage(r.percentage, 0)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Día de la semana */}
      <div className="card">
        <h2 className="font-semibold mb-3">{t('statistics.spendingByDay')}</h2>
        <div className="h-48 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.dayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} className="dark:opacity-20" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={40} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgb(30 41 59)',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 12,
                  color: 'white'
                }}
                formatter={(value: number) => formatCurrency(value, settings, { privacy })}
              />
              <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Proyección */}
      {period === 'month' && (
        <div className="card bg-gradient-to-br from-primary-50 to-primary-100/50 dark:from-primary-600/10 dark:to-primary-700/10">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <SparklesIcon size={16} /> {t('statistics.monthEndProjection')}
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">{t('statistics.projectedExpenses')}</span>
              <span className="font-semibold text-negative">
                {formatCurrency(data.projection.projectedExpenses, settings, { privacy })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">{t('statistics.projectedIncome')}</span>
              <span className="font-semibold text-positive">
                {formatCurrency(data.projection.projectedIncome, settings, { privacy })}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
              <span className="font-medium">{t('statistics.projectedBalance')}</span>
              <span className={`font-bold ${data.projection.projectedBalance >= 0 ? 'text-positive' : 'text-negative'}`}>
                {formatCurrency(data.projection.projectedBalance, settings, { privacy })}
              </span>
            </div>
            <p className="text-xs text-muted mt-2">
              {t('statistics.basedOn')} {data.projection.daysElapsed} {t('statistics.of')} {data.projection.daysTotal} {t('statistics.days')}
            </p>
          </div>
        </div>
      )}

      {/* Insights */}
      {data.insights.length > 0 && (
        <div>
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <SparklesIcon size={18} className="text-primary-600" /> {t('statistics.insights')}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.insights.map((insight) => (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`card border-l-4 ${
                  insight.type === 'positive' ? 'border-l-success-500 bg-success-50/50 dark:bg-success-500/5'
                    : insight.type === 'warning' ? 'border-l-danger-500 bg-danger-50/50 dark:bg-danger-500/5'
                    : insight.type === 'info' ? 'border-l-primary-500 bg-primary-50/50 dark:bg-primary-500/5'
                    : 'border-l-slate-400'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl shrink-0">{insight.icon}</div>
                  <div>
                    <div className="font-medium text-sm">{insight.title}</div>
                    <div className="text-xs text-muted mt-0.5">{insight.description}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          <p className="text-xs text-muted text-center mt-3">
            🔒 {t('statistics.insightsLocal')}
          </p>
        </div>
      )}
    </div>
  );
}
