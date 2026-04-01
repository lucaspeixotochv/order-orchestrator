import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QueueMetrics } from 'src/modules/jobs/types/queue-metrics.type';
import { QueueName } from 'src/shared/enums';

@Injectable()
export class QueueMetricsService {
  constructor(
    @InjectQueue(QueueName.ENRICHMENT)
    private readonly enrichmentQueue: Queue,
    @InjectQueue(QueueName.ENRICHMENT_DLQ)
    private readonly enrichmentDlqQueue: Queue,
  ) {}

  async getMetrics(): Promise<QueueMetrics> {
    const [enrichmentJobs, dlqJobs, workersCount, isPaused] = await Promise.all(
      [
        this.enrichmentQueue.getJobCounts(
          'waiting',
          'active',
          'completed',
          'failed',
          'delayed',
          'paused',
        ),
        this.enrichmentDlqQueue.getJobCounts(
          'waiting',
          'active',
          'completed',
          'failed',
          'delayed',
          'paused',
        ),
        this.enrichmentQueue.getWorkersCount(),
        this.enrichmentQueue.isPaused(),
      ],
    );

    return {
      enrichmentQueue: {
        name: this.enrichmentQueue.name,
        isPaused,
        workersCount,
        jobs: this.mapJobCounts(enrichmentJobs),
      },
      dlqQueue: {
        name: this.enrichmentDlqQueue.name,
        jobs: this.mapJobCounts(dlqJobs),
      },
    };
  }

  private mapJobCounts(jobCounts: Record<string, number>) {
    return {
      waiting: jobCounts.waiting ?? 0,
      active: jobCounts.active ?? 0,
      completed: jobCounts.completed ?? 0,
      failed: jobCounts.failed ?? 0,
      delayed: jobCounts.delayed ?? 0,
      paused: jobCounts.paused ?? 0,
    };
  }
}
