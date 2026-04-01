import { JobsOptions } from 'bullmq';
import { QueueName } from 'src/shared/enums';
import { QueueConfig } from 'src/shared/types/queue-config.type';

export const queueConfig: Record<QueueName, QueueConfig> = {
  [QueueName.ENRICHMENT]: {
    jobName: 'enrich-order',
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
  [QueueName.ENRICHMENT_DLQ]: {
    jobName: 'enrich-order-dlq',
    removeOnComplete: 1000,
  },
};

export function buildEnrichmentJobOptions(orderId: string): JobsOptions {
  const enrichmentQueueConfig = queueConfig[QueueName.ENRICHMENT];

  return {
    jobId: `${enrichmentQueueConfig.jobName}-${orderId}`,
    attempts: enrichmentQueueConfig.attempts,
    backoff: enrichmentQueueConfig.backoff,
  };
}
