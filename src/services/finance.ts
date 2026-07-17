import { db, generateId } from '@/database/db';
import type { Transaction, Category, Tag, RecurringTransaction, Budget, Goal, Settings } from '@/types';

// ===== Transactions =====
export async function createTransaction(
  data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Transaction> {
  const now = Date.now();
  const transaction: Transaction = {
    ...data,
    id: generateId(),
    createdAt: now,
    updatedAt: now
  };
  await db.transactions.add(transaction);
  return transaction;
}

export async function updateTransaction(
  id: string,
  changes: Partial<Transaction>
): Promise<void> {
  await db.transactions.update(id, { ...changes, updatedAt: Date.now() });
}

export async function deleteTransaction(id: string): Promise<void> {
  await db.transactions.delete(id);
}

export async function duplicateTransaction(id: string): Promise<Transaction | null> {
  const original = await db.transactions.get(id);
  if (!original) return null;
  const now = Date.now();
  const copy: Transaction = {
    ...original,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
    date: now,
    recurringId: null,
    isRecurringInstance: false
  };
  await db.transactions.add(copy);
  return copy;
}

export async function getTransactionsByDateRange(start: number, end: number): Promise<Transaction[]> {
  return db.transactions
    .where('date')
    .between(start, end, true, true)
    .reverse()
    .sortBy('date');
}

export async function getAllTransactions(): Promise<Transaction[]> {
  return db.transactions.orderBy('date').reverse().toArray();
}

// ===== Categories =====
export async function createCategory(
  data: Omit<Category, 'id' | 'createdAt'>
): Promise<Category> {
  const category: Category = {
    ...data,
    id: generateId(),
    createdAt: Date.now()
  };
  await db.categories.add(category);
  return category;
}

export async function updateCategory(id: string, changes: Partial<Category>): Promise<void> {
  await db.categories.update(id, changes);
}

export async function deleteCategory(id: string, replaceWith?: string): Promise<void> {
  if (replaceWith) {
    const txs = await db.transactions.where('categoryId').equals(id).toArray();
    await Promise.all(txs.map((t) => db.transactions.update(t.id, { categoryId: replaceWith })));
  }
  await db.categories.delete(id);
}

// ===== Tags =====
export async function createTag(name: string, color = '#6366f1'): Promise<Tag> {
  const tag: Tag = {
    id: generateId(),
    name,
    color,
    createdAt: Date.now()
  };
  await db.tags.add(tag);
  return tag;
}

export async function deleteTag(id: string): Promise<void> {
  await db.tags.delete(id);
}

// ===== Recurring =====
export async function createRecurring(
  data: Omit<RecurringTransaction, 'id' | 'createdAt' | 'updatedAt'>
): Promise<RecurringTransaction> {
  const now = Date.now();
  const recurring: RecurringTransaction = {
    ...data,
    id: generateId(),
    createdAt: now,
    updatedAt: now
  };
  await db.recurring.add(recurring);
  return recurring;
}

export async function updateRecurring(id: string, changes: Partial<RecurringTransaction>): Promise<void> {
  await db.recurring.update(id, { ...changes, updatedAt: Date.now() });
}

export async function deleteRecurring(id: string): Promise<void> {
  await db.recurring.delete(id);
}

// ===== Budgets =====
export async function createBudget(
  data: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Budget> {
  const now = Date.now();
  const budget: Budget = {
    ...data,
    id: generateId(),
    createdAt: now,
    updatedAt: now
  };
  await db.budgets.add(budget);
  return budget;
}

export async function updateBudget(id: string, changes: Partial<Budget>): Promise<void> {
  await db.budgets.update(id, { ...changes, updatedAt: Date.now() });
}

export async function deleteBudget(id: string): Promise<void> {
  await db.budgets.delete(id);
}

// ===== Goals =====
export async function createGoal(
  data: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Goal> {
  const now = Date.now();
  const goal: Goal = {
    ...data,
    id: generateId(),
    createdAt: now,
    updatedAt: now
  };
  await db.goals.add(goal);
  return goal;
}

export async function updateGoal(id: string, changes: Partial<Goal>): Promise<void> {
  await db.goals.update(id, { ...changes, updatedAt: Date.now() });
}

export async function deleteGoal(id: string): Promise<void> {
  await db.goals.delete(id);
}

export async function addFundsToGoal(id: string, amount: number): Promise<void> {
  const goal = await db.goals.get(id);
  if (!goal) return;
  await db.goals.update(id, {
    currentAmount: Math.max(0, goal.currentAmount + amount),
    updatedAt: Date.now()
  });
}

// ===== Settings =====
export async function getSettings(): Promise<Settings | undefined> {
  return db.settings.get('app-settings');
}

export async function updateSettings(changes: Partial<Settings>): Promise<void> {
  const current = await db.settings.get('app-settings');
  if (!current) {
    await db.settings.put({ id: 'app-settings', ...changes } as Settings);
  } else {
    await db.settings.update('app-settings', changes);
  }
}

// ===== Backup =====
export async function exportFullBackup(): Promise<string> {
  const [transactions, categories, tags, recurring, budgets, goals, settings] = await Promise.all([
    db.transactions.toArray(),
    db.categories.toArray(),
    db.tags.toArray(),
    db.recurring.toArray(),
    db.budgets.toArray(),
    db.goals.toArray(),
    db.settings.toArray()
  ]);
  return JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    data: { transactions, categories, tags, recurring, budgets, goals, settings }
  }, null, 2);
}

export async function importFullBackup(json: string, replace = false): Promise<void> {
  const parsed = JSON.parse(json);
  if (!parsed.data) throw new Error('Formato de backup no válido');

  if (replace) {
    await Promise.all([
      db.transactions.clear(),
      db.categories.clear(),
      db.tags.clear(),
      db.recurring.clear(),
      db.budgets.clear(),
      db.goals.clear(),
      db.settings.clear()
    ]);
  }

  const { transactions, categories, tags, recurring, budgets, goals, settings } = parsed.data;
  if (transactions?.length) await db.transactions.bulkAdd(transactions);
  if (categories?.length) await db.categories.bulkAdd(categories);
  if (tags?.length) await db.tags.bulkAdd(tags);
  if (recurring?.length) await db.recurring.bulkAdd(recurring);
  if (budgets?.length) await db.budgets.bulkAdd(budgets);
  if (goals?.length) await db.goals.bulkAdd(goals);
  if (settings?.length) await db.settings.bulkPut(settings);
}

export async function clearAllData(): Promise<void> {
  await Promise.all([
    db.transactions.clear(),
    db.categories.clear(),
    db.tags.clear(),
    db.recurring.clear(),
    db.budgets.clear(),
    db.goals.clear()
  ]);
}
