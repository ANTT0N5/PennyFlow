import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/database/db';
import {
  deleteTransaction,
  duplicateTransaction
} from '@/services/finance';
import { useSettingsStore } from '@/context/SettingsContext';
import { formatCurrency } from '@/utils/format';
import { formatRelativeDate, startOfDay, endOfDay, startOfMonth, endOfMonth } from '@/utils/date';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/Feedback';
import {
  SearchIcon,
  FilterIcon,
  TrashIcon,
  CopyIcon,
  EditIcon,
  CloseIcon,
  ChevronDownIcon,
  PlusIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@/components/ui/Icons';
import { TransactionFormModal } from '@/components/movements/TransactionFormModal';
import { QuickAddModal } from '@/components/movements/QuickAddModal';
import { useTranslation } from '@/hooks/useTranslation';
import type { Transaction, TransactionType } from '@/types';

export default function Movements() {
  const { settings } = useSettingsStore();
  const { t } = useTranslation();
  const allTransactions = useLiveQuery(() => db.transactions.orderBy('date').reverse().toArray(), []) ?? [];
  const allCategories = useLiveQuery(() => db.categories.toArray(), []) ?? [];

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('month');
  const [showFilters, setShowFilters] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<TransactionType | undefined>(undefined);

  const filtered = useMemo(() => {
    return allTransactions.filter((t) => {
      if (search) {
        const q = search.toLowerCase();
        if (!t.concept.toLowerCase().includes(q) && !(t.note || '').toLowerCase().includes(q)) {
          return false;
        }
      }
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (categoryFilter && t.categoryId !== categoryFilter) return false;
      const now = new Date();
      if (dateFilter === 'today') {
        if (t.date < startOfDay(now) || t.date > endOfDay(now)) return false;
      } else if (dateFilter === 'month') {
        if (t.date < startOfMonth(now).getTime() || t.date > endOfMonth(now).getTime()) return false;
      } else if (dateFilter === 'week') {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 6);
        weekStart.setHours(0, 0, 0, 0);
        if (t.date < weekStart.getTime()) return false;
      }
      return true;
    });
  }, [allTransactions, search, typeFilter, categoryFilter, dateFilter]);

  // Agrupar por fecha
  const grouped = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    for (const t of filtered) {
      const key = formatRelativeDate(t.date, settings);
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    }
    return groups;
  }, [filtered, settings]);

  const totalIncome = filtered.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteTransaction(deleteId);
    setDeleteId(null);
  };

  const handleDuplicate = async (id: string) => {
    await duplicateTransaction(id);
  };

  const hasActiveFilters = typeFilter !== 'all' || categoryFilter !== '' || dateFilter !== 'month';

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('movements.title')}</h1>
          <p className="text-sm text-muted">{filtered.length} {t('common.results')}</p>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => {
              setQuickAddType('expense');
              setQuickAddOpen(true);
            }}
            className="btn-icon bg-danger-50 dark:bg-danger-500/10 text-danger-600 w-10 h-10"
            aria-label="Nuevo gasto"
            title="Nuevo gasto"
          >
            <ArrowDownIcon size={18} />
          </button>
          <button
            onClick={() => {
              setQuickAddType('income');
              setQuickAddOpen(true);
            }}
            className="btn-icon bg-success-50 dark:bg-success-500/10 text-success-600 w-10 h-10"
            aria-label="Nuevo ingreso"
            title="Nuevo ingreso"
          >
            <ArrowUpIcon size={18} />
          </button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <div className="text-xs text-muted">{t('common.income')}</div>
          <div className="font-bold text-positive">
            +{formatCurrency(totalIncome, settings, { hideSign: true, privacy: settings.privacyMode })}
          </div>
        </div>
        <div className="card">
          <div className="text-xs text-muted">{t('common.expenses')}</div>
          <div className="font-bold text-negative">
            -{formatCurrency(totalExpenses, settings, { hideSign: true, privacy: settings.privacyMode })}
          </div>
        </div>
      </div>

      {/* Buscador */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('common.searchPlaceholder')}
            className="input pl-10"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn-icon ${showFilters || hasActiveFilters ? 'bg-primary-50 text-primary-600 dark:bg-primary-600/20' : 'bg-slate-100 dark:bg-slate-800'}`}
          aria-label="Filtros"
        >
          <FilterIcon size={20} />
        </button>
      </div>

      {/* Filtros */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="card space-y-3">
              <div>
                <div className="text-xs text-muted mb-2">{t('movements.type')}</div>
                <div className="flex gap-2 flex-wrap">
                  {(['all', 'expense', 'income'] as const).map((tp) => (
                    <button
                      key={tp}
                      onClick={() => setTypeFilter(tp)}
                      className={`chip ${typeFilter === tp ? 'chip-active' : ''}`}
                    >
                      {tp === 'all' ? t('common.allPlural') : tp === 'expense' ? t('quickAdd.expense') : t('quickAdd.income')}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted mb-2">{t('movements.date')}</div>
                <div className="flex gap-2 flex-wrap">
                  {([
                    { v: 'all', l: t('common.all') },
                    { v: 'today', l: t('common.today') },
                    { v: 'week', l: t('common.thisWeek') },
                    { v: 'month', l: t('common.thisMonth') }
                  ] as const).map((opt) => (
                    <button
                      key={opt.v}
                      onClick={() => setDateFilter(opt.v)}
                      className={`chip ${dateFilter === opt.v ? 'chip-active' : ''}`}
                    >
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted mb-2">{t('movements.category')}</div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="input"
                >
                  <option value="">{t('movements.allCategories')}</option>
                  {allCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={() => {
                    setTypeFilter('all');
                    setCategoryFilter('');
                    setDateFilter('month');
                  }}
                  className="btn-ghost text-sm w-full"
                >
                  {t('common.clearFilters')}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de movimientos */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<SearchIcon size={28} />}
          title="No se encontraron movimientos"
          description="Prueba a cambiar los filtros o añade un nuevo movimiento con el botón +"
        />
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([dateLabel, txs]) => (
            <div key={dateLabel}>
              <div className="text-xs text-muted font-medium uppercase tracking-wider mb-2 px-1">
                {dateLabel}
              </div>
              <div className="card p-0 overflow-hidden">
                {txs.map((t, idx) => {
                  const cat = allCategories.find((c) => c.id === t.categoryId);
                  const isExpanded = expandedId === t.id;
                  return (
                    <div
                      key={t.id}
                      className={`flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                        idx !== txs.length - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''
                      }`}
                    >
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : t.id)}
                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      >
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0"
                          style={{ background: (cat?.color || '#6366f1') + '20' }}
                        >
                          {cat?.icon || '📦'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{t.concept}</div>
                          <div className="text-xs text-muted truncate">
                            {cat?.name}
                            {t.note ? ` · ${t.note}` : ''}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`font-semibold text-sm ${t.type === 'expense' ? 'text-negative' : 'text-positive'}`}>
                            {t.type === 'expense' ? '-' : '+'}{formatCurrency(t.amount, settings, { hideSign: true, privacy: settings.privacyMode })}
                          </div>
                          <div className="text-[10px] text-muted">{t.time}</div>
                        </div>
                        <ChevronDownIcon
                          size={14}
                          className={`text-slate-400 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </button>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="flex gap-1"
                          >
                            <button
                              onClick={() => setEditingTx(t)}
                              className="btn-icon w-9 h-9 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                              aria-label="Editar"
                            >
                              <EditIcon size={16} />
                            </button>
                            <button
                              onClick={() => handleDuplicate(t.id)}
                              className="btn-icon w-9 h-9 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                              aria-label="Duplicar"
                            >
                              <CopyIcon size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteId(t.id)}
                              className="btn-icon w-9 h-9 bg-danger-50 dark:bg-danger-500/10 text-danger-600"
                              aria-label="Eliminar"
                            >
                              <TrashIcon size={16} />
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de edición */}
      <TransactionFormModal
        open={!!editingTx}
        transaction={editingTx}
        onClose={() => setEditingTx(null)}
      />

      {/* Modal de añadir rápido */}
      <QuickAddModal
        open={quickAddOpen}
        initialType={quickAddType}
        onClose={() => {
          setQuickAddOpen(false);
          setQuickAddType(undefined);
        }}
        privacyMode={settings.privacyMode}
      />

      {/* Confirmar borrado */}
      <ConfirmDialog
        open={!!deleteId}
        title="¿Eliminar movimiento?"
        message="Esta acción no se puede deshacer. El movimiento se eliminará permanentemente."
        confirmLabel="Eliminar"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
