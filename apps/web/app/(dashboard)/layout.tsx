'use client';

import type { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/common/hooks/useAuth';
import {
  getDashboardSummaryCached,
  type DashboardSummary,
} from '@/features/dashboard/services/transactions-api';
import DashboardSidebar from '@/features/dashboard/components/DashboardSidebar';
import TotalCard from '@/features/dashboard/widgets/TotalCard';
import LineChart, {
  type WeeklyDataPoint,
} from '@/features/dashboard/widgets/LineChart';

type NavItem = 'dashboard' | 'income' | 'expenses' | 'analytics' | 'assistant';
type AnalyticsRange = 'weekly' | 'biweekly' | 'monthly';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function computeWeeklyTotals(daily: DashboardSummary['daily']) {
  return daily.reduce(
    (acc, d) => ({
      income: acc.income + d.income,
      expense: acc.expense + d.expense,
    }),
    { income: 0, expense: 0 },
  );
}

function computeRangeTotals(
  daily: DashboardSummary['daily'],
  range: AnalyticsRange,
) {
  const days = range === 'weekly' ? 7 : range === 'biweekly' ? 14 : 30;
  return daily.slice(-days).reduce(
    (acc, d) => ({
      income: acc.income + d.income,
      expense: acc.expense + d.expense,
    }),
    { income: 0, expense: 0 },
  );
}

function toDailyChartData(daily: DashboardSummary['daily']): WeeklyDataPoint[] {
  return daily.map((d) => {
    const dateObj = new Date(d.date);
    const dayLabel = DAY_LABELS[dateObj.getDay()] ?? d.date;
    const dateLabel = !Number.isNaN(dateObj.getTime())
      ? dateObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
      : d.date;
    return {
      day: dayLabel,
      date: dateLabel,
      income: d.income,
      expenses: d.expense,
      savings: d.income - d.expense,
    };
  });
}

const ROUTE_CONFIG: Record<string, { navItem: NavItem; title: string }> = {
  '/': { navItem: 'dashboard', title: 'Dashboard' },
  '/income': { navItem: 'income', title: 'Income' },
  '/expense': { navItem: 'expenses', title: 'Expenses' },
  '/analytics': { navItem: 'analytics', title: 'Analytics' },
  '/assistant': { navItem: 'assistant', title: 'Assistant' },
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();

  const [data, setData] = useState<DashboardSummary | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [analyticsRange, setAnalyticsRange] =
    useState<AnalyticsRange>('weekly');

  const routeConfig = ROUTE_CONFIG[pathname] ?? {
    navItem: 'dashboard' as NavItem,
    title: 'Dashboard',
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    getDashboardSummaryCached()
      .then(setData)
      .catch(console.error)
      .finally(() => setDataLoading(false));
  }, [user]);

  useEffect(() => {
    const handler = (e: Event) => {
      const summary = (e as CustomEvent).detail as DashboardSummary;
      setData(summary);
    };
    window.addEventListener('dashboard:updated', handler);
    return () => window.removeEventListener('dashboard:updated', handler);
  }, []);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-foreground/50 text-sm">Loading…</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 md:hidden cursor-pointer"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <DashboardSidebar
        activeItem={routeConfig.navItem}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
      />

      <main className="flex-1 flex flex-col min-w-0 min-h-full xl:max-h-screen overflow-y-auto">
        <div className="flex items-center gap-3 px-4 py-3 md:hidden bg-card">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-foreground/70 hover:text-foreground transition-colors p-1 cursor-pointer"
            aria-label="Open menu"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="text-foreground font-semibold text-lg">
            {routeConfig.title}
          </span>
        </div>

        <div className="pl-3 md:pl-6 pr-3 pt-3">
          {dataLoading ? (
            <div className="h-64 flex items-center justify-center">
              <p className="text-foreground/50 text-sm">Loading dashboard…</p>
            </div>
          ) : routeConfig.navItem === 'dashboard' ? (
            <div className="grid gap-6 grid-cols-1 xl:grid-cols-[fit-content(42rem)_minmax(0,1fr)] mb-6">
              <div className="flex flex-col justify-between gap-4 w-full ">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
                    Welcome Back, {user.name ?? 'User'} 👋
                  </h1>
                  <p className="text-foreground/50 text-sm mt-1">
                    Here&apos;s what&apos;s happening with your store today.
                  </p>
                </div>
                <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                  <TotalCard
                    type="income"
                    value={`$ ${computeWeeklyTotals(data?.daily ?? []).income.toFixed(0)}`}
                    label="This Week's Income"
                  />
                  <TotalCard
                    type="expense"
                    value={`$ ${computeWeeklyTotals(data?.daily ?? []).expense.toFixed(0)}`}
                    label="This Week's Expenses"
                  />
                </div>
              </div>
              <div className="min-w-0 w-full h-60">
                <LineChart
                  data={data ? toDailyChartData(data.daily) : undefined}
                  className="w-full h-full"
                  showSavings={false}
                  showRangeSelector={false}
                  selectedRange="weekly"
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 xl:grid-cols-[minmax(280px,320px)_minmax(0,1fr)] mb-6">
              <div className="flex flex-col gap-4">
                {routeConfig.navItem === 'analytics' ? (
                  <>
                    {['income', 'expense', 'savings'].map((type) => {
                      const totals = computeRangeTotals(
                        data?.daily ?? [],
                        analyticsRange,
                      );
                      const value =
                        type === 'income'
                          ? totals.income
                          : type === 'expense'
                            ? totals.expense
                            : totals.income - totals.expense;
                      return (
                        <TotalCard
                          key={type}
                          type={type as any}
                          value={`$ ${value.toFixed(0)}`}
                          label={
                            analyticsRange === 'weekly'
                              ? 'Last 7 Days'
                              : analyticsRange === 'biweekly'
                                ? 'Last 14 Days'
                                : 'Last 30 Days'
                          }
                          className="h-24"
                          valueClassName="text-xs sm:text-sm md:text-base"
                        />
                      );
                    })}
                  </>
                ) : (
                  <>
                    <TotalCard
                      type="income"
                      value={`$ ${(data?.totals.totalIncome ?? 0).toFixed(0)}`}
                      className="flex-1"
                    />
                    <TotalCard
                      type="expense"
                      value={`$ ${(data?.totals.totalExpense ?? 0).toFixed(0)}`}
                      className="flex-1"
                    />
                  </>
                )}
              </div>
              <div className="min-w-0 w-full min-h-60 h-full">
                <LineChart
                  data={data ? toDailyChartData(data.daily) : undefined}
                  className="w-full h-full"
                  showSavings={routeConfig.navItem === 'analytics'}
                  showRangeSelector={routeConfig.navItem === 'analytics'}
                  selectedRange={
                    routeConfig.navItem === 'analytics'
                      ? analyticsRange
                      : 'weekly'
                  }
                  onRangeChange={setAnalyticsRange}
                />
              </div>
            </div>
          )}
        </div>

        <div
          className={`pl-3 md:pl-6 pr-3 pb-3 space-y-6 flex-1  ${
            routeConfig.navItem !== 'analytics' ? 'lg:max-h-screen' : ''
          }`}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
