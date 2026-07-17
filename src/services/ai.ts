import type { Transaction, Category, Insight } from '@/types';
import type { Language } from '@/i18n/types';
import { suggestCategoryFromConcept } from '@/utils/parser';
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  isSameDay,
  format
} from '@/utils/date';

/**
 * IA local - Sin nube, sin APIs externas.
 * Implementa reglas heurísticas para:
 * - Clasificar gastos
 * - Sugerir categorías
 * - Detectar patrones
 * - Generar insights automáticos
 * - Realizar proyecciones simples
 */

// ===== Sugerencia de categoría =====
export function suggestCategory(concept: string, categories: Category[]): Category | null {
  const icon = suggestCategoryFromConcept(concept);
  if (icon) {
    const match = categories.find((c) => c.icon === icon);
    if (match) return match;
  }
  // Búsqueda por nombre
  const lower = concept.toLowerCase();
  const byName = categories.find((c) => lower.includes(c.name.toLowerCase()));
  if (byName) return byName;
  return null;
}

// ===== Aprendizaje de conceptos frecuentes =====
interface ConceptMemory {
  concept: string;
  categoryId: string;
  count: number;
}

const MEMORY_KEY = 'finanzas:concept-memory';

export function loadConceptMemory(): ConceptMemory[] {
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveConceptMemory(memory: ConceptMemory[]): void {
  try {
    // Mantener solo top 200 entradas
    const sorted = memory.sort((a, b) => b.count - a.count).slice(0, 200);
    localStorage.setItem(MEMORY_KEY, JSON.stringify(sorted));
  } catch {
    // localStorage puede estar lleno
  }
}

export function learnFromTransaction(concept: string, categoryId: string): void {
  const memory = loadConceptMemory();
  const key = concept.toLowerCase().trim();
  const existing = memory.find((m) => m.concept === key);
  if (existing) {
    existing.count++;
    existing.categoryId = categoryId;
  } else {
    memory.push({ concept: key, categoryId, count: 1 });
  }
  saveConceptMemory(memory);
}

export function suggestCategoryFromMemory(concept: string, categories: Category[]): Category | null {
  const memory = loadConceptMemory();
  const key = concept.toLowerCase().trim();
  // Coincidencia exacta
  const exact = memory.find((m) => m.concept === key);
  if (exact) {
    const cat = categories.find((c) => c.id === exact.categoryId);
    if (cat) return cat;
  }
  // Coincidencia parcial
  const partial = memory
    .filter((m) => key.includes(m.concept) || m.concept.includes(key))
    .sort((a, b) => b.count - a.count)[0];
  if (partial) {
    const cat = categories.find((c) => c.id === partial.categoryId);
    if (cat) return cat;
  }
  return null;
}

// ===== Detección de gastos recurrentes =====
export function detectRecurringTransactions(transactions: Transaction[]): {
  concept: string;
  amount: number;
  categoryId: string;
  occurrences: number;
  avgDaysBetween: number;
  suggestedPattern: 'weekly' | 'monthly' | 'yearly' | 'custom';
}[] {
  const grouped: Record<string, Transaction[]> = {};
  for (const t of transactions) {
    if (t.type !== 'expense') continue;
    const key = `${t.concept.toLowerCase().trim()}-${t.amount.toFixed(2)}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(t);
  }

  const result = [];
  for (const [key, txs] of Object.entries(grouped)) {
    if (txs.length < 2) continue;
    const sorted = txs.sort((a, b) => a.date - b.date);
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      intervals.push(sorted[i].date - sorted[i - 1].date);
    }
    const avgMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const avgDays = avgMs / (1000 * 60 * 60 * 24);

    let pattern: 'weekly' | 'monthly' | 'yearly' | 'custom';
    if (avgDays >= 6 && avgDays <= 8) pattern = 'weekly';
    else if (avgDays >= 27 && avgDays <= 33) pattern = 'monthly';
    else if (avgDays >= 360 && avgDays <= 370) pattern = 'yearly';
    else pattern = 'custom';

    result.push({
      concept: sorted[0].concept,
      amount: sorted[0].amount,
      categoryId: sorted[0].categoryId,
      occurrences: txs.length,
      avgDaysBetween: Math.round(avgDays),
      suggestedPattern: pattern
    });
  }
  return result.sort((a, b) => b.occurrences - a.occurrences);
}

// ===== Generación de insights automáticos =====
export function generateInsights(
  transactions: Transaction[],
  language: Language = 'es'
): Insight[] {
  const insights: Insight[] = [];
  const now = new Date();
  const thisMonthStart = startOfMonth(now).getTime();
  const thisMonthEnd = endOfMonth(now).getTime();
  const prevMonth = subMonths(now, 1);
  const prevMonthStart = startOfMonth(prevMonth).getTime();
  const prevMonthEnd = endOfMonth(prevMonth).getTime();

  const thisMonthTx = transactions.filter((t) => t.date >= thisMonthStart && t.date <= thisMonthEnd);
  const prevMonthTx = transactions.filter((t) => t.date >= prevMonthStart && t.date <= prevMonthEnd);

  const thisExpenses = thisMonthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const prevExpenses = prevMonthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const thisIncome = thisMonthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const prevIncome = prevMonthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);

  // 1. Comparativa de gastos mes a mes
  if (prevExpenses > 0) {
    const diff = ((thisExpenses - prevExpenses) / prevExpenses) * 100;
    if (Math.abs(diff) >= 5) {
      const isLower = diff < 0;
      insights.push({
        id: 'expense-comparison',
        type: isLower ? 'positive' : 'warning',
        icon: isLower ? '📉' : '📈',
        title: language === 'es'
          ? `Has gastado un ${Math.abs(diff).toFixed(0)}% ${isLower ? 'menos' : 'más'} que el mes pasado`
          : `You spent ${Math.abs(diff).toFixed(0)}% ${isLower ? 'less' : 'more'} than last month`,
        description: language === 'es'
          ? `Gastos este mes: ${thisExpenses.toFixed(2)}€ vs ${prevExpenses.toFixed(2)}€ el mes pasado`
          : `This month: ${thisExpenses.toFixed(2)}€ vs last month: ${prevExpenses.toFixed(2)}€`,
        metric: diff
      });
    }
  }

  // 2. Día de la semana con mayor gasto
  const daySpending: Record<number, number> = {};
  for (const t of thisMonthTx) {
    if (t.type !== 'expense') continue;
    const day = new Date(t.date).getDay();
    daySpending[day] = (daySpending[day] || 0) + t.amount;
  }
  const dayNames = language === 'es'
    ? ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
    : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  let maxDay = -1;
  let maxAmount = 0;
  for (const [day, amount] of Object.entries(daySpending)) {
    if (amount > maxAmount) {
      maxAmount = amount;
      maxDay = parseInt(day);
    }
  }
  if (maxDay >= 0 && thisExpenses > 0) {
    const percentage = (maxAmount / thisExpenses) * 100;
    insights.push({
      id: 'top-day',
      type: 'info',
      icon: '📅',
      title: language === 'es'
        ? `Los ${dayNames[maxDay]} son tu día con mayor gasto`
        : `${dayNames[maxDay]} is your biggest spending day`,
      description: language === 'es'
        ? `Has gastado ${maxAmount.toFixed(2)}€ (${percentage.toFixed(0)}% del mes)`
        : `You spent ${maxAmount.toFixed(2)}€ (${percentage.toFixed(0)}% of the month)`,
      metric: percentage
    });
  }

  // 3. Categoría dominante
  const categorySpending: Record<string, number> = {};
  for (const t of thisMonthTx) {
    if (t.type !== 'expense') continue;
    categorySpending[t.categoryId] = (categorySpending[t.categoryId] || 0) + t.amount;
  }
  const topCategory = Object.entries(categorySpending).sort((a, b) => b[1] - a[1])[0];
  if (topCategory && thisExpenses > 0) {
    const percentage = (topCategory[1] / thisExpenses) * 100;
    insights.push({
      id: 'top-category',
      type: 'info',
      icon: '🏷️',
      title: language === 'es'
        ? `Tu categoría principal representa el ${percentage.toFixed(0)}% de tus gastos`
        : `Your top category is ${percentage.toFixed(0)}% of your expenses`,
      description: language === 'es'
        ? `Importe: ${topCategory[1].toFixed(2)}€ este mes`
        : `Amount: ${topCategory[1].toFixed(2)}€ this month`,
      metric: percentage
    });
  }

  // 4. Tendencia de ahorro (3 meses)
  if (transactions.length > 0) {
    const savingsTrend: boolean[] = [];
    for (let i = 0; i < 3; i++) {
      const ref = subMonths(now, i);
      const start = startOfMonth(ref).getTime();
      const end = endOfMonth(ref).getTime();
      const txs = transactions.filter((t) => t.date >= start && t.date <= end);
      const inc = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const exp = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      savingsTrend.push(inc - exp > 0);
    }
    if (savingsTrend.every((s) => s)) {
      insights.push({
        id: 'savings-streak',
        type: 'positive',
        icon: '💪',
        title: language === 'es'
          ? 'Tu ahorro ha aumentado durante tres meses consecutivos'
          : 'Your savings have grown for three months in a row',
        description: language === 'es'
          ? '¡Sigue así! Estás construyendo un hábito saludable'
          : 'Keep it up! You are building a healthy habit'
      });
    }
  }

  // 5. Alerta si los gastos superan los ingresos este mes
  if (thisIncome > 0 && thisExpenses > thisIncome) {
    insights.push({
      id: 'overspending',
      type: 'warning',
      icon: '⚠️',
      title: language === 'es'
        ? 'Estás gastando más de lo que ingresas este mes'
        : 'You are spending more than you earn this month',
      description: language === 'es'
        ? `Gastos: ${thisExpenses.toFixed(2)}€ · Ingresos: ${thisIncome.toFixed(2)}€`
        : `Expenses: ${thisExpenses.toFixed(2)}€ · Income: ${thisIncome.toFixed(2)}€`
    });
  }

  return insights;
}

// ===== Proyección simple =====
export function projectMonthEnd(transactions: Transaction[], now = new Date()): {
  projectedExpenses: number;
  projectedIncome: number;
  projectedBalance: number;
  daysElapsed: number;
  daysTotal: number;
} {
  const monthStart = startOfMonth(now).getTime();
  const monthEnd = endOfMonth(now).getTime();
  const monthTx = transactions.filter((t) => t.date >= monthStart && t.date <= monthEnd);

  const expenses = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const income = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);

  const daysTotal = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysElapsed = now.getDate();

  if (daysElapsed === 0) {
    return { projectedExpenses: 0, projectedIncome: 0, projectedBalance: 0, daysElapsed: 0, daysTotal };
  }

  const dailyExpense = expenses / daysElapsed;
  const dailyIncome = income / daysElapsed;

  const projectedExpenses = dailyExpense * daysTotal;
  const projectedIncome = dailyIncome * daysTotal;

  return {
    projectedExpenses,
    projectedIncome,
    projectedBalance: projectedIncome - projectedExpenses,
    daysElapsed,
    daysTotal
  };
}
