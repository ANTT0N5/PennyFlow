import { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/database/db';
import { createTransaction } from '@/services/finance';
import { learnFromTransaction, suggestCategory, suggestCategoryFromMemory } from '@/services/ai';
import { formatCurrency } from '@/utils/format';
import { format as formatDateFns } from '@/utils/date';
import { useSettingsStore } from '@/context/SettingsContext';
import { useTranslation } from '@/hooks/useTranslation';
import type { TransactionType, Category } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpIcon,
  ArrowDownIcon,
  SparklesIcon,
  CalendarIcon,
  ClockIcon,
  TagIcon,
  CloseIcon
} from '@/components/ui/Icons';

interface QuickAddModalProps {
  open: boolean;
  onClose: () => void;
  privacyMode?: boolean;
  initialType?: TransactionType;
}

const QUICK_AMOUNTS = [5, 10, 20, 50, 100];

export function QuickAddModal({ open, onClose, privacyMode = false, initialType }: QuickAddModalProps) {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [concept, setConcept] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(formatDateFns(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [saving, setSaving] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const { settings } = useSettingsStore();
  const { t } = useTranslation();

  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? [];

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setType(initialType || 'expense');
      setAmount('');
      setConcept('');
      setCategoryId('');
      setNote('');
      setShowNote(false);
      setDate(formatDateFns(new Date(), 'yyyy-MM-dd'));
      setTime(new Date().toTimeString().slice(0, 5));
    }
  }, [open, initialType]);

  // Sugerencia automática de categoría
  const suggestedCategory = useMemo<Category | null>(() => {
    if (!concept) return null;
    return suggestCategoryFromMemory(concept, categories) ?? suggestCategory(concept, categories);
  }, [concept, categories]);

  // Auto-aplicar sugerencia solo si el usuario no ha elegido manualmente
  useEffect(() => {
    if (suggestedCategory && !categoryId) {
      setCategoryId(suggestedCategory.id);
    }
  }, [suggestedCategory, categoryId]);

  const handleClose = () => {
    onClose();
  };

  const handleSave = async () => {
    const amountNum = parseFloat(amount.replace(',', '.'));
    if (!amountNum || amountNum <= 0 || !concept.trim()) return;
    if (!categoryId) {
      const otros = categories.find((c) => c.name === 'Otros');
      if (!otros) return;
      setCategoryId(otros.id);
      return;
    }
    setSaving(true);
    try {
      const dateMs = new Date(`${date}T${time || '00:00'}`).getTime();
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
      learnFromTransaction(concept, categoryId);
      handleClose();
    } finally {
      setSaving(false);
    }
  };

  const filteredCategories = categories.filter((c) => c.type === 'both' || c.type === type);
  const amountNum = parseFloat(amount.replace(',', '.')) || 0;
  const isToday = date === formatDateFns(new Date(), 'yyyy-MM-dd');

  // Atajos de teclado
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, amount, concept, categoryId, date, time]);

  return (
    <Modal open={open} onClose={handleClose} title={t('quickAdd.title')}>
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
          <ArrowDownIcon size={16} /> {t('quickAdd.expense')}
        </button>
        <button
          onClick={() => setType('income')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            type === 'income'
              ? 'bg-success-500 text-white shadow-soft'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
          }`}
        >
          <ArrowUpIcon size={16} /> {t('quickAdd.income')}
        </button>
      </div>

      {/* Importe grande */}
      <div className="text-center mb-4">
        <div className="relative inline-block">
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              const val = e.target.value.replace(/[^\d.,]/g, '');
              setAmount(val);
            }}
            placeholder="0,00"
            autoFocus
            className="w-full text-center text-4xl font-bold bg-transparent outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
            style={{ width: `${Math.max(120, (amount.length + 1) * 28)}px` }}
            aria-label="Importe"
          />
        </div>
        <div className="text-xs text-muted mt-1">
          {amountNum > 0
            ? formatCurrency(type === 'expense' ? -amountNum : amountNum, settings, { privacy: privacyMode })
            : t('quickAdd.amountHint')}
        </div>
      </div>

      {/* Cantidades rápidas */}
      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
        {QUICK_AMOUNTS.map((q) => (
          <button
            key={q}
            onClick={() => setAmount(q.toString())}
            className="chip shrink-0"
          >
            +{q}
          </button>
        ))}
        <button
          onClick={() => setAmount('')}
          className="chip shrink-0 text-slate-400"
          aria-label="Borrar"
        >
          {t('common.clear')}
        </button>
      </div>

      {/* Concepto */}
      <div className="mb-3">
        <label className="label">{t('quickAdd.concept')}</label>
        <input
          type="text"
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          placeholder={t('quickAdd.conceptPlaceholder')}
          className="input"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && amount && concept) {
              // Saltar al siguiente campo
              (document.getElementById('category-section') as HTMLElement)?.focus();
            }
          }}
        />
      </div>

      {/* Sugerencia de categoría */}
      {suggestedCategory && categoryId === suggestedCategory.id && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs"
          >
            <SparklesIcon size={14} />
            <span>{t('quickAdd.suggestedCategory')}: <strong>{suggestedCategory.icon} {suggestedCategory.name}</strong></span>
            <button
              onClick={() => setCategoryId('')}
              className="ml-auto opacity-60 hover:opacity-100"
              aria-label="Quitar sugerencia"
            >
              <CloseIcon size={12} />
            </button>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Categoría */}
      <div id="category-section" tabIndex={-1} className="mb-3">
        <label className="label">{t('quickAdd.category')}</label>
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

      {/* Fecha y hora */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="label">
            <CalendarIcon size={12} className="inline mr-1" />
            {t('quickAdd.date')}
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={formatDateFns(new Date(), 'yyyy-MM-dd')}
            className="input"
          />
        </div>
        <div>
          <label className="label">
            <ClockIcon size={12} className="inline mr-1" />
            {t('quickAdd.time')}
          </label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="input"
          />
        </div>
      </div>

      {/* Nota opcional */}
      {!showNote ? (
        <button
          onClick={() => setShowNote(true)}
          className="btn-ghost text-xs w-full justify-start"
        >
          <TagIcon size={14} /> {t('quickAdd.addNote')}
        </button>
      ) : (
        <div className="mb-3">
          <label className="label">{t('quickAdd.note')}</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('quickAdd.notePlaceholder')}
            className="input min-h-[60px] resize-y"
            autoFocus
          />
        </div>
      )}

      {/* Botones */}
      <div className="flex gap-3 mt-6">
        <button onClick={handleClose} className="btn-secondary flex-1">
          {t('common.cancel')}
        </button>
        <button
          onClick={handleSave}
          disabled={!amount || !concept || !categoryId || saving}
          className="btn-primary flex-1"
        >
          {saving ? '...' : isToday ? t('common.save') : t('common.saveWithDate')}
        </button>
      </div>

      <p className="text-[10px] text-muted text-center mt-2">
        <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[9px]">{t('quickAdd.shortcutSave')}</kbd> · <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[9px]">{t('quickAdd.shortcutCancel')}</kbd>
      </p>
    </Modal>
  );
}
