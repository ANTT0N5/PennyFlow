// ===== Servicio de notificaciones locales =====
// Usa la Notifications API nativa del navegador/sistema operativo
// Cuando la PWA está instalada, las notificaciones aparecen como nativas

import { db } from '@/database/db';
import { addDays, differenceInDays, format } from '@/utils/date';
import type { RecurringTransaction } from '@/types';
import type { Settings } from '@/types';

const NOTIFICATION_PERMISSION_KEY = 'pennyflow:notif-permission';
const LAST_CHECK_KEY = 'pennyflow:last-notif-check';

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export function isNotificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}

export function getNotificationPermission(): NotificationPermissionState {
  if (!isNotificationsSupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return 'default';
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isNotificationsSupported()) return 'unsupported';
  try {
    const result = await Notification.requestPermission();
    if (result === 'granted') {
      localStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'granted');
    }
    return result as NotificationPermissionState;
  } catch {
    return 'denied';
  }
}

// ===== Mostrar una notificación local =====
export async function showLocalNotification(
  title: string,
  body: string,
  options: {
    icon?: string;
    badge?: string;
    tag?: string;
    data?: Record<string, unknown>;
  } = {}
): Promise<void> {
  if (getNotificationPermission() !== 'granted') return;

  const icon = options.icon || '/icons/icon-192.png';
  const badge = options.badge || '/icons/icon-96.png';

  // Si hay service worker, usarlo (mejor para background)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(title, {
          body,
          icon,
          badge,
          tag: options.tag,
          data: options.data,
          requireInteraction: false,
          silent: false
        } as NotificationOptions);
        return;
      }
    } catch {
      // fallback a Notification directa
    }
  }

  // Fallback: Notification directa
  try {
    new Notification(title, {
      body,
      icon,
      badge,
      tag: options.tag,
      data: options.data as any
    } as NotificationOptions);
  } catch {
    // Silenciar errores
  }
}

// ===== Comprobar próximos cobros y disparar recordatorios =====
export async function checkAndNotifyUpcomingPayments(settings: Settings): Promise<void> {
  if (getNotificationPermission() !== 'granted') return;

  const now = new Date();
  const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
  const lastCheckTime = lastCheck ? parseInt(lastCheck) : 0;

  // Evitar comprobar más de una vez por hora
  if (now.getTime() - lastCheckTime < 60 * 60 * 1000) return;

  localStorage.setItem(LAST_CHECK_KEY, now.getTime().toString());

  const recurring = await db.recurring.toArray();
  const activeRecurring = recurring.filter((r) => r.active);

  for (const r of activeRecurring) {
    if (r.reminderDaysBefore <= 0) continue;

    // Buscar próxima fecha >= hoy
    let next = new Date(r.nextExecution);
    while (next < now) {
      next = advanceDate(next, r.pattern, r.customDays);
    }

    const daysLeft = differenceInDays(next, now);

    // Si faltan exactamente los días de recordatorio, disparar
    if (daysLeft === r.reminderDaysBefore) {
      const dateStr = format(next, settings.dateFormat, { locale: undefined });
      const isExpense = r.type === 'expense';
      const amount = formatAmountLocal(r.amount, settings);

      await showLocalNotification(
        `⏰ ${isExpense ? 'Pago próximo' : 'Ingreso próximo'}`,
        `${r.concept}: ${amount} · ${dateStr}`,
        {
          tag: `recurring-${r.id}`,
          icon: isExpense ? '/icons/shortcut-expense.png' : '/icons/shortcut-income.png',
          data: { recurringId: r.id, url: '/' }
        }
      );
    }

    // Si es hoy, también avisar
    if (daysLeft === 0) {
      const isExpense = r.type === 'expense';
      const amount = formatAmountLocal(r.amount, settings);

      await showLocalNotification(
        `💸 ${isExpense ? 'Cobro hoy' : 'Ingreso hoy'}`,
        `${r.concept}: ${amount}`,
        {
          tag: `recurring-today-${r.id}`,
          icon: isExpense ? '/icons/shortcut-expense.png' : '/icons/shortcut-income.png',
          data: { recurringId: r.id, url: '/' }
        }
      );
    }
  }
}

function advanceDate(date: Date, pattern: RecurringTransaction['pattern'], customDays?: number): Date {
  switch (pattern) {
    case 'daily': return addDays(date, 1);
    case 'weekly': return addDays(date, 7);
    case 'monthly': {
      const d = new Date(date);
      d.setMonth(d.getMonth() + 1);
      return d;
    }
    case 'yearly': {
      const d = new Date(date);
      d.setFullYear(d.getFullYear() + 1);
      return d;
    }
    case 'custom': return addDays(date, customDays || 30);
    default: return addDays(date, 30);
  }
}

function formatAmountLocal(amount: number, settings: Settings): string {
  const locale = settings.numberFormat === 'es' ? 'es-ES' : 'en-US';
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
  return `${formatted} ${settings.currency}`;
}

// ===== Notificación de prueba =====
export async function sendTestNotification(): Promise<void> {
  await showLocalNotification(
    '✅ PennyFlow',
    'Las notificaciones funcionan correctamente. Te avisaremos de tus próximos pagos.',
    {
      tag: 'pennyflow-test',
      data: { url: '/' }
    }
  );
}

// ===== Notificación de bienvenida =====
export async function sendWelcomeNotification(): Promise<void> {
  await showLocalNotification(
    '👋 Bienvenido a PennyFlow',
    'Te avisaremos cuando tengas un pago recurrente próximo.',
    {
      tag: 'pennyflow-welcome',
      data: { url: '/' }
    }
  );
}
