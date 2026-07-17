import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGoals } from '@/hooks/useFinance';
import { useSettingsStore } from '@/context/SettingsContext';
import {
  createGoal,
  updateGoal,
  deleteGoal,
  addFundsToGoal
} from '@/services/finance';
import { useTranslation } from '@/hooks/useTranslation';
import { formatCurrency, formatCompactCurrency } from '@/utils/format';
import { format, differenceInDays } from '@/utils/date';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/Feedback';
import { PlusIcon, TargetIcon, TrashIcon, EditIcon, ArrowUpIcon } from '@/components/ui/Icons';
import type { Goal } from '@/types';

const ICONS = ['🎯', '🏖️', '🚗', '🏠', '💍', '✈️', '📚', '💻', '🎁', '👶', '🐾', '💪', '🎵', '📷'];
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#8b5cf6', '#84cc16'];

export default function Goals() {
  const goals = useGoals();
  const { settings } = useSettingsStore();
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [fundsGoal, setFundsGoal] = useState<Goal | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteGoal(deleteId);
    setDeleteId(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('goals.title')}</h1>
          <p className="text-sm text-muted">{t('goals.subtitle')}</p>
        </div>
        <button
          onClick={() => {
            setEditingGoal(null);
            setModalOpen(true);
          }}
          className="btn-primary"
        >
          <PlusIcon size={18} /> <span className="hidden sm:inline">{t('goals.newGoal')}</span>
        </button>
      </div>

      {goals.length === 0 ? (
        <EmptyState
          icon={<TargetIcon size={28} />}
          title={t('goals.noGoals')}
          description={t('goals.noGoalsDesc')}
          action={
            <button
              onClick={() => setModalOpen(true)}
              className="btn-primary"
            >
              <PlusIcon size={18} /> {t('goals.createGoal')}
            </button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {goals.map((goal) => {
            const percentage = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
            const daysLeft = differenceInDays(new Date(goal.targetDate), new Date());
            const isCompleted = goal.currentAmount >= goal.targetAmount;
            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="card relative overflow-hidden"
              >
                <div
                  className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-20"
                  style={{ background: goal.color }}
                />
                <div className="relative">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                        style={{ background: goal.color + '20' }}
                      >
                        {goal.icon}
                      </div>
                      <div>
                        <div className="font-semibold">{goal.name}</div>
                        {goal.description && (
                          <div className="text-xs text-muted line-clamp-1">{goal.description}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditingGoal(goal);
                          setModalOpen(true);
                        }}
                        className="btn-icon w-8 h-8 text-slate-400 hover:text-slate-600"
                        aria-label="Editar"
                      >
                        <EditIcon size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteId(goal.id)}
                        className="btn-icon w-8 h-8 text-slate-400 hover:text-danger-600"
                        aria-label="Eliminar"
                      >
                        <TrashIcon size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="mb-2">
                    <div className="flex items-end justify-between mb-1">
                      <span className="text-xl font-bold">
                        {formatCompactCurrency(goal.currentAmount, settings, settings.privacyMode)}
                      </span>
                      <span className="text-xs text-muted">
                        {t('statistics.of')} {formatCurrency(goal.targetAmount, settings, { privacy: settings.privacyMode })}
                      </span>
                    </div>
                    <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="h-full rounded-full relative"
                        style={{ background: goal.color }}
                      >
                        {percentage > 15 && (
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                            {percentage.toFixed(0)}%
                          </span>
                        )}
                      </motion.div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    {isCompleted ? (
                      <span className="text-success-600 font-medium">✓ {t('goals.completed')}</span>
                    ) : (
                      <span className={daysLeft < 30 ? 'text-warning-600' : 'text-muted'}>
                        {daysLeft > 0
                          ? `${daysLeft} ${t('goals.daysLeft')}`
                          : `${t('goals.daysOverdue')} ${Math.abs(daysLeft)} ${t('goals.días')}`}
                      </span>
                    )}
                    <span className="text-muted">{format(new Date(goal.targetDate), settings.dateFormat, { locale: undefined })}</span>
                  </div>

                  {!isCompleted && (
                    <button
                      onClick={() => setFundsGoal(goal)}
                      className="btn-secondary w-full mt-3 text-xs py-2"
                    >
                      <ArrowUpIcon size={14} /> {t('goals.addFunds')}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <GoalFormModal
        open={modalOpen}
        goal={editingGoal}
        onClose={() => {
          setModalOpen(false);
          setEditingGoal(null);
        }}
      />

      {fundsGoal && (
        <FundsModal
          goal={fundsGoal}
          onClose={() => setFundsGoal(null)}
        />
      )}

      <ConfirmDialog
        open={!!deleteId}
        title={t('goals.deleteTitle')}
        message={t('goals.deleteMessage')}
        confirmLabel={t('common.delete')}
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

function GoalFormModal({ open, goal, onClose }: { open: boolean; goal: Goal | null; onClose: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [icon, setIcon] = useState(ICONS[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (goal) {
        setName(goal.name);
        setDescription(goal.description || '');
        setTargetAmount(goal.targetAmount.toString());
        setCurrentAmount(goal.currentAmount.toString());
        setTargetDate(format(new Date(goal.targetDate), 'yyyy-MM-dd'));
        setColor(goal.color);
        setIcon(goal.icon);
      } else {
        setName('');
        setDescription('');
        setTargetAmount('');
        setCurrentAmount('0');
        setTargetDate(format(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
        setColor(COLORS[0]);
        setIcon(ICONS[0]);
      }
    }
  }, [open, goal]);

  const handleSave = async () => {
    const target = parseFloat(targetAmount.replace(',', '.'));
    const current = parseFloat((currentAmount || '0').replace(',', '.'));
    if (!name.trim() || !target || !targetDate) return;
    setSaving(true);
    try {
      const dateMs = new Date(targetDate).getTime();
      if (goal) {
        await updateGoal(goal.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          targetAmount: target,
          currentAmount: current,
          targetDate: dateMs,
          color,
          icon
        });
      } else {
        await createGoal({
          name: name.trim(),
          description: description.trim() || undefined,
          targetAmount: target,
          currentAmount: current,
          targetDate: dateMs,
          color,
          icon
        });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={goal ? 'Editar objetivo' : 'Nuevo objetivo'}>
      <div className="space-y-4">
        <div>
          <label className="label">Icono</label>
          <div className="grid grid-cols-7 gap-2">
            {ICONS.map((ic) => (
              <button
                key={ic}
                onClick={() => setIcon(ic)}
                className={`aspect-square rounded-xl text-xl flex items-center justify-center transition-all ${
                  icon === ic ? 'bg-primary-100 dark:bg-primary-600/30 ring-2 ring-primary-500' : 'bg-slate-50 dark:bg-slate-800'
                }`}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Color</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white' : ''}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="label">Nombre</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Viaje a Japón"
            className="input"
          />
        </div>

        <div>
          <label className="label">Descripción (opcional)</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalles de tu objetivo"
            className="input"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Importe objetivo</label>
            <input
              type="text"
              inputMode="decimal"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="1000"
              className="input"
            />
          </div>
          <div>
            <label className="label">Ahorrado</label>
            <input
              type="text"
              inputMode="decimal"
              value={currentAmount}
              onChange={(e) => setCurrentAmount(e.target.value)}
              placeholder="0"
              className="input"
            />
          </div>
        </div>

        <div>
          <label className="label">Fecha objetivo</label>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="input"
          />
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
        <button
          onClick={handleSave}
          disabled={!name || !targetAmount || !targetDate || saving}
          className="btn-primary flex-1"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </Modal>
  );
}

function FundsModal({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const { settings } = useSettingsStore();

  const handleAdd = async () => {
    const value = parseFloat(amount.replace(',', '.'));
    if (!value) return;
    setSaving(true);
    try {
      await addFundsToGoal(goal.id, value);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const quickAmounts = [10, 25, 50, 100];

  return (
    <Modal open={true} onClose={onClose} title={`Aportar a ${goal.name}`}>
      <div className="text-center mb-4">
        <div className="text-4xl mb-2">{goal.icon}</div>
        <div className="text-sm text-muted">Ahorrado actualmente</div>
        <div className="text-2xl font-bold">
          {formatCurrency(goal.currentAmount, settings, { privacy: settings.privacyMode })}
        </div>
        <div className="text-xs text-muted">
          de {formatCurrency(goal.targetAmount, settings, { privacy: settings.privacyMode })}
        </div>
      </div>

      <label className="label">Cantidad a aportar</label>
      <input
        type="text"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0,00"
        autoFocus
        className="input text-2xl font-bold text-center"
      />

      <div className="grid grid-cols-4 gap-2 mt-3">
        {quickAmounts.map((q) => (
          <button
            key={q}
            onClick={() => setAmount(q.toString())}
            className="chip"
          >
            +{q}
          </button>
        ))}
      </div>

      <div className="flex gap-3 mt-6">
        <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
        <button
          onClick={handleAdd}
          disabled={!amount || saving}
          className="btn-primary flex-1"
        >
          {saving ? 'Guardando...' : 'Aportar'}
        </button>
      </div>
    </Modal>
  );
}
