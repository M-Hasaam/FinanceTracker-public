'use client';

import { useEffect, useState } from 'react';
import {
  getDashboardSummaryCached,
  type DashboardSummary,
  type Transaction,
} from '@/features/dashboard/services/transactions-api';
import TransactionsList, {
  type TransactionItem,
} from '../widgets/TransactionsList';
import PieChart, { type PieDataPoint } from '../widgets/PieChart';

interface WeeklyCategoryPoint {
  category: string;
  total: number;
  percentage: number;
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

export default function DashboardContent() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboardSummaryCached()
      .then(setData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const weeklyPieData = toPieData(data?.weeklyCategories ?? []);

  const handleDelete = (_id: string) => {};
  const handleEdit = (_id: string) => {};

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

  const rem =
    typeof window !== 'undefined'
      ? parseFloat(getComputedStyle(document.documentElement).fontSize)
      : 16;

  return (
    <>
      <div className="grid gap-6 min-h-full max-h-full  grid-cols-1 xl:grid-cols-[1fr_minmax(18.75rem,23.75rem)] grid-rows-[1fr]">
        <div className="min-w-75 max-h-full min-h-0 order-2 xl:order-1">
          <TransactionsList
            variant="recent"
            items={data.todayActivities.map(toTransactionItem)}
            onDelete={handleDelete}
            onEdit={handleEdit}
            className="h-full"
          />
        </div>

        <div className="h-80 xl:h-auto xl:min-h-75 order-1 xl:order-2">
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
