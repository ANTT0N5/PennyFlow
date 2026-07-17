import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/database/db';
import { useMemo } from 'react';
import type { Transaction, Category } from '@/types';
import {
  getPeriodRange,
  getPreviousPeriodRange,
  startOfMonth,
  endOfMonth,
  subMonths
} from '@/utils/date';

export function useTransactions() {
  return useLiveQuery(() => db.transactions.orderBy('date').reverse().toArray(), []) ?? [];
}

export function useCategories() {
  return useLiveQuery(() => db.categories.orderBy('order').toArray(), []) ?? [];
}

export function useTags() {
  return useLiveQuery(() => db.tags.toArray(), []) ?? [];
}

export function useBudgets() {
  return useLiveQuery(() => db.budgets.toArray(), []) ?? [];
}

export function useGoals() {
  return useLiveQuery(() => db.goals.toArray(), []) ?? [];
}

export function useRecurring() {
  return useLiveQuery(() => db.recurring.toArray(), []) ?? [];
}

export interface DashboardStats {
  balance: number;
  income: number;
  expenses: number;
  savings: number;
  savingsRate: number;
  prevIncome: number;
  prevExpenses: number;
  prevSavings: number;
  incomeChange: number; // porcentaje
  expensesChange: number;
  savingsChange: number;
  topCategories: { category: Category; amount: number; percentage: number }[];
  recentTransactions: Transaction[];
  monthlyData: { month: string; income: number; expenses: number; savings: number }[];
  categoryBreakdown: { category: Category; amount: number; percentage: number }[];
}

export function useDashboardStats(): DashboardStats | null {
  const transactions = useTransactions();
  const categories = useCategories();

  return useMemo(() => {
    if (!transactions || !categories) return null;

    const now = new Date();
    const monthStart = startOfMonth(now).getTime();
    const monthEnd = endOfMonth(now).getTime();
    const prevMonth = subMonths(now, 1);
    const prevMonthStart = startOfMonth(prevMonth).getTime();
    const prevMonthEnd = endOfMonth(prevMonth).getTime();

    const monthTx = transactions.filter((t) => t.date >= monthStart && t.date <= monthEnd);
    const prevMonthTx = transactions.filter((t) => t.date >= prevMonthStart && t.date <= prevMonthEnd);

    const income = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const prevIncome = prevMonthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const prevExpenses = prevMonthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    const savings = income - expenses;
    const prevSavings = prevIncome - prevExpenses;
    const savingsRate = income > 0 ? (savings / income) * 100 : 0;

    const incomeChange = prevIncome > 0 ? ((income - prevIncome) / prevIncome) * 100 : 0;
    const expensesChange = prevExpenses > 0 ? ((expenses - prevExpenses) / prevExpenses) * 100 : 0;
    const savingsChange = prevSavings !== 0 ? ((savings - prevSavings) / Math.abs(prevSavings)) * 100 : 0;

    // Top categorías
    const categoryTotals: Record<string, number> = {};
    for (const t of monthTx) {
      if (t.type !== 'expense') continue;
      categoryTotals[t.categoryId] = (categoryTotals[t.categoryId] || 0) + t.amount;
    }
    const topCategories = Object.entries(categoryTotals)
      .map(([catId, amount]) => ({
        category: categories.find((c) => c.id === catId)!,
        amount,
        percentage: expenses > 0 ? (amount / expenses) * 100 : 0
      }))
      .filter((x) => x.category)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const categoryBreakdown = topCategories;

    // Datos mensuales (6 meses)
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const ref = subMonths(now, i);
      const start = startOfMonth(ref).getTime();
      const end = endOfMonth(ref).getTime();
      const txs = transactions.filter((t) => t.date >= start && t.date <= end);
      const inc = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const exp = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      monthlyData.push({
        month: ref.toLocaleDateString('es', { month: 'short' }),
        income: inc,
        expenses: exp,
        savings: inc - exp
      });
    }

    return {
      balance: savings,
      income,
      expenses,
      savings,
      savingsRate,
      prevIncome,
      prevExpenses,
      prevSavings,
      incomeChange,
      expensesChange,
      savingsChange,
      topCategories,
      recentTransactions: transactions.slice(0, 6),
      monthlyData,
      categoryBreakdown
    };
  }, [transactions, categories]);
}

export function useFilteredTransactions(filters: {
  search?: string;
  type?: 'expense' | 'income' | 'all';
  categoryId?: string;
  startDate?: number;
  endDate?: number;
}): Transaction[] {
  const transactions = useTransactions();
  return useMemo(() => {
    if (!transactions) return [];
    return transactions.filter((t) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!t.concept.toLowerCase().includes(q) && !(t.note || '').toLowerCase().includes(q)) {
          return false;
        }
      }
      if (filters.type && filters.type !== 'all' && t.type !== filters.type) return false;
      if (filters.categoryId && t.categoryId !== filters.categoryId) return false;
      if (filters.startDate && t.date < filters.startDate) return false;
      if (filters.endDate && t.date > filters.endDate) return false;
      return true;
    });
  }, [transactions, filters.search, filters.type, filters.categoryId, filters.startDate, filters.endDate]);
}
