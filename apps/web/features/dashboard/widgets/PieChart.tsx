'use client';

import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { useEffect, useState, useMemo, useRef } from 'react';
import { ChevronDownIcon, ChevronLeftIcon } from '../../../common/icons';

type RangeView =
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'halfYear'
  | 'yearly';

export interface PieDataPoint {
  name: string;
  percentage: number;
}

interface CustomPieChartProps {
  data?: PieDataPoint[];
  biweeklyData?: PieDataPoint[];
  monthlyData?: PieDataPoint[];
  quarterlyData?: PieDataPoint[];
  halfYearData?: PieDataPoint[];
  yearlyData?: PieDataPoint[];
  width?: number | string;
  height?: number | string;
  className?: string;
  innerRadius?: number | string;
  outerRadius?: number | string;
  paddingAngle?: number;
  showTooltip?: boolean;
  showRangeSelector?: boolean;
}

const defaultData: PieDataPoint[] = [
  { name: 'Category A', percentage: 35 },
  { name: 'Category B', percentage: 25 },
  { name: 'Category C', percentage: 20 },
  { name: 'Category D', percentage: 12 },
  { name: 'Category E', percentage: 8 },
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/95 backdrop-blur-sm rounded-lg border border-border p-3 shadow-lg">
        <p className="text-sm text-foreground">
          <span className="font-medium">{payload[0].name}:</span>{' '}
          {payload[0].value}%
        </p>
      </div>
    );
  }
  return null;
};

