import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDashboardStats, useCategories } from '@/hooks/useFinance';
import { useSettingsStore } from '@/context/SettingsContext';
import { formatCurrency, formatCompactCurrency, formatPercentage } from '@/utils/format';
import { formatRelativeDate } from '@/utils/date';
import { EmptyState, Loading } from '@/components/ui/Feedback';
import {
  WalletIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  PiggyIcon
} from '@/components/ui/Icons';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { generateInsights } from '@/services/ai';
import { useTransactions } from '@/hooks/useFinance';
import { useTranslation } from '@/hooks/useTranslation';
import { easings } from '@/utils/animations';
import { BudgetsWidget } from '@/components/dashboard/BudgetsWidget';
import { RecurringWidget } from '@/components/dashboard/RecurringWidget';
import { CalendarWidget } from '@/components/dashboard/CalendarWidget';
import { UpcomingPaymentsWidget } from '@/components/dashboard/UpcomingPaymentsWidget';

export default function Dashboard() {
  const { settings } = useSettingsStore();
  const { t } = useTranslation();
  const stats = useDashboardStats();
  const allTransactions = useTransactions();
  const categories = useCategories();
  const insights = useMemo(
    () => generateInsights(allTransactions, settings.language),
    [allTransactions, settings.language]
  );

  if (!stats) return <Loading message={t('common.loadingFinances')} />;

  const privacy = settings.privacyMode;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold mb-0.5">{t('dashboard.hello')} 👋</h1>
        <p className="text-sm text-muted">{t('dashboard.subtitle')}</p>
      </div>

      {/* Tarjeta de saldo principal */}
      <div className="rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 p-5 text-white shadow-elevated relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs uppercase tracking-wider opacity-80">{t('dashboard.balanceMonth')}</span>
            <PiggyIcon size={20} className="opacity-80" />
          </div>
          <div className="text-3xl font-bold mb-3">
            {formatCurrency(stats.savings, settings, { privacy })}
          </div>
          <div className="flex items-center gap-2 text-sm">
            {stats.savings >= 0 ? (
              <>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15">
                  <TrendingUpIcon size={12} /> {t('dashboard.savingsLabel')}
                </span>
                <span className="opacity-80">
                  {formatPercentage(stats.savingsRate)} {t('dashboard.savingsOfIncome')}
                </span>
              </>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-400/20">
                <TrendingDownIcon size={12} /> {t('dashboard.overspendingBadge')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tarjetas de ingresos y gastos */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<ArrowDownIcon size={18} />}
          label={t('common.income')}
          value={formatCurrency(stats.income, settings, { privacy })}
          change={stats.incomeChange}
          color="success"
        />
        <StatCard
          icon={<ArrowUpIcon size={18} />}
          label={t('common.expenses')}
          value={formatCurrency(stats.expenses, settings, { privacy })}
          change={stats.expensesChange}
          color="danger"
          invertChange
        />
      </div>

      {/* Insight destacado */}
      {insights.length > 0 && (
        <div className="card bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border border-amber-100 dark:border-amber-500/20">
          <div className="flex items-start gap-3">
            <div className="text-2xl">{insights[0].icon}</div>
            <div className="flex-1">
              <div className="font-medium text-sm">{insights[0].title}</div>
              <div className="text-xs text-muted mt-0.5">{insights[0].description}</div>
            </div>
          </div>
        </div>
      )}

      {/* Gráfico mensual */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">{t('dashboard.monthlyEvolution')}</h2>
          <Link to="/statistics" className="text-xs text-primary-600 dark:text-primary-400">
            {t('dashboard.viewMore')}
          </Link>
        </div>
        <div className="h-48 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.monthlyData}>
              <defs>
                <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgb(30 41 59)',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 12,
                  color: 'white'
                }}
                labelStyle={{ color: '#94a3b8' }}
                formatter={(value: number) => formatCompactCurrency(value, settings, privacy)}
              />
              <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fill="url(#colorInc)" />
              <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} fill="url(#colorExp)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-muted">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success-500" /> Ingresos
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-danger-500" /> Gastos
          </div>
        </div>
      </div>

      {/* Gráfico circular + top categorías */}
      {stats.topCategories.length > 0 && (
        <div className="card">
          <h2 className="font-semibold mb-3">{t('dashboard.topCategories')}</h2>
          <div className="grid grid-cols-2 gap-4 items-center">
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.topCategories}
                    dataKey="amount"
                    nameKey={(e) => e.category?.name}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={2}
                  >
                    {stats.topCategories.map((entry, i) => (
                      <Cell key={i} fill={entry.category?.color || '#6366f1'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgb(30 41 59)',
                      border: 'none',
                      borderRadius: 12,
                      fontSize: 12,
                      color: 'white'
                    }}
                    formatter={(value: number) => formatCompactCurrency(value, settings, privacy)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {stats.topCategories.slice(0, 4).map((entry) => (
                <div key={entry.category.id} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: entry.category.color }} />
                  <span className="text-xs flex-1 truncate">{entry.category.icon} {entry.category.name}</span>
                  <span className="text-xs font-medium">{formatPercentage(entry.percentage, 0)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Últimos movimientos */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">{t('dashboard.recentMovements')}</h2>
          <Link to="/movements" className="text-xs text-primary-600 dark:text-primary-400">
            {t('dashboard.viewAll')}
          </Link>
        </div>
        {stats.recentTransactions.length === 0 ? (
          <EmptyState
            icon={<WalletIcon size={28} />}
            title={t('dashboard.noMovements')}
            description={t('dashboard.noMovementsDesc')}
          />
        ) : (
          <div className="space-y-1">
            {stats.recentTransactions.map((tx) => {
              const cat = categories.find((c) => c.id === tx.categoryId);
              return (
                <div key={tx.id} className="flex items-center gap-3 py-2.5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                    style={{ background: (cat?.color || '#6366f1') + '20' }}
                  >
                    {cat?.icon || '📦'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{tx.concept}</div>
                    <div className="text-xs text-muted">
                      {cat?.name} · {formatRelativeDate(tx.date, settings)}
                    </div>
                  </div>
                  <div className={`text-sm font-semibold ${tx.type === 'expense' ? 'text-negative' : 'text-positive'}`}>
                    {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount, settings, { hideSign: true, privacy })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Presupuestos */}
      <BudgetsWidget />

      {/* Próximos cobros */}
      <UpcomingPaymentsWidget />

      {/* Calendario financiero */}
      <CalendarWidget />

      {/* Gastos recurrentes */}
      <RecurringWidget />
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  change: number;
  color: 'success' | 'danger' | 'primary';
  invertChange?: boolean;
}

function StatCard({ icon, label, value, change, color, invertChange = false }: StatCardProps) {
  const { t } = useTranslation();
  const colorClasses = {
    success: 'bg-success-50 dark:bg-success-500/10 text-success-600 dark:text-success-500',
    danger: 'bg-danger-50 dark:bg-danger-500/10 text-danger-600 dark:text-danger-500',
    primary: 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400'
  };
  const isPositive = invertChange ? change < 0 : change > 0;
  const showChange = isFinite(change) && change !== 0;

  return (
    <motion.div
      whileHover={{ y: -2, transition: easings.spring }}
      whileTap={{ scale: 0.98 }}
      className="card"
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${colorClasses[color]}`}>
        {icon}
      </div>
      <div className="text-xs text-muted">{label}</div>
      <div className="font-bold text-base mb-0.5">{value}</div>
      {showChange && (
        <div className={`text-xs flex items-center gap-0.5 ${isPositive ? 'text-success-600' : 'text-danger-600'}`}>
          {isPositive ? <TrendingUpIcon size={10} /> : <TrendingDownIcon size={10} />}
          {Math.abs(change).toFixed(0)}% {t('dashboard.vsLastMonth')}
        </div>
      )}
    </motion.div>
  );
}
