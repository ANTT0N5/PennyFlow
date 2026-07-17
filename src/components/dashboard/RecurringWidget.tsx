import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/database/db';
import { createRecurring, updateRecurring, deleteRecurring } from '@/services/finance';
import { useCategories } from '@/hooks/useFinance';
import { useSettingsStore } from '@/context/SettingsContext';
import { useTranslation } from '@/hooks/useTranslation';
import { formatCurrency } from '@/utils/format';
import { format, addDays, addWeeks, addMonths, addYears, format as formatDateFns } from '@/utils/date';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { PlusIcon, TrashIcon, RepeatIcon, CalendarIcon, ClockIcon } from '@/components/ui/Icons';
import type { RecurrencePattern, RecurringTransaction } from '@/types';

export function RecurringWidget() {
  const allRecurring = useLiveQuery(() => db.recurring.toArray(), []) ?? [];
  const categories = useCategories();
  const { settings } = useSettingsStore();
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<RecurringTransaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const items = allRecurring.filter((r) => r.active).map((r) => {
    const cat = categories.find((c) => c.id === r.categoryId);
    return { ...r, category: cat };
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteRecurring(deleteId);
    setDeleteId(null);
  };

  const patternLabel = (pattern: RecurrencePattern, customDays?: number) => {
    switch (pattern) {
      case 'daily': return t('recurring.patternDaily');
      case 'weekly': return t('recurring.patternWeekly');
      case 'monthly': return t('recurring.patternMonthly');
      case 'yearly': return t('recurring.patternYearly');
      case 'custom': return `${t('recurring.patternCustom')} ${customDays}${t('recurring.days')}`;
      default: return '';
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold flex items-center gap-2">
          <RepeatIcon size={16} /> {t('recurring.title')}
        </h2>
        <button
          onClick={() => {
            setEditItem(null);
            setModalOpen(true);
          }}
          className="btn-ghost text-xs"
        >
          <PlusIcon size={14} /> {t('recurring.new')}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-6 text-muted text-sm">
          {t('recurring.noRecurring')}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 group cursor-pointer"
              onClick={() => {
                setEditItem(item);
                setModalOpen(true);
              }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0"
                style={{ background: (item.category?.color || '#6366f1') + '20' }}
              >
                {item.category?.icon || '📦'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{item.concept}</div>
                <div className="text-xs text-muted flex items-center gap-1">
                  <RepeatIcon size={10} /> {patternLabel(item.pattern, item.customDays)}
                  {' · '}
                  <CalendarIcon size={10} /> {format(new Date(item.nextExecution), settings.dateFormat, { locale: undefined })}
                  {item.reminderDaysBefore > 0 && (
                    <>
                      {' · '}
                      <ClockIcon size={10} /> {t('recurring.reminderBadge')} {item.reminderDaysBefore}{t('recurring.days')}
                    </>
                  )}
                </div>
              </div>
              <div className={`text-sm font-semibold ${item.type === 'expense' ? 'text-negative' : 'text-positive'}`}>
                {item.type === 'expense' ? '-' : '+'}{formatCurrency(item.amount, settings, { hideSign: true, privacy: settings.privacyMode })}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteId(item.id);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-danger-600"
                aria-label="Eliminar"
              >
                <TrashIcon size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <RecurringFormModal
        open={modalOpen}
        editItem={editItem}
        onClose={() => {
          setModalOpen(false);
          setEditItem(null);
        }}
      />

      <ConfirmDialog
        open={!!deleteId}
        title={t('recurring.deleteTitle')}
        message={t('recurring.deleteMessage')}
        confirmLabel={t('common.delete')}
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

function RecurringFormModal({ open, editItem, onClose }: { open: boolean; editItem: RecurringTransaction | null; onClose: () => void }) {
  const categories = useCategories();
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [concept, setConcept] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [pattern, setPattern] = useState<RecurrencePattern>('monthly');
  const [customDays, setCustomDays] = useState('30');
  const [startDate, setStartDate] = useState(formatDateFns(new Date(), 'yyyy-MM-dd'));
  const [reminderDaysBefore, setReminderDaysBefore] = useState('1');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (editItem) {
        setType(editItem.type);
        setAmount(editItem.amount.toString());
        setConcept(editItem.concept);
        setCategoryId(editItem.categoryId);
        setPattern(editItem.pattern);
        setCustomDays(editItem.customDays?.toString() || '30');
        setStartDate(formatDateFns(new Date(editItem.nextExecution), 'yyyy-MM-dd'));
        setReminderDaysBefore(editItem.reminderDaysBefore.toString());
      } else {
        setType('expense');
        setAmount('');
        setConcept('');
        setCategoryId('');
        setPattern('monthly');
        setCustomDays('30');
        setStartDate(formatDateFns(new Date(), 'yyyy-MM-dd'));
        setReminderDaysBefore('1');
      }
    }
  }, [open, editItem]);

  const handleSave = async () => {
    const amountNum = parseFloat(amount.replace(',', '.'));
    if (!amountNum || !concept.trim() || !categoryId) return;
    setSaving(true);
    try {
      const startMs = new Date(`${startDate}T00:00:00`).getTime();
      let nextExecution = startMs;
      // Calcular próxima ejecución a partir de la fecha de inicio
      if (pattern === 'daily') nextExecution = startMs;
      else if (pattern === 'weekly') nextExecution = startMs;
      else if (pattern === 'monthly') nextExecution = startMs;
      else if (pattern === 'yearly') nextExecution = startMs;
      else nextExecution = startMs;

      const payload = {
        type,
        amount: amountNum,
        concept: concept.trim(),
        categoryId,
        tags: [] as string[],
        pattern,
        customDays: pattern === 'custom' ? parseInt(customDays) : undefined,
        startDate: startMs,
        endDate: null,
        nextExecution,
        lastExecuted: null,
        reminderDaysBefore: parseInt(reminderDaysBefore) || 0,
        active: true
      };

      if (editItem) {
        await updateRecurring(editItem.id, payload);
      } else {
        await createRecurring(payload);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const filteredCategories = categories.filter((c) => c.type === 'both' || c.type === type);

  // Vista previa de las próximas fechas
  const previewDates: { label: string; date: Date }[] = [];
  if (startDate) {
    const start = new Date(`${startDate}T00:00:00`);
    for (let i = 0; i < 3; i++) {
      let d: Date;
      if (pattern === 'daily') d = addDays(start, i);
      else if (pattern === 'weekly') d = addWeeks(start, i);
      else if (pattern === 'monthly') d = addMonths(start, i);
      else if (pattern === 'yearly') d = addYears(start, i);
      else d = addDays(start, (parseInt(customDays) || 30) * i);
      previewDates.push({
        label: i === 0 ? 'Próximo cobro' : `En ${i + 1} ${pattern === 'daily' ? 'días' : pattern === 'weekly' ? 'sem.' : pattern === 'yearly' ? 'año' : 'meses'}`,
        date: d
      });
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editItem ? 'Editar recurrente' : 'Nuevo movimiento recurrente'}>
      <div className="space-y-4">
        {/* Tipo */}
        <div className="flex gap-2">
          <button
            onClick={() => setType('expense')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              type === 'expense' ? 'bg-danger-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            Gasto recurrente
          </button>
          <button
            onClick={() => setType('income')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              type === 'income' ? 'bg-success-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            Ingreso recurrente
          </button>
        </div>

        {/* Importe */}
        <div>
          <label className="label">Importe</label>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))}
            placeholder="0,00"
            className="input text-2xl font-bold"
          />
        </div>

        {/* Concepto */}
        <div>
          <label className="label">Concepto</label>
          <input
            type="text"
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            placeholder="Ej: Netflix, alquiler, nómina, gimnasio..."
            className="input"
          />
        </div>

        {/* Categoría */}
        <div>
          <label className="label">Categoría</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="input"
          >
            <option value="">Selecciona...</option>
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </div>

        {/* Frecuencia */}
        <div>
          <label className="label">Frecuencia</label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {([
              { v: 'daily', l: 'Diario' },
              { v: 'weekly', l: 'Semanal' },
              { v: 'monthly', l: 'Mensual' },
              { v: 'yearly', l: 'Anual' },
              { v: 'custom', l: 'Personalizado' }
            ] as const).map((opt) => (
              <button
                key={opt.v}
                onClick={() => setPattern(opt.v)}
                className={`py-2 rounded-xl text-xs font-medium transition-all ${
                  pattern === opt.v
                    ? 'bg-primary-600 text-white shadow-soft'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {opt.l}
              </button>
            ))}
          </div>
        </div>

        {pattern === 'custom' && (
          <div>
            <label className="label">Cada cuántos días</label>
            <input
              type="number"
              value={customDays}
              onChange={(e) => setCustomDays(e.target.value)}
              min="1"
              className="input"
            />
          </div>
        )}

        {/* Fecha de cobro */}
        <div>
          <label className="label flex items-center gap-1">
            <CalendarIcon size={12} /> Fecha del próximo cobro
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="input"
          />
          <p className="text-xs text-muted mt-1">
            Selecciona el día real en que te cobran el servicio.
          </p>
        </div>

        {/* Vista previa próximas fechas */}
        {previewDates.length > 0 && (
          <div className="card-tight bg-slate-50 dark:bg-slate-800/50">
            <div className="text-xs text-muted mb-2">Próximas 3 fechas</div>
            <div className="space-y-1">
              {previewDates.map((p, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className={i === 0 ? 'font-semibold text-primary-600' : 'text-muted'}>
                    {p.label}
                  </span>
                  <span className={i === 0 ? 'font-semibold' : ''}>
                    {format(p.date, 'EEEE d MMM yyyy', { locale: undefined })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recordatorio */}
        <div>
          <label className="label flex items-center gap-1">
            <ClockIcon size={12} /> Recordatorio (días antes)
          </label>
          <select
            value={reminderDaysBefore}
            onChange={(e) => setReminderDaysBefore(e.target.value)}
            className="input"
          >
            <option value="0">Sin aviso</option>
            <option value="1">1 día antes</option>
            <option value="2">2 días antes</option>
            <option value="3">3 días antes</option>
            <option value="7">1 semana antes</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
        <button
          onClick={handleSave}
          disabled={!amount || !concept || !categoryId || saving}
          className="btn-primary flex-1"
        >
          {saving ? 'Guardando...' : editItem ? 'Guardar cambios' : 'Crear recurrente'}
        </button>
      </div>
    </Modal>
  );
}
