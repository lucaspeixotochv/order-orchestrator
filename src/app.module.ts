import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import basicAuth from 'express-basic-auth';
import { HealthModule } from 'src/modules/health/health.module';
import { OrdersModule } from 'src/modules/orders/orders.module';
import { WebhooksModule } from 'src/modules/webhooks/webhooks.module';
import { Customer, Order, OrderItem } from 'src/shared/infra/database/entities';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities: [Order, Customer, OrderItem],
        synchronize: false,
      }),
    }),
    BullBoardModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        route: '/bull-board',
        adapter: ExpressAdapter,
        middleware: basicAuth({
          users: {
            [config.get('BULL_BOARD_USER')]: config.get('BULL_BOARD_PASS')!,
          },
          challenge: true,
          realm: 'Orquestrador de Pedidos',
        }),
      }),
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get<string>('REDIS_URL'),
        },
      }),
    }),
    OrdersModule,
    WebhooksModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
