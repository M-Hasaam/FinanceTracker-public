'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useEffect, useState, useMemo } from 'react';

type RangeView = 'weekly' | 'biweekly' | 'monthly';

export interface WeeklyDataPoint {
  day: string;
  date?: string;
  income: number;
  expenses: number;
  savings?: number;
}

interface LineChartComponentProps {
  data?: WeeklyDataPoint[];
  width?: number | string;
  height?: number | string;
  className?: string;
  showGrid?: boolean;
  showTooltip?: boolean;
  showSavings?: boolean;
  margin?: { top: number; right: number; left: number; bottom: number };
  selectedRange?: RangeView;
  onRangeChange?: (range: RangeView) => void;
  showRangeSelector?: boolean;
}

const defaultData: WeeklyDataPoint[] = [
  { day: 'Mon', date: 'Mar 2', income: 1820, expenses: 520 },
  { day: 'Tue', date: 'Mar 3', income: 760, expenses: 470 },
  { day: 'Wed', date: 'Mar 4', income: 910, expenses: 610 },
  { day: 'Thu', date: 'Mar 5', income: 880, expenses: 590 },
  { day: 'Fri', date: 'Mar 6', income: 1030, expenses: 700 },
  { day: 'Sat', date: 'Mar 7', income: 960, expenses: 670 },
  { day: 'Sun', date: 'Mar 8', income: 990, expenses: 640 },
];

