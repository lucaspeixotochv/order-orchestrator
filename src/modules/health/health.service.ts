import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QueueName } from 'src/shared/enums';
import { DataSource } from 'typeorm';

type DependencyStatus = { status: 'up' } | { status: 'down'; error: string };

export type HealthCheckResult = {
  isHealthy: boolean;
  payload: {
    status: 'ok' | 'degraded';
    timestamp: string;
    uptimeSeconds: number;
    dependencies: {
      database: DependencyStatus;
      redis: DependencyStatus;
    };
    responseTimeMs: number;
  };
};

@Injectable()
export class HealthService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectQueue(QueueName.ENRICHMENT)
    private readonly enrichmentQueue: Queue,
  ) {}

  async check(): Promise<HealthCheckResult> {
    const startedAt = Date.now();
    const [databaseStatus, redisStatus] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const isHealthy =
      databaseStatus.status === 'up' && redisStatus.status === 'up';

    return {
      isHealthy,
      payload: {
        status: isHealthy ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.round(process.uptime()),
        dependencies: {
          database: databaseStatus,
          redis: redisStatus,
        },
        responseTimeMs: Date.now() - startedAt,
      },
    };
  }

  private async checkDatabase(): Promise<DependencyStatus> {
    try {
      await this.dataSource.query('SELECT 1');

      return { status: 'up' };
    } catch (error) {
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  private async checkRedis(): Promise<DependencyStatus> {
    try {
      const redisClient = await this.enrichmentQueue.client;
      await redisClient.ping();

      return { status: 'up' };
    } catch (error) {
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }
}
