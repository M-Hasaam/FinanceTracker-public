'use client';

import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useEffect, useState, useMemo } from 'react';

export interface MonthlyDataPoint {
  month: string;
  year?: string;
  income: number;
  expenses: number;
}

interface BarChartComponentProps {
  data?: MonthlyDataPoint[];
  width?: number | string;
  height?: number | string;
  className?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  margin?: { top: number; right: number; left: number; bottom: number };
  barSize?: number;
  gap?: number;
}

const defaultData: MonthlyDataPoint[] = [
  { month: 'Jan', year: '2026', income: 42500, expenses: 31200 },
  { month: 'Feb', year: '2026', income: 38900, expenses: 29800 },
  { month: 'Mar', year: '2026', income: 45600, expenses: 33500 },
  { month: 'Apr', year: '2026', income: 47800, expenses: 34100 },
  { month: 'May', year: '2026', income: 51200, expenses: 36700 },
  { month: 'Jun', year: '2026', income: 49800, expenses: 35900 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const point = payload[0]?.payload as MonthlyDataPoint | undefined;
    const title = point?.year ? `${label} ${point.year}` : label;
    return (
      <div className="bg-background/95 backdrop-blur-sm rounded-lg border border-border p-3 shadow-lg">
        <p className="text-sm font-medium text-foreground mb-2">{title}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium text-foreground">
              ${entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function BarChart({
  data = defaultData,
  width = '100%',
  height = '100%',
  className = '',
  showLegend = true,
  showGrid = true,
  showTooltip = true,
  margin = { top: 20, right: 10, left: 0, bottom: 20 },
  barSize,
  gap,
}: BarChartComponentProps) {
  const [colors, setColors] = useState({
    income: '#22c55e',
    expenses: '#ef4444',
    grid: 'rgba(255, 255, 255, 0.6)',
    text: 'rgba(255, 255, 255, 0.5)',
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = getComputedStyle(document.documentElement);
      const incomeColor =
        root.getPropertyValue('--income-2').trim() || '#22c55e';
      const expensesColor =
        root.getPropertyValue('--expenses-2').trim() || '#ef4444';
      const borderColor =
        root.getPropertyValue('--border').trim() || 'rgba(255, 255, 255, 0.08)';
      const textColor =
        root.getPropertyValue('--foreground').trim() || '#ffffff';
      setColors({
        income: incomeColor,
        expenses: expensesColor,
        grid: borderColor,
        text: textColor,
      });
    }
  }, []);

  const formatYAxis = (value: number) => {
    if (value >= 1000) return `$${value / 1000}k`;
    return `$${value}`;
  };

  const yAxisWidth = useMemo(() => {
    if (data && data.length > 0) {
      const allValues = data.flatMap((d) => [d.income, d.expenses]);
      const formattedValues = allValues.map((v) => formatYAxis(v));
      const longestValue = formattedValues.reduce(
        (longest, current) =>
          current.length > longest.length ? current : longest,
        '',
      );
      return Math.min(55, Math.max(35, longestValue.length * 7 + 5));
    }
    return 40;
  }, [data]);

  const pointCount = data?.length ?? 0;
  const dynamicGap = useMemo(() => {
    if (typeof gap === 'number') return gap;
    if (pointCount <= 6) return 2;
    if (pointCount <= 12) return 1;
    if (pointCount <= 18) return 1;
    return 1;
  }, [gap, pointCount]);

  const categoryGap = useMemo(() => {
    if (pointCount <= 6) return '6%';
    if (pointCount <= 12) return '10%';
    if (pointCount <= 18) return '14%';
    return '18%';
  }, [pointCount]);

  const barChartSizeProps = useMemo(
    () => (typeof barSize === 'number' ? { barSize } : {}),
    [barSize],
  );

  return (
    <div
      className={`bg-card hover:bg-card/80 transition-colors rounded-xl border border-border shadow-sm flex flex-col ${className}`}
      style={{ width, height }}
    >
      <div className="px-5 pt-4 flex items-center justify-between gap-3">
        <p className="text-foreground text-base font-semibold">Analytics</p>
        {showLegend && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: colors.income }}
              />
              <span className="text-foreground/70">Income</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: colors.expenses }}
              />
              <span className="text-foreground/70">Expenses</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 px-2  ">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart
            data={data}
            margin={margin}
            barGap={dynamicGap}
            barCategoryGap={categoryGap}
            {...barChartSizeProps}
          >
            {showGrid && (
              <CartesianGrid
                stroke={colors.grid}
                strokeDasharray="3 3"
                vertical={false}
              />
            )}
            <XAxis
              dataKey="month"
              stroke={colors.text}
              strokeOpacity={0.5}
              tickLine={false}
              axisLine={{ stroke: colors.grid }}
              height={12}
              tickMargin={4}
              tick={{ fill: colors.text, fillOpacity: 0.6, fontSize: 11 }}
            />

            <YAxis
              stroke={colors.text}
              strokeOpacity={0.5}
              tickLine={false}
              axisLine={{ stroke: colors.grid }}
              tickFormatter={formatYAxis}
              width={yAxisWidth - 20}
              tickMargin={1}
              tick={{ fill: colors.text, fillOpacity: 0.6, fontSize: 11 }}
            />
            {showTooltip && (
              <Tooltip
                content={<CustomTooltip />}
                cursor={{
                  fill: colors.grid,
                  stroke: colors.text,
                  strokeOpacity: 0.1,
                }}
              />
            )}
            <Bar
              dataKey="income"
              fill={colors.income}
              name="Income"
              radius={[10, 10, 0, 0]}
              maxBarSize={40}
              isAnimationActive
              animationDuration={2000}
            />
            <Bar
              dataKey="expenses"
              fill={colors.expenses}
              name="Expenses"
              radius={[10, 10, 0, 0]}
              maxBarSize={40}
              isAnimationActive
              animationDuration={2000}
            />
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
