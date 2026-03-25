import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { prisma } from '@repo/database';

@Injectable()
export class CategoriesService {
  /**
   * Find or create a category by name for a given user.
   * Used internally when creating transactions.
   */
  async findOrCreate(userId: string, name: string) {
    const normalizedName = name.trim().toLowerCase();

    const existing = await prisma.category.findUnique({
      where: { name_userId: { name: normalizedName, userId } },
    });

    if (existing) return existing;

    return await prisma.category.create({
      data: { name: normalizedName, userId },
    });
  }

  /** Get all categories for the authenticated user */
  async findAll(userId: string) {
    return await prisma.category.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  /** Delete a category — only if it belongs to the user and has no transactions */
  async remove(userId: string, categoryId: string) {
    const category = await prisma.category.findFirst({
      where: { id: categoryId, userId },
      include: { _count: { select: { transactions: true } } },
    });

    if (!category) throw new NotFoundException('Category not found');

    if (category._count.transactions > 0) {
      throw new ConflictException(
        'Cannot delete a category that has transactions',
      );
    }

    await prisma.category.delete({ where: { id: categoryId } });
    return { message: 'Category deleted' };
  }
}
