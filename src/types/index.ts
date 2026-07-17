// ===== Tipos centrales de la aplicación =====

export type TransactionType = 'expense' | 'income';

export type RecurrencePattern = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface Category {
  id: string;
  name: string;
  icon: string; // emoji o nombre de icono
  color: string;
  type: TransactionType | 'both';
  parentId?: string | null; // para subcategorías
  isDefault?: boolean;
  order: number;
  createdAt: number;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  concept: string;
  note?: string;
  categoryId: string;
  tags: string[]; // ids de tags
  date: number; // timestamp
  time?: string; // HH:mm
  createdAt: number;
  updatedAt: number;
  recurringId?: string | null;
  isRecurringInstance?: boolean;
}

export interface RecurringTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  concept: string;
  categoryId: string;
  tags: string[];
  note?: string;
  pattern: RecurrencePattern;
  customDays?: number; // para custom
  startDate: number;
  endDate?: number | null;
  nextExecution: number;
  lastExecuted?: number | null;
  reminderDaysBefore: number;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Budget {
  id: string;
  categoryId?: string | null; // null = presupuesto global mensual
  amount: number;
  period: 'monthly' | 'weekly' | 'yearly';
  alerts: boolean;
  alertThreshold: number; // porcentaje 0-100
  createdAt: number;
  updatedAt: number;
}

export interface Goal {
  id: string;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: number;
  color: string;
  icon: string;
  createdAt: number;
  updatedAt: number;
}

import type { Language } from '@/i18n/types';
import type { ColorTheme } from '@/styles/themes';

export interface Settings {
  id: string; // siempre 'app-settings'
  theme: 'light' | 'dark' | 'system';
  colorTheme: ColorTheme;
  currency: string; // código ISO: EUR, USD, etc.
  locale: string;
  language: Language;
  dateFormat: 'dd/MM/yyyy' | 'MM/dd/yyyy' | 'yyyy-MM-dd';
  firstDayOfWeek: 0 | 1; // 0 domingo, 1 lunes
  numberFormat: 'es' | 'en';
  privacyMode: boolean;
  pinEnabled: boolean;
  pinHash?: string;
  autoLockMinutes: number; // 0 = nunca
  hideAmounts: boolean;
  onboarded: boolean;
  languageAsked: boolean; // si ya se preguntó el idioma en onboarding
  notificationsEnabled: boolean; // si el usuario quiere recibir notificaciones de recordatorios
}

export interface CalendarEvent {
  id: string;
  date: number;
  type: 'payment' | 'income' | 'subscription' | 'reminder';
  title: string;
  amount: number;
  recurringId?: string;
  transactionId?: string;
}

export interface Insight {
  id: string;
  type: 'positive' | 'neutral' | 'warning' | 'info';
  title: string;
  description: string;
  icon: string;
  metric?: number;
}

// ===== Utilidades de tipos =====
export interface PageQuery {
  period?: 'week' | 'month' | 'year' | 'custom';
  startDate?: number;
  endDate?: number;
  categoryId?: string;
  type?: TransactionType;
  search?: string;
}
