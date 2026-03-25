import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { CategoriesModule } from '../categories/categories.module';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: { algorithm: 'HS256' },
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
    CategoriesModule,
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService, JwtAuthGuard],
})
export class TransactionsModule {}
