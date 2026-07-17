import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfYear,
  endOfYear,
  subMonths,
  subWeeks,
  subYears,
  isSameDay,
  isSameMonth,
  isSameYear,
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInDays,
  differenceInMonths,
  eachDayOfInterval,
  eachMonthOfInterval,
  getDay,
  getDate,
  getMonth,
  getYear,
  parseISO,
  isValid
} from 'date-fns';
import { es, enUS, fr, de, it, ptBR } from 'date-fns/locale';
import type { Settings } from '@/types';
import type { Language } from '@/i18n/types';

export function getLocale(language: Language) {
  switch (language) {
    case 'es': return es;
    case 'en': return enUS;
    case 'fr': return fr;
    case 'de': return de;
    case 'it': return it;
    case 'pt': return ptBR;
    default: return es;
  }
}

export function formatDate(
  date: number | Date,
  settings: Pick<Settings, 'dateFormat' | 'language'>,
  withTime = false
): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  const pattern = settings.dateFormat === 'dd/MM/yyyy'
    ? 'dd/MM/yyyy'
    : settings.dateFormat === 'MM/dd/yyyy'
      ? 'MM/dd/yyyy'
      : 'yyyy-MM-dd';
  const locale = getLocale(settings.language);
  let result = format(d, pattern, { locale });
  if (withTime) {
    result += ` · ${format(d, 'HH:mm', { locale })}`;
  }
  return result;
}

export function formatRelativeDate(date: number | Date, settings: Pick<Settings, 'language'>): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  const now = new Date();
  const locale = getLocale(settings.language);
  const diffDays = differenceInDays(now, d);

  if (isSameDay(d, now)) {
    return settings.language === 'es' ? 'Hoy' : 'Today';
  }
  if (diffDays === 1) return settings.language === 'es' ? 'Ayer' : 'Yesterday';
  if (diffDays > 0 && diffDays < 7) {
    return format(d, 'EEEE', { locale });
  }
  if (isSameYear(d, now)) {
    return format(d, 'd MMM', { locale });
  }
  return format(d, 'd MMM yyyy', { locale });
}

export function formatMonthYear(date: number | Date, language: Language): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  return format(d, 'MMMM yyyy', { locale: getLocale(language) });
}

export function formatShortMonth(date: number | Date, language: Language): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  return format(d, 'MMM', { locale: getLocale(language) });
}

export type PeriodType = 'week' | 'month' | 'year' | 'custom';

export interface DateRange {
  start: number;
  end: number;
}

export function getPeriodRange(
  period: PeriodType,
  reference: Date = new Date(),
  firstDayOfWeek: 0 | 1 = 1
): DateRange {
  let start: Date;
  let end: Date;
  switch (period) {
    case 'week':
      start = startOfWeek(reference, { weekStartsOn: firstDayOfWeek });
      end = endOfWeek(reference, { weekStartsOn: firstDayOfWeek });
      break;
    case 'year':
      start = startOfYear(reference);
      end = endOfYear(reference);
      break;
    case 'month':
    default:
      start = startOfMonth(reference);
      end = endOfMonth(reference);
      break;
  }
  return {
    start: start.getTime(),
    end: end.getTime()
  };
}

export function getPreviousPeriodRange(period: PeriodType, reference: Date = new Date(), firstDayOfWeek: 0 | 1 = 1): DateRange {
  let prevRef: Date;
  switch (period) {
    case 'week':
      prevRef = subWeeks(reference, 1);
      break;
    case 'year':
      prevRef = subYears(reference, 1);
      break;
    case 'month':
    default:
      prevRef = subMonths(reference, 1);
      break;
  }
  return getPeriodRange(period, prevRef, firstDayOfWeek);
}

export function getMonthDays(year: number, month: number, firstDayOfWeek: 0 | 1 = 1): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const start = startOfWeek(firstDay, { weekStartsOn: firstDayOfWeek });
  const end = endOfWeek(lastDay, { weekStartsOn: firstDayOfWeek });
  return eachDayOfInterval({ start, end });
}

export function getMonthsInRange(start: number, end: number): Date[] {
  return eachMonthOfInterval({ start: new Date(start), end: new Date(end) });
}

export function getDaysInRange(start: number, end: number): Date[] {
  return eachDayOfInterval({ start: new Date(start), end: new Date(end) });
}

export function startOfDay(date: number | Date): number {
  const d = typeof date === 'number' ? new Date(date) : date;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function endOfDay(date: number | Date): number {
  const d = typeof date === 'number' ? new Date(date) : date;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();
}

export {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfYear,
  endOfYear,
  subMonths,
  subWeeks,
  subYears,
  isSameDay,
  isSameMonth,
  isSameYear,
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInDays,
  differenceInMonths,
  eachDayOfInterval,
  eachMonthOfInterval,
  getDay,
  getDate,
  getMonth,
  getYear,
  parseISO,
  isValid
};
