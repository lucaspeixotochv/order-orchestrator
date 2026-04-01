import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobsModule } from 'src/modules/jobs/jobs.module';
import { WebhooksController } from 'src/modules/webhooks/webhooks.controller';
import { WebhooksService } from 'src/modules/webhooks/webhooks.service';
import { Order } from 'src/shared/infra/database/entities/order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order]), JobsModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
