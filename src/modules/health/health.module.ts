import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { HealthController } from 'src/modules/health/health.controller';
import { HealthService } from 'src/modules/health/health.service';
import { QueueName } from 'src/shared/enums';

@Module({
  imports: [BullModule.registerQueue({ name: QueueName.ENRICHMENT })],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
