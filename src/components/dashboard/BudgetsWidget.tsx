import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/database/db';
import {
  createBudget,
  updateBudget,
  deleteBudget
} from '@/services/finance';
import { useTransactions, useCategories } from '@/hooks/useFinance';
import { useSettingsStore } from '@/context/SettingsContext';
import { useTranslation } from '@/hooks/useTranslation';
import { formatCurrency, formatPercentage } from '@/utils/format';
import { startOfMonth, endOfMonth } from '@/utils/date';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { PlusIcon, TrashIcon, AlertIcon } from '@/components/ui/Icons';
import type { Budget } from '@/types';

export function BudgetsWidget() {
  const budgets = useLiveQuery(() => db.budgets.toArray(), []) ?? [];
  const transactions = useTransactions();
  const categories = useCategories();
  const { settings } = useSettingsStore();
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const now = new Date();
  const monthStart = startOfMonth(now).getTime();
  const monthEnd = endOfMonth(now).getTime();

  const budgetData = budgets.map((b) => {
    const cat = categories.find((c) => c.id === b.categoryId);
    const spent = transactions
      .filter((t) =>
        t.type === 'expense' &&
        t.date >= monthStart &&
        t.date <= monthEnd &&
        (!b.categoryId || t.categoryId === b.categoryId)
      )
      .reduce((s, t) => s + t.amount, 0);
    const percentage = b.amount > 0 ? (spent / b.amount) * 100 : 0;
    const remaining = b.amount - spent;
    const isOver = spent > b.amount;
    const isWarning = percentage >= b.alertThreshold && !isOver;
    return { budget: b, category: cat, spent, percentage, remaining, isOver, isWarning };
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteBudget(deleteId);
    setDeleteId(null);
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">{t('budgets.title')}</h2>
        <button
          onClick={() => {
            setEditingBudget(null);
            setModalOpen(true);
          }}
          className="btn-ghost text-xs"
        >
          <PlusIcon size={14} /> {t('budgets.new')}
        </button>
      </div>

      {budgetData.length === 0 ? (
        <div className="text-center py-6 text-muted text-sm">
          {t('budgets.noBudgets')}
        </div>
      ) : (
        <div className="space-y-3">
          {budgetData.map(({ budget, category, spent, percentage, remaining, isOver, isWarning }) => (
            <div key={budget.id} className="group">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  {category && <span className="text-base shrink-0">{category.icon}</span>}
                  <span className="text-sm font-medium truncate">
                    {category ? category.name : t('budgets.global')}
                  </span>
                  {isOver && <AlertIcon size={14} className="text-danger-500 shrink-0" />}
                  {isWarning && <AlertIcon size={14} className="text-warning-500 shrink-0" />}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">
                    {formatCurrency(spent, settings, { privacy: settings.privacyMode })} / {formatCurrency(budget.amount, settings, { privacy: settings.privacyMode })}
                  </span>
                  <button
                    onClick={() => setDeleteId(budget.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-danger-600"
                    aria-label="Eliminar"
                  >
                    <TrashIcon size={14} />
                  </button>
                </div>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, percentage)}%` }}
                  transition={{ duration: 0.5 }}
                  className={`h-full rounded-full ${
                    isOver ? 'bg-danger-500' : isWarning ? 'bg-warning-500' : 'bg-success-500'
                  }`}
                />
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-muted">
                <span>{formatPercentage(percentage, 0)} {t('budgets.used')}</span>
                <span className={isOver ? 'text-danger-600 font-medium' : ''}>
                  {isOver ? t('budgets.exceeded') : `${t('budgets.remaining')} ${formatCurrency(remaining, settings, { privacy: settings.privacyMode })}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <BudgetFormModal
        open={modalOpen}
        budget={editingBudget}
        onClose={() => {
          setModalOpen(false);
          setEditingBudget(null);
        }}
      />

      <ConfirmDialog
        open={!!deleteId}
        title={t('budgets.deleteTitle')}
        message={t('budgets.deleteMessage')}
        confirmLabel={t('common.delete')}
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

function BudgetFormModal({ open, budget, onClose }: { open: boolean; budget: Budget | null; onClose: () => void }) {
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? [];
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [period, setPeriod] = useState<'monthly' | 'weekly' | 'yearly'>('monthly');
  const [alertThreshold, setAlertThreshold] = useState(80);
  const [saving, setSaving] = useState(false);

  useState(() => {
    if (budget) {
      setAmount(budget.amount.toString());
      setCategoryId(budget.categoryId || '');
      setPeriod(budget.period);
      setAlertThreshold(budget.alertThreshold);
    }
  });

  const handleSave = async () => {
    const amountNum = parseFloat(amount.replace(',', '.'));
    if (!amountNum || amountNum <= 0) return;
    setSaving(true);
    try {
      if (budget) {
        await updateBudget(budget.id, {
          amount: amountNum,
          categoryId: categoryId || null,
          period,
          alertThreshold
        });
      } else {
        await createBudget({
          amount: amountNum,
          categoryId: categoryId || null,
          period,
          alerts: true,
          alertThreshold
        });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={budget ? 'Editar presupuesto' : 'Nuevo presupuesto'}>
      <div className="space-y-4">
        <div>
          <label className="label">Categoría (vacío = global)</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="input"
          >
            <option value="">Presupuesto global</option>
            {categories.filter((c) => c.type === 'expense' || c.type === 'both').map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Importe del presupuesto</label>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="500,00"
            className="input text-xl font-bold"
          />
        </div>
        <div>
          <label className="label">Periodo</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="input"
          >
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensual</option>
            <option value="yearly">Anual</option>
          </select>
        </div>
        <div>
          <label className="label">Alerta al alcanzar el {alertThreshold}%</label>
          <input
            type="range"
            min="50"
            max="100"
            value={alertThreshold}
            onChange={(e) => setAlertThreshold(Number(e.target.value))}
            className="w-full accent-primary-600"
          />
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
        <button
          onClick={handleSave}
          disabled={!amount || saving}
          className="btn-primary flex-1"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </Modal>
  );
}
