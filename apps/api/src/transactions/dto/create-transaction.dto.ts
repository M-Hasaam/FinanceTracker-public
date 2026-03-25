import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum TransactionTypeDto {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export class CreateTransactionDto {
  /** Amount must be a positive number */
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Amount must be a number with up to 2 decimal places' },
  )
  @IsPositive({ message: 'Amount must be positive' })
  @Type(() => Number)
  amount: number;

  /** INCOME or EXPENSE */
  @IsEnum(TransactionTypeDto, { message: 'Type must be INCOME or EXPENSE' })
  type: TransactionTypeDto;

  /** ISO date string e.g. 2026-03-01 */
  @IsDateString({}, { message: 'Date must be a valid ISO date string' })
  date: string;

  /** Category name — auto-created if it doesn't exist */
  @IsString()
  @IsNotEmpty({ message: 'Category is required' })
  @MaxLength(100)
  category: string;

  /** Optional description */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
