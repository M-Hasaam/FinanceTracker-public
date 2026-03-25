import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import type { RequestUser } from '../types/auth.types';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const authRequest = request as Request & { user?: RequestUser };
    const user = authRequest.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    return user;
  },
);
