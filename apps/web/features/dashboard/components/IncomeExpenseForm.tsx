'use client';

import type { FormEvent } from 'react';
import type { TransactionType } from '@/features/dashboard/services/transactions-api';
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  FormSubmitIcon,
} from '@/common/icons';

interface IncomeExpenseFormProps {
  type: TransactionType;
  amount: string;
  category: string;
  customCategory: string;
  description: string;
  submitting: boolean;
  isEditing: boolean;
  error?: string | null;
  categoryOptions: string[];
  onAmountChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onCustomCategoryChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onCancelEdit?: () => void;
  className?: string;
}

function PlusIcon({ color }: { color: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5 md:w-6 md:h-6"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 5V19M5 12H19"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const FIELD_INPUT_CLASS =
  'h-12 md:h-14 w-full rounded-lg border border-border bg-background px-4 text-sm md:text-base text-foreground placeholder:text-foreground/45 focus:border-foreground/60 focus:outline-none focus:ring-2 focus:ring-foreground/10 transition-all duration-200';

export default function IncomeExpenseForm({
  type,
  amount,
  category,
  customCategory,
  description,
  submitting,
  isEditing,
  error,
  categoryOptions,
  onAmountChange,
  onCategoryChange,
  onCustomCategoryChange,
  onDescriptionChange,
  onSubmit,
  onCancelEdit,
  className = '',
}: IncomeExpenseFormProps) {
  const isIncome = type === 'INCOME';
  const title = `${isEditing ? 'Edit' : 'Add'} ${isIncome ? 'Income' : 'Expense'}`;
  const accent = isIncome ? 'var(--income)' : 'var(--expenses)';
  const isOtherSelected = category === 'Other';

  return (
    <section
      className={`rounded-2xl bg-card p-4 md:p-6 text-foreground border border-border shadow-xl ${className}`}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="mb-6 md:mb-8 flex items-center gap-3 md:gap-4">
          <div
            className="flex w-10 h-10 md:w-12 md:h-12 items-center justify-center rounded-xl shadow-lg"
            style={{ backgroundColor: accent }}
          >
            <PlusIcon color="white" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-bold leading-tight">
              {title}
            </h2>
            <p className="text-xs md:text-sm text-foreground/40 mt-1">
              Fill in the details below
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-xs md:text-sm text-destructive">{error}</p>
          </div>
        )}

        <form
          onSubmit={onSubmit}
          className="flex flex-1 flex-col space-y-4 md:space-y-5"
        >
          {/* Amount Field */}
          <div className="space-y-2">
            <label
              className="block text-sm md:text-base font-semibold text-foreground/90"
              htmlFor={`amount-${type}`}
            >
              Amount <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40 text-lg">
                $
              </span>
              <input
                id={`amount-${type}`}
                type="number"
                step="0.01"
                min="0.01"
                required
                disabled={submitting}
                placeholder="0.00"
                className={`${FIELD_INPUT_CLASS} pl-8`}
                value={amount}
                onChange={(e) => onAmountChange(e.target.value)}
              />
            </div>
          </div>

          {/* Category Field */}
          <div className="space-y-2">
            <label
              className="block text-sm md:text-base font-semibold text-foreground/90"
              htmlFor={`category-${type}`}
            >
              {isIncome ? 'Source' : 'Category'}{' '}
              <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              {isOtherSelected ? (
                <>
                  <input
                    id={`category-${type}`}
                    type="text"
                    required
                    disabled={submitting}
                    placeholder={`Enter new ${isIncome ? 'source' : 'category'} name`}
                    className={`${FIELD_INPUT_CLASS} pr-10`}
                    value={customCategory}
                    onChange={(e) => onCustomCategoryChange(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      onCategoryChange('');
                      onCustomCategoryChange('');
                    }}
                    disabled={submitting}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/45 hover:text-foreground/80 transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeftIcon className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <select
                    id={`category-${type}`}
                    required
                    disabled={submitting}
                    className={`${FIELD_INPUT_CLASS} appearance-none cursor-pointer pr-10`}
                    value={category}
                    onChange={(e) => onCategoryChange(e.target.value)}
                  >
                    <option value="" disabled>
                      Select {isIncome ? 'source' : 'category'}
                    </option>
                    {categoryOptions.map((option) => (
                      <option
                        key={option}
                        value={option}
                        className="bg-background"
                      >
                        {option}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <ChevronDownIcon className="w-4 h-4 text-foreground/40" />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label
              className="block text-sm md:text-base font-semibold text-foreground/90"
              htmlFor={`description-${type}`}
            >
              Description{' '}
              <span className="text-foreground/40 text-sm">(Optional)</span>
            </label>
            <textarea
              id={`description-${type}`}
              disabled={submitting}
              placeholder="Add any additional notes..."
              className="h-24 md:h-28 w-full resize-none rounded-lg border border-border bg-background px-4 py-3 text-sm md:text-base text-foreground placeholder:text-foreground/40 focus:border-foreground/60 focus:outline-none focus:ring-2 focus:ring-foreground/10 transition-all duration-200"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
            />
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 md:pt-6 mt-auto">
            <button
              type="submit"
              disabled={submitting}
              className="flex h-12 md:h-14 flex-1 items-center justify-center gap-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
              style={{ backgroundColor: accent }}
            >
              <FormSubmitIcon className="w-5 h-5 md:w-6 md:h-6 text-foreground" />
              <span className="font-semibold text-sm md:text-base">
                {submitting ? 'Saving...' : isEditing ? 'Update' : 'Submit'}
              </span>
            </button>
            {isEditing && onCancelEdit && (
              <button
                type="button"
                onClick={onCancelEdit}
                disabled={submitting}
                className="h-12 md:h-14 rounded-lg border border-border px-4 md:px-6 text-sm md:text-base text-foreground/90 transition-all duration-200 hover:bg-foreground/10 hover:border-foreground/30 disabled:cursor-not-allowed cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
