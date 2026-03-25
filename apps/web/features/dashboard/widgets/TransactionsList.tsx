'use client';

import type { ReactNode } from 'react';
import {
  ExpenseTrendSquareIcon,
  ExpenseTrendSquareIcon_2,
  IncomeTrendSquareIcon,
  IncomeTrendSquareIcon_2,
} from '@/common/icons';

// ─── Types ───────────────────────────────────────────────────────────────────

export type TransactionType = 'INCOME' | 'EXPENSE';
export type ListVariant = 'income' | 'expense' | 'recent';

export interface TransactionItem {
  id: string;
  activity: string;
  category: string;
  /** Display string, e.g. "10:00 AM - Jan 22, 2025" */
  datetime: string;
  amount: number;
  /** Only matters in 'recent' variant — determines row colour */
  type: TransactionType;
}

export interface TransactionListProps {
  variant: ListVariant;
  items: TransactionItem[];
  onDelete: (id: string) => void;
  onEdit?: (id: string) => void;
  headerLabel?: string;
  headerContent?: ReactNode;
  title?: string;
  className?: string;
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function GraphUpIcon({ color = 'var(--income)' }: { color?: string }) {
  return (
    <IncomeTrendSquareIcon
      className="w-7 h-7 md:w-7 md:h-7"
      style={{ color }}
    />
  );
}

function GraphDownIcon({ color = 'var(--expenses)' }: { color?: string }) {
  return (
    <ExpenseTrendSquareIcon
      className="w-7 h-7 md:w-7 md:h-7"
      style={{ color }}
    />
  );
}

function GraphUpIcon_2({ color = 'var(--income)' }: { color?: string }) {
  return (
    <IncomeTrendSquareIcon_2
      className="w-12 h-12 md:w-16 md:h-16"
      style={{ color }}
    />
  );
}

function GraphDownIcon_2({ color = 'var(--expenses)' }: { color?: string }) {
  return (
    <ExpenseTrendSquareIcon_2
      className="w-12 h-12 md:w-16 md:h-16"
      style={{ color }}
    />
  );
}

function TrashIcon({ color = 'var(--income)' }: { color?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
      <path
        d="M3 6H21M8 6V4H16V6M19 6L18.1 19.1C18.05 19.6 17.6 20 17.1 20H6.9C6.4 20 5.95 19.6 5.9 19.1L5 6"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 11V17M14 11V17"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="w-5 h-5 text-primary"
      aria-hidden="true"
    >
      <path
        d="M11 4H4C3.45 4 3 4.45 3 5V20C3 20.55 3.45 21 4 21H19C19.55 21 20 20.55 20 19V12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.5 2.5C19.33 1.67 20.67 1.67 21.5 2.5C22.33 3.33 22.33 4.67 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Per-variant config ───────────────────────────────────────────────────────

interface VariantConfig {
  defaultTitle: string;
  defaultLabel: string;
  showDelete: boolean;
  showEdit: boolean;
  rowType?: TransactionType;
}

const VARIANT_CONFIG: Record<ListVariant, VariantConfig> = {
  income: {
    defaultTitle: 'Incomes',
    defaultLabel: 'All',
    showDelete: true,
    showEdit: true,
    rowType: 'INCOME',
  },
  expense: {
    defaultTitle: 'Expenses',
    defaultLabel: 'All',
    showDelete: true,
    showEdit: true,
    rowType: 'EXPENSE',
  },
  recent: {
    defaultTitle: 'Recent Activity',
    defaultLabel: 'Today',
    showDelete: false,
    showEdit: false,
  },
};

// ─── Row icon ───────────────────────────────────────────────────────────────

function RowIcon({ type }: { type: TransactionType }) {
  return (
    <div className="flex items-center justify-center w-11 h-11 md:w-12 md:h-12 rounded-xl shrink-0">
      {type === 'INCOME' ? <GraphUpIcon /> : <GraphDownIcon />}
    </div>
  );
}

// ─── Single row ───────────────────────────────────────────────────────────────

interface RowProps {
  item: TransactionItem;
  effectiveType: TransactionType;
  showDelete: boolean;
  showEdit: boolean;
  onDelete: (id: string) => void;
  onEdit?: (id: string) => void;
}

function TransactionRow({
  item,
  effectiveType,
  showDelete,
  showEdit,
  onDelete,
  onEdit,
}: RowProps) {
  const isIncome = effectiveType === 'INCOME';
  const amountColor = isIncome ? 'text-income' : 'text-expenses';
  const amountPrefix = isIncome ? '+' : '-';
  const deleteColor = isIncome ? 'var(--income)' : 'var(--expenses)';

  return (
    <div className="flex items-center gap-2 sm:gap-3 border border-border rounded-lg px-3 h-16 bg-card hover:bg-foreground/5 transition-colors min-w-0 shrink-0">
      <RowIcon type={effectiveType} />
      <span className="text-foreground text-sm sm:text-base font-normal flex-1 truncate">
        {item.activity}
      </span>
      <span className="hidden sm:block text-foreground/60 text-xs font-light w-20 truncate shrink-0">
        {item.category}
      </span>
      <span className=" text-foreground/60 text-xs font-light flex-1 truncate">
        {item.datetime}
      </span>
      <span
        className={`${amountColor} text-sm font-medium w-16 text-right shrink-0 ml-auto`}
      >
        {amountPrefix}${Math.abs(item.amount)}
      </span>
      <div className="flex items-center gap-2 shrink-0">
        {showDelete && (
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            className="p-1 rounded hover:bg-foreground/10 transition-colors cursor-pointer"
            aria-label={`Delete ${item.activity}`}
          >
            <TrashIcon color={deleteColor} />
          </button>
        )}
        {showEdit && onEdit && (
          <button
            type="button"
            onClick={() => onEdit(item.id)}
            className="p-1 rounded hover:bg-foreground/10 transition-colors cursor-pointer"
            aria-label={`Edit ${item.activity}`}
          >
            <EditIcon />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TransactionsList({
  variant,
  items,
  onDelete,
  onEdit,
  headerLabel,
  headerContent,
  title,
  className = '',
}: TransactionListProps) {
  const config = VARIANT_CONFIG[variant];
  const displayTitle = title ?? config.defaultTitle;
  const displayLabel = headerLabel ?? config.defaultLabel;

  return (
    <div
      className={`bg-card rounded-xl overflow-hidden flex flex-col border border-border ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-xl">
            {variant === 'expense' ? <GraphDownIcon_2 /> : <GraphUpIcon_2 />}
          </div>
          <h2 className="text-foreground font-bold text-lg md:text-2xl">
            {displayTitle}
          </h2>
        </div>
        {headerContent ?? (
          <span className="text-foreground/80 text-sm">{displayLabel}</span>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-border mx-4" />

      {/* List */}
      <div className="flex-1 min-h-0 flex flex-col gap-3 px-3 sm:px-4 py-4 overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-foreground/40 text-sm text-center py-8">
            No transactions
          </p>
        ) : (
          items.map((item) => {
            const effectiveType: TransactionType =
              variant === 'recent' ? item.type : (config.rowType ?? item.type);
            return (
              <TransactionRow
                key={item.id}
                item={item}
                effectiveType={effectiveType}
                showDelete={config.showDelete}
                showEdit={config.showEdit}
                onDelete={onDelete}
                onEdit={onEdit}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
