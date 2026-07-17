import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/database/db';
import { createCategory, updateCategory, deleteCategory } from '@/services/finance';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { PlusIcon, EditIcon, TrashIcon } from '@/components/ui/Icons';
import type { Category, TransactionType } from '@/types';

const ICONS = ['🛒', '🏠', '🚗', '⚕️', '🎉', '🛍️', '📚', '💼', '🐾', '✈️', '🧾', '📦', '🍔', '☕', '🍷', '🎬', '🎮', '💪', '💊', '🏥', '🚌', '⛽', '🅿️', '📱', '💡', '💧', '🔥', '🌱', '💳', '💰', '🎁', '👴', '👶', '🎓', '🧪', '🔬', '🛠️', '🎵', '🎨', '📸'];
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#8b5cf6', '#84cc16', '#14b8a6', '#f97316', '#64748b', '#a855f7', '#22c55e', '#3b82f6', '#eab308', '#d946ef'];

export function CategoriesManager() {
  const categories = useLiveQuery(() => db.categories.orderBy('order').toArray(), []) ?? [];
  const [modalOpen, setModalOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;
    const otros = categories.find((c) => c.name === 'Otros');
    await deleteCategory(deleteId, otros?.id);
    setDeleteId(null);
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Categorías</h2>
        <button
          onClick={() => {
            setEditCategory(null);
            setModalOpen(true);
          }}
          className="btn-ghost text-xs"
        >
          <PlusIcon size={14} /> Nueva
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="group flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50"
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0"
              style={{ background: cat.color + '20' }}
            >
              {cat.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{cat.name}</div>
              <div className="text-[10px] text-muted">
                {cat.type === 'expense' ? 'Gasto' : cat.type === 'income' ? 'Ingreso' : 'Ambos'}
              </div>
            </div>
            <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => {
                  setEditCategory(cat);
                  setModalOpen(true);
                }}
                className="text-slate-400 hover:text-primary-600"
                aria-label="Editar"
              >
                <EditIcon size={12} />
              </button>
              {!cat.isDefault && (
                <button
                  onClick={() => setDeleteId(cat.id)}
                  className="text-slate-400 hover:text-danger-600"
                  aria-label="Eliminar"
                >
                  <TrashIcon size={12} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <CategoryFormModal
        open={modalOpen}
        category={editCategory}
        onClose={() => {
          setModalOpen(false);
          setEditCategory(null);
        }}
      />

      <ConfirmDialog
        open={!!deleteId}
        title="¿Eliminar categoría?"
        message="Los movimientos existentes se reasignarán a la categoría 'Otros'. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

function CategoryFormModal({ open, category, onClose }: { open: boolean; category: Category | null; onClose: () => void }) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(ICONS[0]);
  const [color, setColor] = useState(COLORS[0]);
  const [type, setType] = useState<TransactionType | 'both'>('expense');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (category) {
        setName(category.name);
        setIcon(category.icon);
        setColor(category.color);
        setType(category.type);
      } else {
        setName('');
        setIcon(ICONS[0]);
        setColor(COLORS[0]);
        setType('expense');
      }
    }
  }, [open, category]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (category) {
        await updateCategory(category.id, {
          name: name.trim(),
          icon,
          color,
          type
        });
      } else {
        await createCategory({
          name: name.trim(),
          icon,
          color,
          type,
          isDefault: false,
          order: 99,
          parentId: null
        });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={category ? 'Editar categoría' : 'Nueva categoría'}>
      <div className="space-y-4">
        {/* Preview */}
        <div className="flex justify-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-soft"
            style={{ background: color + '20' }}
          >
            {icon}
          </div>
        </div>

        <div>
          <label className="label">Nombre</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre de la categoría"
            className="input"
            autoFocus
          />
        </div>

        <div>
          <label className="label">Tipo</label>
          <div className="flex gap-2">
            {([
              { v: 'expense', l: 'Gasto' },
              { v: 'income', l: 'Ingreso' },
              { v: 'both', l: 'Ambos' }
            ] as const).map((opt) => (
              <button
                key={opt.v}
                onClick={() => setType(opt.v)}
                className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                  type === opt.v
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {opt.l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Icono</label>
          <div className="grid grid-cols-8 gap-1.5 max-h-32 overflow-y-auto">
            {ICONS.map((ic) => (
              <button
                key={ic}
                onClick={() => setIcon(ic)}
                className={`aspect-square rounded-lg text-xl flex items-center justify-center transition-all ${
                  icon === ic ? 'bg-primary-100 dark:bg-primary-600/30 ring-2 ring-primary-500' : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'
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
                className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white dark:ring-offset-slate-900' : ''}`}
                style={{ background: c }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
        <button
          onClick={handleSave}
          disabled={!name.trim() || saving}
          className="btn-primary flex-1"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </Modal>
  );
}
