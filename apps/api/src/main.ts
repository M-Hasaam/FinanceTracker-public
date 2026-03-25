import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, Logger } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Security middleware
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS configuration
  const corsOrigin = configService.get<string>('cors.origin');
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = configService.get<number>('port');
  await app.listen(port);

  logger.log(`Application running on: http://localhost:${port}`);
  logger.log(`Environment: ${configService.get<string>('env')}`);
  logger.log(`CORS enabled for: ${corsOrigin}`);
}

void bootstrap();
