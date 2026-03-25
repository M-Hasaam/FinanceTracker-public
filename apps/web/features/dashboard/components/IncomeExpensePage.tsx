'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  createTransaction,
  deleteTransaction,
  getDashboardSummary,
  getDashboardSummaryCached,
  getTransactions,
  setDashboardSummaryCache,
  updateTransaction,
  type DashboardSummary,
  type Transaction,
  type TransactionType,
} from '@/features/dashboard/services/transactions-api';
import TransactionsList, {
  type TransactionItem,
} from '../widgets/TransactionsList';
import IncomeExpenseForm from './IncomeExpenseForm';
import { Calendar } from '@repo/ui/components/ui/calendar';
import { CalenderIcon } from '@/common/icons';

interface IncomeExpensePageProps {
  type: TransactionType;
}

const DATE_FETCH_LIMIT = 200;

function formatDatetime(dateStr: string): string {
  const date = new Date(dateStr);
  const time = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const dateFormatted = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${time} - ${dateFormatted}`;
}

function toTransactionItem(tx: Transaction): TransactionItem {
  return {
    id: tx.id,
    activity: tx.description?.trim() ? tx.description : tx.category.name,
    category: tx.category.name,
    datetime: formatDatetime(tx.date),
    amount: Number(tx.amount),
    type: tx.type,
  };
}

function toDateKey(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function IncomeExpensePage({ type }: IncomeExpensePageProps) {
  const isIncome = type === 'INCOME';

  const [items, setItems] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement | null>(null);

  const loadPageData = async () => {
    try {
      setError(null);
      setLoading(true);
      const summaryRes = await getDashboardSummaryCached();
      setSummary(summaryRes);
      const todayItems = summaryRes.todayActivities.filter(
        (tx) => tx.type === type,
      );
      setItems(todayItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPageData();
  }, [type]);

  useEffect(() => {
    if (!summary) return;
    const selectedKey = toDateKey(selectedDate);
    const todayKey = toDateKey(new Date());
    if (selectedKey === todayKey) {
      setItems(summary.todayActivities.filter((tx) => tx.type === type));
      return;
    }
    let active = true;
    getTransactions(type, 1, DATE_FETCH_LIMIT, selectedKey)
      .then((res) => {
        if (!active) return;
        setItems(res.items);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load transactions for date',
        );
      });
    return () => {
      active = false;
    };
  }, [selectedDate, summary, type]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!calendarRef.current) return;
      if (calendarRef.current.contains(event.target as Node)) return;
      setCalendarOpen(false);
    };
    if (calendarOpen)
      document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [calendarOpen]);

  const resetForm = () => {
    setAmount('');
    setDate(new Date().toISOString().slice(0, 10));
    setCategory('');
    setCustomCategory('');
    setDescription('');
    setEditId(null);
    setFormError(null);
  };

  const startEdit = (tx: Transaction) => {
    setEditId(tx.id);
    setAmount(String(tx.amount));
    setDate(tx.date.slice(0, 10));
    setCategory(tx.category.name);
    setCustomCategory('');
    setDescription(tx.description ?? '');
    setFormError(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!amount || Number.isNaN(Number(amount))) {
      setFormError('Please enter a valid amount.');
      return;
    }
    if (!category.trim()) {
      setFormError('Please select a category.');
      return;
    }
    const resolvedCategory =
      category === 'Other' ? customCategory.trim() : category.trim();
    if (!resolvedCategory) {
      setFormError(
        `Please enter a new ${isIncome ? 'source' : 'category'} name.`,
      );
      return;
    }
    setSubmitting(true);
    setFormError(null);
    const payload = {
      amount: Number(amount),
      type,
      date,
      category: resolvedCategory,
      description: description.trim() || undefined,
    };
    try {
      if (editId) {
        await updateTransaction(editId, payload);
      } else {
        await createTransaction(payload);
      }
      resetForm();
      const refreshedSummary = await getDashboardSummary();
      setDashboardSummaryCache(refreshedSummary);
      setSummary(refreshedSummary);
      window.dispatchEvent(
        new CustomEvent('dashboard:updated', { detail: refreshedSummary }),
      );
      const selectedKey = toDateKey(selectedDate);
      const todayKey = toDateKey(new Date());
      if (selectedKey === todayKey) {
        setItems(
          refreshedSummary.todayActivities.filter((tx) => tx.type === type),
        );
      } else {
        const res = await getTransactions(
          type,
          1,
          DATE_FETCH_LIMIT,
          selectedKey,
        );
        setItems(res.items);
      }
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to save transaction',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const kind = isIncome ? 'income' : 'expense';
    if (!confirm(`Delete this ${kind} entry?`)) return;
    try {
      await deleteTransaction(id);
      const refreshedSummary = await getDashboardSummary();
      setDashboardSummaryCache(refreshedSummary);
      setSummary(refreshedSummary);
      window.dispatchEvent(
        new CustomEvent('dashboard:updated', { detail: refreshedSummary }),
      );
      const selectedKey = toDateKey(selectedDate);
      const todayKey = toDateKey(new Date());
      if (selectedKey === todayKey) {
        setItems(
          refreshedSummary.todayActivities.filter((tx) => tx.type === type),
        );
      } else {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const mappedItems = useMemo(() => items.map(toTransactionItem), [items]);

  const categoryOptions = useMemo(() => {
    const values = new Set<string>();
    items.forEach((tx) => values.add(tx.category.name));
    if (isIncome) {
      ['Salary', 'Freelance', 'Investment', 'Bonus', 'Other'].forEach((name) =>
        values.add(name),
      );
    } else {
      [
        'Food',
        'Shopping',
        'Transportation',
        'Bills',
        'Entertainment',
        'Other',
      ].forEach((name) => values.add(name));
    }
    return Array.from(values);
  }, [items, isIncome]);

  const selectedDateLabel = selectedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-foreground/60">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className=" h-full grid gap-6 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
      <section className="min-h-105 h-full order-2 xl:order-1">
        <TransactionsList
          variant={isIncome ? 'income' : 'expense'}
          title={isIncome ? 'Incomes' : 'Expenses'}
          headerContent={
            <div ref={calendarRef} className="relative">
              <button
                type="button"
                onClick={() => setCalendarOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-foreground/5 px-3 py-1.5 text-xs text-foreground/85 hover:bg-foreground/10 transition-colors cursor-pointer"
              >
                <CalenderIcon className="size-3.5 text-foreground/70" />
                {selectedDateLabel}
              </button>
              {calendarOpen && (
                <div className="absolute right-0 z-30 mt-2 rounded-xl border border-border bg-card p-2 shadow-xl">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(dateValue) => {
                      if (!dateValue) return;
                      setSelectedDate(dateValue);
                      setCalendarOpen(false);
                    }}
                    className="text-foreground"
                  />
                </div>
              )}
            </div>
          }
          items={mappedItems}
          onDelete={handleDelete}
          onEdit={(id) => {
            const tx = items.find((item) => item.id === id);
            if (tx) startEdit(tx);
          }}
          className="h-full"
        />
      </section>

      <section className="min-h-105 h-full order-1 xl:order-2">
        <IncomeExpenseForm
          type={type}
          amount={amount}
          category={category}
          customCategory={customCategory}
          description={description}
          submitting={submitting}
          isEditing={Boolean(editId)}
          error={formError}
          categoryOptions={categoryOptions}
          onAmountChange={setAmount}
          onCategoryChange={setCategory}
          onCustomCategoryChange={setCustomCategory}
          onDescriptionChange={setDescription}
          onSubmit={handleSubmit}
          onCancelEdit={editId ? resetForm : undefined}
          className="h-full"
        />
      </section>
    </div>
  );
}
