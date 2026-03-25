import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import type { JwtAccessPayload, RequestUser } from '../types/auth.types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authRequest = request as Request & { user?: RequestUser };
    const token = authRequest.cookies?.auth_token as string | undefined;

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtAccessPayload>(
        token,
        {
          algorithms: ['HS256'],
        },
      );

      if (!payload.sub) {
        throw new UnauthorizedException('Invalid token payload');
      }

      // Attach minimal identity to request — never put large fields in JWT
      const user: RequestUser = {
        id: payload.sub,
        email: payload.email,
        provider: payload.provider ?? 'EMAIL',
      };
      authRequest.user = user;

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Token verification failed: ${message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
