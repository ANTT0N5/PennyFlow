import type { Settings } from '@/types';

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  JPY: '¥',
  CHF: 'CHF',
  CAD: 'C$',
  AUD: 'A$',
  CNY: '¥',
  MXN: '$',
  ARS: '$',
  COP: '$',
  CLP: '$',
  PEN: 'S/',
  BRL: 'R$'
};

export function getCurrencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code] ?? code;
}

export function formatCurrency(
  amount: number,
  settings: Pick<Settings, 'currency' | 'locale' | 'numberFormat'>,
  options: { hideSign?: boolean; privacy?: boolean } = {}
): string {
  if (options.privacy) return '••••';
  const symbol = getCurrencySymbol(settings.currency);
  const locale = settings.numberFormat === 'es' ? 'es-ES' : 'en-US';
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Math.abs(amount));
  const sign = options.hideSign ? '' : amount < 0 ? '-' : '';
  return `${sign}${formatted} ${symbol}`;
}

export function formatAmount(amount: number, settings: Pick<Settings, 'numberFormat'>, privacy = false): string {
  if (privacy) return '••••';
  const locale = settings.numberFormat === 'es' ? 'es-ES' : 'en-US';
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatCompactCurrency(
  amount: number,
  settings: Pick<Settings, 'currency' | 'locale' | 'numberFormat'>,
  privacy = false
): string {
  if (privacy) return '••••';
  const symbol = getCurrencySymbol(settings.currency);
  const locale = settings.numberFormat === 'es' ? 'es-ES' : 'en-US';
  const formatted = new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(amount);
  return `${formatted} ${symbol}`;
}

export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function parseAmount(input: string): number | null {
  if (!input) return null;
  // Reemplazar coma decimal por punto
  const normalized = input.replace(/\./g, '').replace(',', '.').trim();
  const value = parseFloat(normalized);
  return isNaN(value) ? null : value;
}
