import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionTypeDto } from './create-transaction.dto';

/** All fields are optional for partial updates */
export class UpdateTransactionDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  amount?: number;

  @IsOptional()
  @IsEnum(TransactionTypeDto)
  type?: TransactionTypeDto;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
