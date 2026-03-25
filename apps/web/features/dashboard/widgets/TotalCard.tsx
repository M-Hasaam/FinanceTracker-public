'use client';
import { TotalIncomeIcon, TotalExpenseIcon, SavingsIcon } from '@/common/icons';

export type TotalCardType = 'income' | 'expense' | 'savings';

interface TotalCardProps {
  type: TotalCardType;
  value?: string;
  label?: string;
  className?: string;
  valueClassName?: string;
}

const CONFIG = {
  income: {
    typeLabel: 'INCOME',
    defaultLabel: 'Total Income',
    iconColor: 'text-success-alt',
    valueColor: 'text-foreground',
    icon: (className: string) => <TotalIncomeIcon className={className} />,
  },
  expense: {
    typeLabel: 'EXPENSE',
    defaultLabel: 'Total Expense',
    iconColor: 'text-danger-alt',
    valueColor: 'text-foreground',
    icon: (className: string) => <TotalExpenseIcon className={className} />,
  },
  savings: {
    typeLabel: 'SAVINGS',
    defaultLabel: 'Total Savings',
    iconColor: 'text-chart-primary',
    valueColor: 'text-foreground',
    icon: (className: string) => <SavingsIcon className={className} />,
  },
} satisfies Record<
  TotalCardType,
  {
    typeLabel: string;
    defaultLabel: string;
    iconColor: string;
    valueColor: string;
    icon: (c: string) => React.ReactNode;
  }
>;

export default function TotalCard({
  type,
  value = '$ 0',
  label,
  className = '',
  valueClassName = '',
}: TotalCardProps) {
  const cfg = CONFIG[type];

  return (
    <div
      className={`flex items-center gap-3 md:gap-4 rounded-xl bg-linear-to-br from-card to-card-gradient-end px-3 md:px-4 lg:px-5 py-4 text-foreground border border-border shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 ${className}`}
    >
      {/* Icon */}
      <div className="shrink-0">
        {cfg.icon(`w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 ${cfg.iconColor}`)}
      </div>

      {/* Text Content */}
      <div className="min-w-0 flex-1">
        {/* Type Label */}
        <p
          title={cfg.typeLabel}
          className="text-xs md:text-sm font-light leading-tight text-foreground/70 uppercase tracking-wider truncate"
        >
          {cfg.typeLabel}
        </p>

        {/* Value */}
        <p
          title={value}
          className={`text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold leading-none tracking-tight truncate ${cfg.valueColor} ${valueClassName}`}
        >
          {value}
        </p>

        {/* Optional Sub Label */}
        {label && (
          <p className="text-xs md:text-sm text-foreground/40 mt-1 hidden sm:block">
            {label}
          </p>
        )}
      </div>
    </div>
  );
}
