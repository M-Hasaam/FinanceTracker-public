'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getDashboardSummaryCached,
  getTransactions,
  type DashboardSummary,
  type Transaction,
} from '@/features/dashboard/services/transactions-api';
import BarChart, { type MonthlyDataPoint } from '../widgets/BarChart';
import TransactionsList, {
  type TransactionItem,
} from '../widgets/TransactionsList';
import PieChart, { type PieDataPoint } from '../widgets/PieChart';
import { Calendar } from '@repo/ui/components/ui/calendar';
import { CalenderIcon } from '@/common/icons';

interface WeeklyCategoryPoint {
  category: string;
  total: number;
  percentage: number;
}

interface MonthlyApiPoint {
  label: string;
  income: number;
  expense: number;
}

function toTransactionItem(tx: Transaction): TransactionItem {
  const date = new Date(tx.date);
  const time = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const dateFormatted = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return {
    id: tx.id,
    activity: tx.description ?? tx.category.name,
    category: tx.category.name,
    datetime: `${time} - ${dateFormatted}`,
    amount: Number(tx.amount),
    type: tx.type,
  };
}

function toPieData(weeklyCategories: WeeklyCategoryPoint[]): PieDataPoint[] {
  const threshold = 1;
  const main: PieDataPoint[] = [];
  let otherTotal = 0;
  for (const c of weeklyCategories) {
    if (c.percentage <= threshold) {
      otherTotal += c.percentage;
    } else {
      main.push({ name: c.category, percentage: c.percentage });
    }
  }
  if (otherTotal > 0)
    main.push({ name: 'Other', percentage: Number(otherTotal.toFixed(2)) });
  return main;
}

function toMonthlyChartData(monthly: MonthlyApiPoint[]): MonthlyDataPoint[] {
  const parseMonthYear = (label: string): { month: string; year: string } => {
    const parsed = new Date(label);
    if (!Number.isNaN(parsed.getTime())) {
      return {
        month: parsed.toLocaleString('en-US', { month: 'short' }),
        year: String(parsed.getFullYear()),
      };
    }
    const parts = label.trim().split(/\s+/);
    const maybeYear = parts[parts.length - 1] ?? '';
    return {
      month: label.length >= 3 ? label.slice(0, 3) : label,
      year: /^\d{4}$/.test(maybeYear) ? maybeYear : '',
    };
  };
  return monthly.map((m) => ({
    ...parseMonthYear(m.label),
    income: m.income,
    expenses: m.expense,
  }));
}

function toDateKey(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const DATE_FETCH_LIMIT = 200;

export default function AnalyticalContent() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [txItems, setTxItems] = useState<Transaction[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    getDashboardSummaryCached()
      .then((d) => {
        setData(d);
        setTxItems(d.todayActivities);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Reload transactions when selected date changes
  useEffect(() => {
    if (!data) return;
    const selectedKey = toDateKey(selectedDate);
    const todayKey = toDateKey(new Date());
    if (selectedKey === todayKey) {
      setTxItems(data.todayActivities);
      return;
    }
    let active = true;
    setLoading(true);
    getTransactions(undefined, 1, DATE_FETCH_LIMIT, selectedKey)
      .then((res) => {
        if (active) {
          setTxItems(res.items);
        }
      })
      .catch((err: Error) => {
        if (!active) return;
        setError(err.message);
        setTxItems([]);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [selectedDate, data]);

  // Close calendar on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (!calendarRef.current?.contains(e.target as Node))
        setCalendarOpen(false);
    };
    if (calendarOpen) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [calendarOpen]);

  const weeklyPieData = toPieData(data?.weeklyCategories ?? []);
  const biweeklyPieData = toPieData(data?.biweeklyCategories ?? []);
  const monthlyPieData = toPieData(data?.monthlyCategories ?? []);
  const quarterlyPieData = toPieData(data?.quarterlyCategories ?? []);
  const halfYearPieData = toPieData(data?.halfYearCategories ?? []);
  const yearlyPieData = toPieData(data?.yearlyCategories ?? []);

  const mappedItems = useMemo(() => txItems.map(toTransactionItem), [txItems]);
  const selectedDateLabel = selectedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-foreground/50 text-sm">Loading dashboard…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive text-sm">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <>
      {/* Monthly chart */}
      <div className="w-full h-70 md:h-80">
        <BarChart
          data={toMonthlyChartData(data.monthly)}
          className="w-full h-full"
        />
      </div>

      <div className="grid gap-6 h-screen max-h-screen grid-cols-1 xl:grid-cols-[1fr_minmax(18.75rem,23.75rem)] grid-rows-[1fr] min-h-0">
        {/* Add min-h-0 to both grid items */}
        <div className="min-w-75 h-full min-h-0 order-2 xl:order-1">
          <TransactionsList
            variant="recent"
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
                      onSelect={(d) => {
                        if (!d) return;
                        setSelectedDate(d);
                        setCalendarOpen(false);
                      }}
                      className="text-foreground"
                    />
                  </div>
                )}
              </div>
            }
            items={mappedItems}
            onDelete={() => {}}
            onEdit={() => {}}
            className="h-full min-h-0"
          />
        </div>

        <div className="h-80 xl:h-auto xl:min-h-75 min-h-0 order-1 xl:order-2">
          <PieChart
            data={weeklyPieData}
            outerRadius="90%"
            innerRadius="50%"
            showRangeSelector={false}
            className="w-full h-full"
          />
        </div>
      </div>
    </>
  );
}
