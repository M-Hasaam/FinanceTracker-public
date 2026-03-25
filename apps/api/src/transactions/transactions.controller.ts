import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestUser } from '../common/types/auth.types';

// Skip the strict 'auth' throttler (10 req/min) — authenticated data endpoints
// use only the default throttler (100 req/min).
@SkipThrottle({ auth: true })
@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  /** POST /transactions — create a new transaction */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateTransactionDto) {
    return this.transactionsService.create(user.id, dto);
  }

  /**
   * GET /transactions — list transactions for the user.
   * Optional query params: type=INCOME|EXPENSE, date=YYYY-MM-DD, page, limit
   */
  @Get()
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('type') type?: 'INCOME' | 'EXPENSE',
    @Query('date') date?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.transactionsService.findAll(
      user.id,
      type,
      date,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  /** GET /transactions/dashboard — all dashboard data in one call */
  @Get('dashboard')
  getDashboard(@CurrentUser() user: RequestUser) {
    return this.transactionsService.getDashboardSummary(user.id);
  }

  /** GET /transactions/:id — get single transaction */
  @Get(':id')
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.transactionsService.findOne(user.id, id);
  }

  /** PATCH /transactions/:id — update a transaction */
  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(user.id, id, dto);
  }

  /** DELETE /transactions/:id — delete a transaction */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.transactionsService.remove(user.id, id);
  }
}
