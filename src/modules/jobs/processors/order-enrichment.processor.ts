import {
  InjectQueue,
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job, Queue, UnrecoverableError } from 'bullmq';
import { OrderEnrichmentService } from 'src/modules/jobs/services/order-enrichment.service';
import { EnrichmentJobData } from 'src/modules/jobs/types';
import { queueConfig } from 'src/shared/config';
import { OrderStatus, QueueName } from 'src/shared/enums';
import { Order } from 'src/shared/infra/database/entities';
import { Repository } from 'typeorm';

@Injectable()
@Processor(QueueName.ENRICHMENT)
export class OrderEnrichmentProcessor extends WorkerHost {
  private readonly logger = new Logger(OrderEnrichmentProcessor.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly orderEnrichmentService: OrderEnrichmentService,
    @InjectQueue(QueueName.ENRICHMENT_DLQ)
    private readonly enrichmentDlq: Queue,
  ) {
    super();
  }

  async process(job: Job<EnrichmentJobData>) {
    this.logger.log(
      `Iniciando enriquecimento do pedido ${job.data.orderId} (tentativa ${job.attemptsMade + 1})`,
    );

    const order = await this.orderRepository.findOne({
      where: { id: job.data.orderId },
      relations: { customer: true, items: true },
    });

    if (!order) {
      throw new UnrecoverableError(
        `Pedido ${job.data.orderId} não encontrado para enriquecimento`,
      );
    }

    try {
      await this.updateOrderStatus(order.id, OrderStatus.PROCESSING, null);

      const enrichedData = await this.orderEnrichmentService.enrich(order);

      order.status = OrderStatus.ENRICHED;
      order.brlAmount = enrichedData.convertedAmount;
      order.failureReason = null;
      await this.orderRepository.save(order);

      return enrichedData;
    } catch (error) {
      const normalizedError =
        error instanceof Error ? error : new Error('Falha desconhecida');

      this.logger.error(
        `Falha ao processar enriquecimento do pedido ${job.data.orderId}: ${normalizedError.message}`,
      );

      throw normalizedError;
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<EnrichmentJobData> | undefined, error: Error) {
    if (!job) {
      return;
    }

    const maxAttempts =
      typeof job.opts.attempts === 'number' && job.opts.attempts > 0
        ? job.opts.attempts
        : 1;

    if (error instanceof UnrecoverableError) {
      await this.updateOrderStatus(
        job.data.orderId,
        OrderStatus.FAILED_ENRICHMENT,
        error.message,
      );

      this.logger.warn(
        `Falha de negócio no enriquecimento do pedido ${job.data.orderId}: ${error.message}`,
      );
      return;
    }

    if (job.attemptsMade < maxAttempts) {
      this.logger.warn(
        `Nova tentativa de enriquecimento ${job.attemptsMade}/${maxAttempts} para o pedido ${job.data.orderId}: ${error.message}`,
      );
      return;
    }

    await this.updateOrderStatus(
      job.data.orderId,
      OrderStatus.FAILED_ENRICHMENT,
      error.message,
    );

    const dlqQueueConfig = queueConfig[QueueName.ENRICHMENT_DLQ];

    await this.enrichmentDlq.add(
      dlqQueueConfig.jobName,
      {
        orderId: job.data.orderId,
        failedReason: error.message,
        attemptsMade: job.attemptsMade,
        originalJobId: job.id,
        originalQueue: job.queueName,
        payload: job.data,
      },
      {
        removeOnComplete: dlqQueueConfig.removeOnComplete,
      },
    );

    this.logger.error(
      `Falha definitiva no enriquecimento do pedido ${job.data.orderId} após ${job.attemptsMade} tentativas`,
    );

    this.logger.debug(
      `Job ${job.id} movido para DLQ ${QueueName.ENRICHMENT_DLQ} `,
    );
  }

  private async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    failureReason: string | null,
  ) {
    await this.orderRepository.update(orderId, {
      status,
      failureReason,
    });
  }
}
