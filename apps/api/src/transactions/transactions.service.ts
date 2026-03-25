import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { prisma } from '@repo/database';

import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { CategoriesService } from '../categories/categories.service';

@Injectable()
export class TransactionsService {
  constructor(private readonly categoriesService: CategoriesService) {}

  // ─── CRUD ────────────────────────────────────────────────────────────────────

  /** Create a transaction for the authenticated user, auto-creating the category if needed */
  async create(userId: string, dto: CreateTransactionDto) {
    const category = await this.categoriesService.findOrCreate(
      userId,
      dto.category,
    );

    return await prisma.transaction.create({
      data: {
        amount: dto.amount,
        type: dto.type,
        date: new Date(dto.date),
        description: dto.description ?? null,
        userId,
        categoryId: category.id,
      },
      include: { category: true },
    });
  }

  /** List all transactions for the user, optionally filtered by type, paginated */
  async findAll(
    userId: string,
    type?: 'INCOME' | 'EXPENSE',
    date?: string,
    page = 1,
    limit = 50,
  ) {
    const dateFilter = (() => {
      if (!date) return undefined;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new BadRequestException('date must be in YYYY-MM-DD format');
      }

      const start = new Date(`${date}T00:00:00.000Z`);
      if (Number.isNaN(start.getTime())) {
        throw new BadRequestException('Invalid date value');
      }
      const end = new Date(`${date}T23:59:59.999Z`);
      return { gte: start, lte: end };
    })();

    const where = {
      userId,
      ...(type ? { type } : {}),
      ...(dateFilter ? { date: dateFilter } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { category: true },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  /** Get a single transaction — validates ownership */
  async findOne(userId: string, id: string) {
    const tx = await prisma.transaction.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!tx) throw new NotFoundException('Transaction not found');
    if (tx.userId !== userId) throw new ForbiddenException();

    return tx;
  }

  /** Update a transaction — validates ownership, handles category change */
  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    const tx = await this.findOne(userId, id);

    let categoryId = tx.categoryId;
    if (dto.category) {
      const category = await this.categoriesService.findOrCreate(
        userId,
        dto.category,
      );
      categoryId = category.id;
    }

    return await prisma.transaction.update({
      where: { id },
      data: {
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.type ? { type: dto.type } : {}),
        ...(dto.date ? { date: new Date(dto.date) } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        categoryId,
      },
      include: { category: true },
    });
  }

