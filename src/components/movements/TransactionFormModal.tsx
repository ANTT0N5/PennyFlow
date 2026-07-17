import { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/database/db';
import { createTransaction, updateTransaction, deleteTransaction } from '@/services/finance';
import { learnFromTransaction, suggestCategory, suggestCategoryFromMemory } from '@/services/ai';
import { useSettingsStore } from '@/context/SettingsContext';
import type { Transaction, TransactionType } from '@/types';
import { ArrowUpIcon, ArrowDownIcon, TrashIcon, SparklesIcon } from '@/components/ui/Icons';
import { ConfirmDialog } from '@/components/ui/Modal';
import { format } from '@/utils/date';

interface Props {
  open: boolean;
  transaction: Transaction | null;
  onClose: () => void;
}

export function TransactionFormModal({ open, transaction, onClose }: Props) {
  const { settings } = useSettingsStore();
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? [];
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [concept, setConcept] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmount(transaction.amount.toString());
      setConcept(transaction.concept);
      setCategoryId(transaction.categoryId);
      setNote(transaction.note || '');
      setDate(format(new Date(transaction.date), 'yyyy-MM-dd'));
      setTime(transaction.time || new Date(transaction.date).toTimeString().slice(0, 5));
    } else {
      setType('expense');
      setAmount('');
      setConcept('');
      setCategoryId('');
      setNote('');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setTime(new Date().toTimeString().slice(0, 5));
    }
  }, [transaction, open]);

  const suggestedCategory = useMemo(() => {
    if (!concept || categoryId) return null;
    return suggestCategoryFromMemory(concept, categories) ?? suggestCategory(concept, categories);
  }, [concept, categories, categoryId]);

  const handleSave = async () => {
    const amountNum = parseFloat(amount.replace(',', '.'));
    if (!amountNum || amountNum <= 0 || !concept.trim() || !categoryId) return;
    setSaving(true);
    try {
      const dateMs = new Date(`${date}T${time || '00:00'}`).getTime();
      if (transaction) {
        await updateTransaction(transaction.id, {
          type,
          amount: amountNum,
          concept: concept.trim(),
          categoryId,
          note: note.trim() || undefined,
          date: dateMs,
          time
        });
      } else {
        await createTransaction({
          type,
          amount: amountNum,
          concept: concept.trim(),
          categoryId,
          tags: [],
          note: note.trim() || undefined,
          date: dateMs,
          time,
          recurringId: null
        });
      }
      learnFromTransaction(concept, categoryId);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!transaction) return;
    await deleteTransaction(transaction.id);
    setConfirmDelete(false);
    onClose();
  };

  const filteredCategories = categories.filter((c) => c.type === 'both' || c.type === type);

  return (
    <>
      <Modal open={open} onClose={onClose} title={transaction ? 'Editar movimiento' : 'Nuevo movimiento'}>
        {/* Tipo */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setType('expense')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              type === 'expense'
                ? 'bg-danger-500 text-white shadow-soft'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <ArrowDownIcon size={16} /> Gasto
          </button>
          <button
            onClick={() => setType('income')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              type === 'income'
                ? 'bg-success-500 text-white shadow-soft'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <ArrowUpIcon size={16} /> Ingreso
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Importe</label>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              autoFocus
              className="input text-2xl font-bold"
            />
          </div>
          <div>
            <label className="label">Concepto</label>
            <input
              type="text"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="Ej: Supermercado"
              className="input"
            />
          </div>

          {suggestedCategory && (
            <button
              onClick={() => setCategoryId(suggestedCategory.id)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs w-full"
            >
              <SparklesIcon size={14} />
              <span>Usar categoría sugerida: <strong>{suggestedCategory.icon} {suggestedCategory.name}</strong></span>
            </button>
          )}

          <div>
            <label className="label">Categoría</label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {filteredCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryId(cat.id)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                    categoryId === cat.id
                      ? 'bg-primary-50 dark:bg-primary-600/20 ring-2 ring-primary-500'
                      : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="text-xl">{cat.icon}</span>
                  <span className="text-[10px] text-center leading-tight line-clamp-1">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Fecha</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Hora</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label">Nota (opcional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Añade una nota..."
              className="input min-h-[60px] resize-y"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          {transaction && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="btn-icon bg-danger-50 dark:bg-danger-500/10 text-danger-600 w-12"
              aria-label="Eliminar"
            >
              <TrashIcon size={18} />
            </button>
          )}
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!amount || !concept || !categoryId || saving}
            className="btn-primary flex-1"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        title="¿Eliminar movimiento?"
        message="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
