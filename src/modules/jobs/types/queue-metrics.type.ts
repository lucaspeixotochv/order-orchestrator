export type QueueMetrics = {
  enrichmentQueue: {
    name: string;
    isPaused: boolean;
    workersCount: number;
    jobs: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
      paused: number;
    };
  };
  dlqQueue: {
    name: string;
    jobs: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
      paused: number;
    };
  };
};
