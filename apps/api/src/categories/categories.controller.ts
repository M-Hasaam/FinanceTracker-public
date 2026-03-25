import { Controller, Get, Delete, Param, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestUser } from '../common/types/auth.types';

// Skip the strict 'auth' throttler (10 req/min) — authenticated data endpoints
// use only the default throttler (100 req/min).
@SkipThrottle({ auth: true })
@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /** GET /categories — list all categories for the current user */
  @Get()
  findAll(@CurrentUser() user: RequestUser) {
    return this.categoriesService.findAll(user.id);
  }

  /** DELETE /categories/:id — delete an empty category */
  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.categoriesService.remove(user.id, id);
  }
}
