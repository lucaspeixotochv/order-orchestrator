import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BullBoardModule } from '@bull-board/nestjs';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderEnrichmentProcessor } from 'src/modules/jobs/processors/order-enrichment.processor';
import { QueueController } from 'src/modules/jobs/queue.controller';
import { OrderEnrichmentService } from 'src/modules/jobs/services/order-enrichment.service';
import { QueueMetricsService } from 'src/modules/jobs/services/queue-metrics.service';
import { QueueName } from 'src/shared/enums';
import { Order } from 'src/shared/infra/database/entities';

const queueModules = [
  BullModule.registerQueue({ name: QueueName.ENRICHMENT }),
  BullModule.registerQueue({ name: QueueName.ENRICHMENT_DLQ }),
];

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([Order]),
    ...queueModules,
    BullBoardModule.forFeature({
      name: QueueName.ENRICHMENT,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: QueueName.ENRICHMENT_DLQ,
      adapter: BullMQAdapter,
    }),
  ],
  controllers: [QueueController],
  providers: [
    OrderEnrichmentProcessor,
    OrderEnrichmentService,
    QueueMetricsService,
  ],
  exports: [...queueModules],
})
export class JobsModule {}
