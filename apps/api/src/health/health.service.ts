import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { prisma } from '@repo/database';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private redis: Redis;

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis(this.configService.get<string>('redis.url'), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
  }

  async check() {
    const checks = await Promise.allSettled([
      this.checkRedis(),
      this.checkDatabase(),
    ]);

    const [redisCheck, dbCheck] = checks;

    const status =
      redisCheck.status === 'fulfilled' &&
      dbCheck.status === 'fulfilled' &&
      redisCheck.value.healthy &&
      dbCheck.value.healthy
        ? 'healthy'
        : 'degraded';

    return {
      status,
      timestamp: new Date().toISOString(),
      checks: {
        redis:
          redisCheck.status === 'fulfilled'
            ? redisCheck.value
            : { healthy: false, error: 'Check failed' },
        database:
          dbCheck.status === 'fulfilled'
            ? dbCheck.value
            : { healthy: false, error: 'Check failed' },
      },
    };
  }

  async readiness() {
    try {
      const result = await this.check();
      if (result.status === 'healthy') {
        return { ready: true, ...result };
      }
      throw new Error('Service not ready');
    } catch (error) {
      this.logger.error('Readiness check failed', error);
      throw error;
    }
  }

  private async checkRedis() {
    try {
      await this.redis.ping();
      return { healthy: true, latency: 0 };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn('Redis health check failed', error);
      return { healthy: false, error: message };
    }
  }

  private async checkDatabase() {
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - start;
      return { healthy: true, latency };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn('Database health check failed', error);
      return { healthy: false, error: message };
    }
  }
}