interface TooltipPayloadEntry {
  color: string;
  name: string;
  value: number;
  payload: WeeklyDataPoint;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const point = payload[0]?.payload as WeeklyDataPoint | undefined;
    const title =
      point?.date && point?.day ? `${point.day}, ${point.date}` : label;
    return (
      <div className="bg-background/95 backdrop-blur-sm rounded-lg border border-border p-3 shadow-lg">
        <p className="text-sm font-medium text-foreground mb-2">{title}</p>
        {payload.map((entry: TooltipPayloadEntry, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-foreground/60">{entry.name}:</span>
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

export default function LineChart({
  data = defaultData,
  width = '100%',
  height = '100%',
  className = '',
  showGrid = true,
  showTooltip = true,
  showSavings = false,
  margin = { top: 10, right: 20, left: 0, bottom: 8 },
  selectedRange: controlledRange,
  onRangeChange,
  showRangeSelector = true,
}: LineChartComponentProps) {
  const [internalRange, setInternalRange] = useState<RangeView>('weekly');

  // Use controlled state if provided, otherwise use internal state
  const selectedRange = controlledRange ?? internalRange;

  const handleRangeChange = (range: RangeView) => {
    if (onRangeChange) {
      onRangeChange(range);
    } else {
      setInternalRange(range);
    }
  };
  const [colors, setColors] = useState({
    income: '#22c55e',
    expenses: '#ef4444',
    savings: '#4A3AFF',
    grid: 'rgba(255, 255, 255, 0.06)',
    text: 'rgba(255, 255, 255, 0.5)',
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = getComputedStyle(document.documentElement);
      const incomeColor = root.getPropertyValue('--income').trim() || '#22c55e';
      const expensesColor =
        root.getPropertyValue('--expenses').trim() || '#ef4444';
      const savingsColor =
        root.getPropertyValue('--savings').trim() || '#4A3AFF';
      const borderColor =
        root.getPropertyValue('--border').trim() || 'rgba(255, 255, 255, 0.08)';
      const textColor =
        root.getPropertyValue('--foreground').trim() || '#ffffff';
      setColors({
        income: incomeColor,
        expenses: expensesColor,
        savings: savingsColor,
        grid: borderColor,
        text: textColor,
      });
    }
  }, []);

  const formatYAxis = (value: number) => {
    const absValue = Math.abs(value);

    if (absValue >= 1000000) {
      return `$${Math.round(value / 1000000)}M`;
    } else if (absValue >= 1000) {
      // For values 1000 and above, show whole k numbers
      return `$${Math.round(value / 1000)}k`;
    } else {
      // For values below 1000, show rounded whole number
      return `$${Math.round(value)}`;
    }
  };

  const chartData = useMemo(() => {
    const daysToShow =
      selectedRange === 'weekly' ? 7 : selectedRange === 'biweekly' ? 14 : 30;

    const slice = data.slice(-daysToShow);
    return slice.map((point) => ({
      ...point,
      label: selectedRange === 'weekly' ? point.day : (point.date ?? point.day),
    }));
  }, [data, selectedRange]);

  // Calculate domain for Y-axis with proper rounded values
  // Calculate domain for Y-axis with proper rounded values based on selected range
  const yAxisDomain = useMemo(() => {
    if (chartData.length > 0) {
      const allValues = chartData.flatMap((d) => {
        const values = [d.income, d.expenses];
        if (showSavings && d.savings !== undefined) {
          values.push(d.savings);
        }
        return values;
      });

      const minValue = Math.min(...allValues, 0);
      const maxValue = Math.max(...allValues, 0);
      const dataRange = maxValue - minValue;

      // Adjust step size based on selected range for better visualization
      let stepSize;
      if (selectedRange === 'weekly') {
        // For weekly data, use smaller steps
        if (dataRange <= 500) stepSize = 100;
        else if (dataRange <= 1000) stepSize = 200;
        else stepSize = 500;
      } else if (selectedRange === 'biweekly') {
        // For biweekly data, medium steps
        if (dataRange <= 1000) stepSize = 200;
        else if (dataRange <= 2000) stepSize = 500;
        else stepSize = 1000;
      } else {
        // For monthly data, larger steps
        if (dataRange <= 2000) stepSize = 500;
        else if (dataRange <= 5000) stepSize = 1000;
        else stepSize = 2000;
      }

      // Round min down and max up to nearest step
      const niceMin = Math.floor(minValue / stepSize) * stepSize;
      const niceMax = Math.ceil(maxValue / stepSize) * stepSize;

      // Add a little padding at the top (10%)
      const padding = niceMax * 0.1;
      return [niceMin, niceMax + padding];
    }
    return [0, 1000];
  }, [chartData, showSavings, selectedRange]);

  const yAxisWidth = useMemo(() => {
    if (chartData.length > 0) {
      const allValues = chartData.flatMap((d) => {
        const values = [d.income, d.expenses];
        if (showSavings && d.savings !== undefined) {
          values.push(d.savings);
        }
        return values;
      });
      const formattedValues = allValues.map((v) => formatYAxis(v));
      const longestValue = formattedValues.reduce(
        (longest, current) =>
          current.length > longest.length ? current : longest,
        '',
      );
      return Math.min(55, Math.max(35, longestValue.length * 7 + 5));
    }
    return 40;
  }, [chartData, showSavings]);

  const getButtonClass = (option: RangeView) =>
    selectedRange === option
      ? 'text-foreground bg-card shadow-sm'
      : 'text-foreground/50';

  return (
    <div
      className={`bg-card hover:bg-card/80 transition-colors rounded-xl border border-border shadow-sm flex flex-col ${className}`}
      style={{ width, height }}
    >
      <div className="px-4 pt-3 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-foreground/90">
          Statistics
        </h3>
        {showRangeSelector ? (
          <div className="inline-flex items-center gap-0.5 rounded-lg bg-background p-0.5">
            <button
              onClick={() => handleRangeChange('weekly')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md hover:text-foreground cursor-pointer ${getButtonClass('weekly')}`}
            >
              Weekly
            </button>
            <button
              onClick={() => handleRangeChange('biweekly')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md hover:text-foreground cursor-pointer ${getButtonClass('biweekly')}`}
            >
              Biweekly
            </button>
            <button
              onClick={() => handleRangeChange('monthly')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md hover:text-foreground cursor-pointer ${getButtonClass('monthly')}`}
            >
              Monthly
            </button>
          </div>
        ) : (
          <span className="rounded-lg bg-background px-3 py-1 text-xs font-medium text-foreground/50">
            Week
          </span>
        )}
      </div>

      <div className="flex-1 min-h-0 px-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={margin}>
            <defs>
              <linearGradient
                id="weekIncomeGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={colors.income} stopOpacity={0.4} />
                <stop
                  offset="100%"
                  stopColor={colors.income}
                  stopOpacity={0.05}
                />
              </linearGradient>
              <linearGradient
                id="weekExpenseGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={colors.expenses}
                  stopOpacity={0.3}
                />
                <stop
                  offset="100%"
                  stopColor={colors.expenses}
                  stopOpacity={0.03}
                />
              </linearGradient>
              {showSavings && (
                <linearGradient
                  id="weekSavingsGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor={colors.savings}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="100%"
                    stopColor={colors.savings}
                    stopOpacity={0.03}
                  />
                </linearGradient>
              )}
            </defs>

            {showGrid && (
              <CartesianGrid
                stroke={colors.grid}
                strokeDasharray="4 4"
                vertical={false}
              />
            )}

            <XAxis
              dataKey="label"
              stroke={colors.text}
              strokeOpacity={0.5}
              tickLine={false}
              axisLine={{ stroke: colors.grid }}
              height={22}
              tickMargin={4}
              tick={{
                fill: colors.text,
                fillOpacity: 0.6,
                fontSize: 12,
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              }}
            />

            <YAxis
              stroke={colors.text}
              strokeOpacity={0.5}
              tickLine={false}
              axisLine={{ stroke: colors.grid }}
              tickFormatter={formatYAxis}
              width={yAxisWidth - 10}
              tickMargin={1}
              tick={{ fill: colors.text, fillOpacity: 0.6, fontSize: 11 }}
              domain={yAxisDomain}
            />

            {showSavings && (
              <ReferenceLine
                y={0}
                stroke={colors.text}
                strokeOpacity={0.8}
                strokeWidth={1.5}
                strokeDasharray="3 3"
                ifOverflow="extendDomain"
              />
            )}

            {showTooltip && (
              <Tooltip
                content={<CustomTooltip />}
                cursor={{
                  stroke: colors.text,
                  strokeOpacity: 0.2,
                  strokeWidth: 1,
                  strokeDasharray: '4 4',
                }}
              />
            )}

            <Area
              type="monotone"
              dataKey="income"
              stroke={colors.income}
              strokeWidth={2.5}
              fill="url(#weekIncomeGradient)"
              // isAnimationActive={false}
              name="Income"
              activeDot={{
                r: 6,
                stroke: colors.income,
                strokeWidth: 2,
                fill: 'var(--background, #141332)',
              }}
              dot={false}
            />

            <Area
              type="monotone"
              dataKey="expenses"
              stroke={colors.expenses}
              strokeWidth={2.5}
              fill="url(#weekExpenseGradient)"
              // isAnimationActive={false}
              name="Expenses"
              activeDot={{
                r: 6,
                stroke: colors.expenses,
                strokeWidth: 2,
                fill: 'var(--background, #141332)',
              }}
              dot={false}
            />

            {showSavings && (
              <Area
                type="monotone"
                dataKey="savings"
                stroke={colors.savings}
                strokeWidth={2.5}
                fill="url(#weekSavingsGradient)"
                name="Savings"
                activeDot={{
                  r: 6,
                  stroke: colors.savings,
                  strokeWidth: 2,
                  fill: 'var(--background, #141332)',
                }}
                dot={false}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