function PerfectSquare({
  className = '',
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(0);

  useEffect(() => {
    const updateSize = () => {
      if (ref.current?.parentElement) {
        const { width, height } =
          ref.current.parentElement.getBoundingClientRect();
        setSize(Math.min(width, height)); // ⚡ maximum square
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return (
    <div
      ref={ref}
      className={`mx-auto ${className}`}
      style={{
        width: size,
        height: size,
      }}
    >
      {children}
    </div>
  );
}

export default function PieChart({
  data = defaultData,
  biweeklyData = [],
  monthlyData = [],
  quarterlyData = [],
  halfYearData = [],
  yearlyData = [],
  width = '100%',
  height = '100%',
  className = '',
  innerRadius = 0,
  outerRadius = 80,
  paddingAngle = 0,
  showTooltip = true,
  showRangeSelector = true,
}: CustomPieChartProps) {
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [selectedRange, setSelectedRange] = useState<RangeView>('weekly');
  const [rangeMenuOpen, setRangeMenuOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [colors, setColors] = useState({
    primary: '#4A3AFF',
    light: '#E5EAFC',
    text: 'rgba(255, 255, 255, 0.8)',
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = getComputedStyle(document.documentElement);
      setColors({
        primary: root.getPropertyValue('--chart-primary').trim() || '#4A3AFF',
        light: root.getPropertyValue('--chart-light').trim() || '#E5EAFC',
        text: root.getPropertyValue('--foreground').trim() || '#ffffff',
      });
    }
  }, []);

  useEffect(() => {
    if (!bodyRef.current) return;
    const element = bodyRef.current;

    const update = () => {
      const rect = element.getBoundingClientRect();
      setIsPortrait(rect.height > rect.width);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    window.addEventListener('resize', update);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  const activeData = useMemo(() => {
    switch (selectedRange) {
      case 'biweekly':
        return biweeklyData;
      case 'monthly':
        return monthlyData;
      case 'quarterly':
        return quarterlyData;
      case 'halfYear':
        return halfYearData;
      case 'yearly':
        return yearlyData;
      default:
        return data;
    }
  }, [
    selectedRange,
    data,
    biweeklyData,
    monthlyData,
    quarterlyData,
    halfYearData,
    yearlyData,
  ]);

  const sortedData = useMemo(
    () => [...activeData].sort((a, b) => b.percentage - a.percentage),
    [activeData],
  );

  const getSliceColor = (percentage: number) => {
    const maxPercentage = sortedData[0]?.percentage || 100;
    const minPercentage = sortedData[sortedData.length - 1]?.percentage || 0;
    const ratio =
      (percentage - minPercentage) / (maxPercentage - minPercentage || 1);

    const parseHex = (hex: string) => ({
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
    });

    const primaryRgb = parseHex(colors.primary);
    const lightRgb = parseHex(colors.light);

    const r = Math.round(lightRgb.r + (primaryRgb.r - lightRgb.r) * ratio);
    const g = Math.round(lightRgb.g + (primaryRgb.g - lightRgb.g) * ratio);
    const b = Math.round(lightRgb.b + (primaryRgb.b - lightRgb.b) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const legendData = useMemo(
    () => sortedData.map((d) => ({ ...d, color: getSliceColor(d.percentage) })),
    [sortedData, colors],
  );
  const legendMaxHeight = useMemo(
    () =>
      isPortrait
        ? (typeof outerRadius === 'string'
            ? parseInt(outerRadius)
            : outerRadius) * 2
        : undefined,
    [isPortrait, outerRadius],
  );

  const rangeLabel = useMemo(() => {
    const days =
      selectedRange === 'weekly'
        ? 7
        : selectedRange === 'biweekly'
          ? 14
          : selectedRange === 'monthly'
            ? 30
            : selectedRange === 'quarterly'
              ? 90
              : selectedRange === 'halfYear'
                ? 180
                : 365;

    const to = new Date();
    const from = new Date(to);
    from.setDate(to.getDate() - (days - 1));
    const fmt = (date: Date) =>
      date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(from)} - ${fmt(to)}`;
  }, [selectedRange]);

  const rangeLabelText = useMemo(() => {
    switch (selectedRange) {
      case 'biweekly':
        return 'Biweekly';
      case 'monthly':
        return 'Monthly';
      case 'quarterly':
        return 'Quarter';
      case 'halfYear':
        return 'Half Year';
      case 'yearly':
        return 'Year';
      default:
        return 'Weekly';
    }
  }, [selectedRange]);

  return (
    <div
      className={`bg-card hover:bg-card/80 transition-colors rounded-xl border border-border p-4 shadow-sm overflow-hidden ${className}`}
      style={{ width, height }}
    >
      <div className="flex flex-col h-full ">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between gap-3 shrink-0">
          <div className="flex md:flex-col gap-6 md:gap-0 item-center ">
            <h3 className="text-base font-semibold text-foreground">
              Breakdown
            </h3>
            <p className="text-xs text-foreground/60 mt-1">{rangeLabel}</p>
          </div>
          <div className="relative">
            {showRangeSelector ? (
              <button
                type="button"
                onClick={() => setRangeMenuOpen((v) => !v)}
                className="rounded-lg border border-border bg-card px-3 py-1.5 pr-7 text-xs text-foreground cursor-pointer"
              >
                {rangeLabelText}
                <ChevronDownIcon className="absolute right-2 top-1/2 w-4 h-4 -translate-y-1/2 text-foreground/60 pointer-events-none" />
              </button>
            ) : (
              <span className="rounded-lg bg-background px-3 py-1 text-xs font-medium text-foreground/50">
                {rangeLabelText}
              </span>
            )}
            {rangeMenuOpen && (
              <div className="absolute right-0 mt-1 rounded-lg border border-border bg-card shadow-lg z-30 p-1">
                {[
                  'weekly',
                  'biweekly',
                  'monthly',
                  'quarterly',
                  'halfYear',
                  'yearly',
                ].map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => {
                      setSelectedRange(range as RangeView);
                      setRangeMenuOpen(false);
                    }}
                    className={`w-full rounded-md px-2 py-1.5 text-left text-xs cursor-pointer ${selectedRange === range ? 'bg-foreground/10 text-foreground' : 'text-foreground/80 hover:bg-foreground/5'}`}
                  >
                    {rangeLabelText}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div
          ref={bodyRef}
          className="relative  flex-1 min-h-0 flex flex-row xl:flex-col gap-4 items-stretch"
        >
          {activeData.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-sm text-foreground/60">
                No data for selected range
              </p>
            </div>
          ) : (
            <>
              <PerfectSquare>
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={sortedData}
                      cx="50%"
                      cy="50%"
                      innerRadius={innerRadius}
                      outerRadius={outerRadius}
                      paddingAngle={paddingAngle}
                      dataKey="percentage"
                      labelLine={false}
                    >
                      {sortedData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={getSliceColor(entry.percentage)}
                          stroke="transparent"
                        />
                      ))}
                    </Pie>
                    {showTooltip && (
                      <Tooltip
                        content={<CustomTooltip />}
                        cursor={{ fill: 'transparent' }}
                      />
                    )}
                  </RechartsPieChart>
                </ResponsiveContainer>
              </PerfectSquare>

              <div className="bg-border shrink-0 w-px h-full xl:w-full xl:h-px" />

              {/* <div className="hidden md:flex custom-scrollbar bg-amber-600 flex-1 min-w-0 min-h-0 h-full self-stretch overflow-y-auto flex-col justify-start gap-y-3 xl:gap-y-5 xl:w-full pr-3 xl:pr-5" style={legendMaxHeight ? { height: `${legendMaxHeight}px`, maxHeight: `${legendMaxHeight}px`, scrollbarGutter: "stable" } : {}}> */}
              <div className="hidden md:flex flex-1 min-h-0 overflow-y-auto flex-col gap-y-3">
                {legendData.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-sm w-full max-w-xs mx-auto pl-3 xl:pl-6 pr-1 xl:pr-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-foreground/90 font-semibold truncate">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-foreground/80 text-xs font-normal ml-2 shrink-0">
                      {item.percentage}%
                    </span>
                  </div>
                ))}
              </div>

              {/* Mobile Legend */}
              <div
                className={`md:hidden absolute top-0 right-0 h-full w-3/4 max-w-xs border-l border-border bg-card p-3 z-10 transition-transform duration-200 ${legendOpen ? 'translate-x-0' : 'translate-x-full'}`}
              >
                <button
                  type="button"
                  onClick={() => setLegendOpen((v) => !v)}
                  className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 rounded-l-md border border-r-0 border-border bg-card px-2 py-3 text-xs font-medium text-foreground/80 cursor-pointer"
                >
                  <ChevronLeftIcon
                    className={`w-4 h-4 ${legendOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                <div
                  className="h-full overflow-y-auto custom-scrollbar flex flex-col gap-y-3"
                  style={
                    legendMaxHeight
                      ? {
                          height: `${legendMaxHeight}px`,
                          maxHeight: `${legendMaxHeight}px`,
                        }
                      : undefined
                  }
                >
                  {legendData.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-sm w-full pr-2"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-foreground/90 font-semibold truncate">
                          {item.name}
                        </span>
                      </div>
                      <span className="text-foreground/80 text-xs font-normal ml-2 shrink-0">
                        {item.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
