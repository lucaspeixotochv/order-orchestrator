import { InjectQueue } from '@nestjs/bullmq';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { CreateOrderDto } from 'src/modules/webhooks/dto/request/create-order.dto';
import { buildEnrichmentJobOptions, queueConfig } from 'src/shared/config';
import { QueueName } from 'src/shared/enums';
import { Customer, Order, OrderItem } from 'src/shared/infra/database/entities';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly dataSource: DataSource,
    @InjectQueue(QueueName.ENRICHMENT) private readonly enrichmentQueue: Queue,
  ) {}

  async receiveOrder(dto: CreateOrderDto) {
    const existing = await this.orderRepo.findOne({
      where: { idempotencyKey: dto.idempotency_key },
      relations: { customer: true, items: true },
    });

    if (existing) {
      return { order: existing, created: false };
    }

    const totalAmount = dto.items.reduce(
      (sum, item) => sum + item.qty * item.unit_price,
      0,
    );

    const order = await this.dataSource.transaction(async (manager) => {
      let customer = await manager.findOne(Customer, {
        where: { email: dto.customer.email },
      });

      if (!customer) {
        const newCustomer = manager.create(Customer, {
          email: dto.customer.email,
          name: dto.customer.name,
          cep: dto.customer.cep ?? null,
        });
        customer = await manager.save(newCustomer);
      }

      const newOrder = manager.create(Order, {
        externalId: dto.order_id,
        idempotencyKey: dto.idempotency_key,
        currency: dto.currency,
        totalAmount,
        customerId: customer.id,
      });

      await manager.save(newOrder);

      const items = dto.items.map((item) =>
        manager.create(OrderItem, {
          sku: item.sku,
          qty: item.qty,
          unitPrice: item.unit_price,
          orderId: newOrder.id,
        }),
      );
      await manager.save(items);

      newOrder.customer = customer;
      newOrder.items = items;
      return newOrder;
    });

    await this.enqueueEnrichment(order.id);

    return { order, created: true };
  }

  private async enqueueEnrichment(orderId: string) {
    try {
      await this.enrichmentQueue.add(
        queueConfig[QueueName.ENRICHMENT].jobName,
        { orderId },
        buildEnrichmentJobOptions(orderId),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'erro desconhecido';

      this.logger.error(
        `Falha ao enfileirar enriquecimento do pedido ${orderId}: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw new InternalServerErrorException(
        `Pedido ${orderId} persistido, mas nao foi possivel enfileirar o enriquecimento.`,
      );
    }
  }
}