  /** Delete a transaction — validates ownership */
  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await prisma.transaction.delete({ where: { id } });
    return { message: 'Transaction deleted' };
  }

  // ─── Dashboard aggregations ───────────────────────────────────────────────────

  /**
   * Total income and total expense for the user (all-time).
   * Uses Prisma .groupBy() for a single efficient query.
   */
  async getTotals(userId: string) {
    const rows = await prisma.transaction.groupBy({
      by: ['type'],
      where: { userId },
      _sum: { amount: true },
    });

    const income = Number(
      rows.find((r) => r.type === 'INCOME')?._sum.amount ?? 0,
    );
    const expense = Number(
      rows.find((r) => r.type === 'EXPENSE')?._sum.amount ?? 0,
    );

    return {
      totalIncome: income,
      totalExpense: expense,
      balance: income - expense,
    };
  }

  /**
   * Returns an array of the last N days with summed income and expense per day.
   * All dates are handled in UTC to match PostgreSQL DATE_TRUNC behaviour.
   */
  async getDailyArray(userId: string, days = 7) {
    // Build UTC midnight for today and (days-1) days before it
    const todayStr = new Date().toISOString().slice(0, 10); // e.g. "2026-03-01"
    const todayUTC = new Date(`${todayStr}T00:00:00Z`);
    const startDate = new Date(todayUTC);
    startDate.setUTCDate(startDate.getUTCDate() - (days - 1));

    const rows = await prisma.$queryRaw<
      { day: Date; type: string; total: number }[]
    >`
      SELECT
        DATE_TRUNC('day', date AT TIME ZONE 'UTC') AS day,
        type,
        SUM(amount)::float AS total
      FROM "Transaction"
      WHERE "userId" = ${userId}
        AND date >= ${startDate}
      GROUP BY DATE_TRUNC('day', date AT TIME ZONE 'UTC'), type
      ORDER BY day ASC
    `;

    // Build map keyed by UTC date string
    const map = new Map<
      string,
      { date: string; income: number; expense: number }
    >();

    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setUTCDate(d.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      map.set(key, { date: key, income: 0, expense: 0 });
    }

    for (const row of rows) {
      const key = new Date(row.day).toISOString().slice(0, 10);
      const entry = map.get(key);
      if (!entry) continue;
      if (row.type === 'INCOME') entry.income = row.total;
      else entry.expense = row.total;
    }

    return Array.from(map.values());
  }

  /**
   * Returns an array of the last 12 months with summed income and expense per month.
   * All dates handled in UTC.
   */
  async getMonthlyArray(userId: string, months = 12) {
    const now = new Date();
    const curYear = now.getUTCFullYear();
    const curMonth = now.getUTCMonth(); // 0-indexed

    // Compute start year/month
    const totalMonths = curYear * 12 + curMonth;
    const startTotalMonths = totalMonths - (months - 1);
    const startYear = Math.floor(startTotalMonths / 12);
    const startMonth = startTotalMonths % 12;
    const startDate = new Date(Date.UTC(startYear, startMonth, 1));

    const rows = await prisma.$queryRaw<
      { month: Date; type: string; total: number }[]
    >`
      SELECT
        DATE_TRUNC('month', date AT TIME ZONE 'UTC') AS month,
        type,
        SUM(amount)::float AS total
      FROM "Transaction"
      WHERE "userId" = ${userId}
        AND date >= ${startDate}
      GROUP BY DATE_TRUNC('month', date AT TIME ZONE 'UTC'), type
      ORDER BY month ASC
    `;

    const map = new Map<
      string,
      { label: string; income: number; expense: number }
    >();

    for (let i = 0; i < months; i++) {
      const d = new Date(Date.UTC(startYear, startMonth + i, 1));
      const key = d.toISOString().slice(0, 7); // "2026-03"
      const label = d.toLocaleString('default', {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      });
      map.set(key, { label, income: 0, expense: 0 });
    }

    for (const row of rows) {
      const key = new Date(row.month).toISOString().slice(0, 7);
      const entry = map.get(key);
      if (!entry) continue;
      if (row.type === 'INCOME') entry.income = row.total;
      else entry.expense = row.total;
    }

    return Array.from(map.values());
  }

  /**
   * Category breakdown of EXPENSES in a rolling N-day window.
   * Returns each category with its total and percentage of total expense.
   */
  async getCategoryBreakdown(userId: string, days: number) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayUTC = new Date(`${todayStr}T00:00:00Z`);
    const rangeStart = new Date(todayUTC);
    rangeStart.setUTCDate(rangeStart.getUTCDate() - (days - 1));

    const rows = await prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        type: 'EXPENSE',
        date: { gte: rangeStart },
      },
      _sum: { amount: true },
    });

    if (rows.length === 0) return [];

    // Fetch category names
    const categoryIds = rows.map((r) => r.categoryId);
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });
    const catMap = new Map(categories.map((c) => [c.id, c.name]));

    const totalExpense = rows.reduce(
      (sum, r) => sum + Number(r._sum.amount ?? 0),
      0,
    );

    return rows.map((r) => ({
      category: catMap.get(r.categoryId) ?? r.categoryId,
      total: Number(r._sum.amount ?? 0),
      percentage:
        totalExpense > 0
          ? Number(
              ((Number(r._sum.amount ?? 0) / totalExpense) * 100).toFixed(2),
            )
          : 0,
    }));
  }

  /**
   * Recent activities today (both income and expense), ordered by createdAt desc.
   */
  async getTodayActivities(userId: string) {
    // Use UTC midnight so it matches how transaction dates are stored
    const todayStr = new Date().toISOString().slice(0, 10);
    const startOfDay = new Date(`${todayStr}T00:00:00Z`);
    const endOfDay = new Date(`${todayStr}T23:59:59.999Z`);

    return await prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: startOfDay, lte: endOfDay },
      },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  /**
   * All dashboard data in one call to minimize round-trips.
   */
  async getDashboardSummary(userId: string) {
    const [
      totals,
      daily,
      monthly,
      weeklyCategories,
      biweeklyCategories,
      monthlyCategories,
      quarterlyCategories,
      halfYearCategories,
      yearlyCategories,
      todayActivities,
    ] = await Promise.all([
      this.getTotals(userId),
      this.getDailyArray(userId, 30),
      this.getMonthlyArray(userId, 12),
      this.getCategoryBreakdown(userId, 7),
      this.getCategoryBreakdown(userId, 14),
      this.getCategoryBreakdown(userId, 30),
      this.getCategoryBreakdown(userId, 90),
      this.getCategoryBreakdown(userId, 180),
      this.getCategoryBreakdown(userId, 365),
      this.getTodayActivities(userId),
    ]);

    return {
      totals,
      daily,
      monthly,
      weeklyCategories,
      biweeklyCategories,
      monthlyCategories,
      quarterlyCategories,
      halfYearCategories,
      yearlyCategories,
      todayActivities,
    };
  }
}
