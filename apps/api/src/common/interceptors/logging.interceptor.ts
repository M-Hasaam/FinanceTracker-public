import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, body, query } = request;
    const requestId = randomUUID();

    // Attach request ID to request object for use in other parts
    (request as any).requestId = requestId;

    const now = Date.now();

    this.logger.log(`[${requestId}] --> ${method} ${url}`, {
      query,
      body: this.sanitizeBody(body),
    });

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - now;
          this.logger.log(`[${requestId}] <-- ${method} ${url} ${duration}ms`, {
            statusCode: context.switchToHttp().getResponse().statusCode,
          });
        },
        error: (error) => {
          const duration = Date.now() - now;
          this.logger.error(
            `[${requestId}] <-- ${method} ${url} ${duration}ms [ERROR]`,
            { error: error.message },
          );
        },
      }),
    );
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;

    const sanitized = { ...body };
    const sensitivePatterns = /password|token|secret|authorization/i;

    for (const field of Object.keys(sanitized)) {
      if (sensitivePatterns.test(field)) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }
}
