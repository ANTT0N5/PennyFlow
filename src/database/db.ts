import Dexie, { Table } from 'dexie';
import type {
  Transaction,
  Category,
  Tag,
  RecurringTransaction,
  Budget,
  Goal,
  Settings
} from '@/types';
import { detectBrowserLanguage } from '@/i18n/translations';

export class FinanceDB extends Dexie {
  transactions!: Table<Transaction, string>;
  categories!: Table<Category, string>;
  tags!: Table<Tag, string>;
  recurring!: Table<RecurringTransaction, string>;
  budgets!: Table<Budget, string>;
  goals!: Table<Goal, string>;
  settings!: Table<Settings, string>;

  constructor() {
    super('FinanzasPersonalesDB');
    this.version(1).stores({
      transactions: 'id, type, amount, date, categoryId, createdAt, updatedAt, recurringId',
      categories: 'id, name, type, parentId, order, isDefault',
      tags: 'id, name, createdAt',
      recurring: 'id, type, active, nextExecution, pattern',
      budgets: 'id, categoryId, period',
      goals: 'id, targetDate, createdAt',
      settings: 'id'
    });
  }
}

export const db = new FinanceDB();

// ===== Configuración por defecto =====
export const DEFAULT_SETTINGS: Settings = {
  id: 'app-settings',
  theme: 'system',
  colorTheme: 'indigo',
  currency: 'EUR',
  locale: 'es-ES',
  language: 'es', // se actualiza con detectBrowserLanguage() en initializeDatabase
  dateFormat: 'dd/MM/yyyy',
  firstDayOfWeek: 1,
  numberFormat: 'es',
  privacyMode: false,
  pinEnabled: false,
  autoLockMinutes: 0,
  hideAmounts: false,
  onboarded: false,
  languageAsked: false,
  notificationsEnabled: false
};

// ===== Categorías predeterminadas =====
export const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'createdAt'>[] = [
  { name: 'Alimentación', icon: '🛒', color: '#10b981', type: 'expense', isDefault: true, order: 1, parentId: null },
  { name: 'Vivienda', icon: '🏠', color: '#6366f1', type: 'expense', isDefault: true, order: 2, parentId: null },
  { name: 'Transporte', icon: '🚗', color: '#f59e0b', type: 'expense', isDefault: true, order: 3, parentId: null },
  { name: 'Salud', icon: '⚕️', color: '#ef4444', type: 'expense', isDefault: true, order: 4, parentId: null },
  { name: 'Ocio', icon: '🎉', color: '#ec4899', type: 'expense', isDefault: true, order: 5, parentId: null },
  { name: 'Compras', icon: '🛍️', color: '#8b5cf6', type: 'expense', isDefault: true, order: 6, parentId: null },
  { name: 'Educación', icon: '📚', color: '#06b6d4', type: 'expense', isDefault: true, order: 7, parentId: null },
  { name: 'Trabajo', icon: '💼', color: '#84cc16', type: 'income', isDefault: true, order: 8, parentId: null },
  { name: 'Mascotas', icon: '🐾', color: '#f97316', type: 'expense', isDefault: true, order: 9, parentId: null },
  { name: 'Viajes', icon: '✈️', color: '#14b8a6', type: 'expense', isDefault: true, order: 10, parentId: null },
  { name: 'Impuestos', icon: '🧾', color: '#64748b', type: 'expense', isDefault: true, order: 11, parentId: null },
  { name: 'Otros', icon: '📦', color: '#71717a', type: 'both', isDefault: true, order: 12, parentId: null }
];

// ===== Inicialización de la base de datos =====
export async function initializeDatabase(): Promise<void> {
  // Inicializar settings si no existe
  const existingSettings = await db.settings.get('app-settings');
  if (!existingSettings) {
    // Detectar idioma del navegador solo la primera vez
    const detectedLang = detectBrowserLanguage();
    await db.settings.put({ ...DEFAULT_SETTINGS, language: detectedLang });
  } else {
    // Migración: asegurar que colorTheme y notificationsEnabled existan (para usuarios existentes)
    const updates: Partial<Settings> = {};
    if (!existingSettings.colorTheme) updates.colorTheme = 'indigo';
    if (existingSettings.notificationsEnabled === undefined) updates.notificationsEnabled = false;
    if (Object.keys(updates).length > 0) {
      await db.settings.update('app-settings', updates);
    }
    if (!existingSettings.languageAsked) {
      // Si no se ha preguntado el idioma aún, detectar del navegador
      const detectedLang = detectBrowserLanguage();
      if (detectedLang !== existingSettings.language) {
        await db.settings.update('app-settings', { language: detectedLang });
      }
    }
  }

  // Inicializar categorías por defecto si no hay ninguna
  const categoryCount = await db.categories.count();
  if (categoryCount === 0) {
    const now = Date.now();
    const categoriesWithIds = DEFAULT_CATEGORIES.map((cat) => ({
      ...cat,
      id: crypto.randomUUID(),
      createdAt: now
    }));
    await db.categories.bulkAdd(categoriesWithIds);
  }
}

// ===== Helpers de IDs =====
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
