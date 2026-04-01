import { JobsOptions } from 'bullmq';

export type QueueConfig = {
  jobName: string;
  attempts?: number;
  backoff?: JobsOptions['backoff'];
  removeOnComplete?: JobsOptions['removeOnComplete'];
};
