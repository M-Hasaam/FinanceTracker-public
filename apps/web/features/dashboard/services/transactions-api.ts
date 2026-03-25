import { API_URL } from '@/common/libs/constants';

export type TransactionType = 'INCOME' | 'EXPENSE';

export interface Transaction {
  id: string;
  amount: string;
  type: TransactionType;
  date: string;
  description: string | null;
  category: { id: string; name: string };
  createdAt: string;
}

export interface CreateTransactionPayload {
  amount: number;
  type: TransactionType;
  date: string;
  category: string;
  description?: string;
}

export interface DashboardSummary {
  totals: { totalIncome: number; totalExpense: number; balance: number };
  daily: { date: string; income: number; expense: number }[];
  monthly: { label: string; income: number; expense: number }[];
  weeklyCategories: { category: string; total: number; percentage: number }[];
  biweeklyCategories: { category: string; total: number; percentage: number }[];
  monthlyCategories: { category: string; total: number; percentage: number }[];
  quarterlyCategories: {
    category: string;
    total: number;
    percentage: number;
  }[];
  halfYearCategories: { category: string; total: number; percentage: number }[];
  yearlyCategories: { category: string; total: number; percentage: number }[];
  todayActivities: Transaction[];
}

const DASHBOARD_SUMMARY_TTL_MS = 30_000;
let dashboardSummaryCache: { data: DashboardSummary; at: number } | null = null;
// In-flight promise: while a fetch is running every concurrent caller shares it
// instead of firing a redundant request (thundering-herd guard).
let dashboardSummaryInflight: Promise<DashboardSummary> | null = null;

/** Fetch with credentials included */
async function apiFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message ?? 'Request failed');
  }
  return data;
}

/** Get all transactions, optionally filtered by type */
export async function getTransactions(
  type?: TransactionType,
  page = 1,
  limit = 50,
  date?: string,
): Promise<{ items: Transaction[]; total: number }> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (type) params.set('type', type);
  if (date) params.set('date', date);
  return apiFetch(`/transactions?${params}`);
}

/** Create a new transaction */
export async function createTransaction(
  payload: CreateTransactionPayload,
): Promise<Transaction> {
  return apiFetch('/transactions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Update an existing transaction */
export async function updateTransaction(
  id: string,
  payload: Partial<CreateTransactionPayload>,
): Promise<Transaction> {
  return apiFetch(`/transactions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/** Delete a transaction */
export async function deleteTransaction(id: string): Promise<void> {
  return apiFetch(`/transactions/${id}`, { method: 'DELETE' });
}

/** Get all dashboard data in one call */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  if (dashboardSummaryInflight) return dashboardSummaryInflight;

  dashboardSummaryInflight = apiFetch('/transactions/dashboard')
    .then((data: DashboardSummary) => {
      dashboardSummaryCache = { data, at: Date.now() };
      return data;
    })
    .finally(() => {
      dashboardSummaryInflight = null;
    });

  return dashboardSummaryInflight;
}

export function getDashboardSummaryFromCache(
  ttlMs = DASHBOARD_SUMMARY_TTL_MS,
): DashboardSummary | null {
  if (!dashboardSummaryCache) return null;
  if (Date.now() - dashboardSummaryCache.at > ttlMs) return null;
  return dashboardSummaryCache.data;
}

export function setDashboardSummaryCache(data: DashboardSummary): void {
  dashboardSummaryCache = { data, at: Date.now() };
}

export async function getDashboardSummaryCached(
  ttlMs = DASHBOARD_SUMMARY_TTL_MS,
): Promise<DashboardSummary> {
  const cached = getDashboardSummaryFromCache(ttlMs);
  if (cached) return cached;
  return getDashboardSummary();
}
