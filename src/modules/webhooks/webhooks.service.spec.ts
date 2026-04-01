import { getQueueToken } from '@nestjs/bullmq';
import { InternalServerErrorException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { DataSource, Repository } from 'typeorm';
import { queueConfig } from '../../shared/config';
import { QueueName } from '../../shared/enums';
import { OrderStatus } from '../../shared/enums';
import { Customer, Order } from '../../shared/infra/database/entities';
import { WebhooksService } from './webhooks.service';

describe('WebhooksService', () => {
  let service: WebhooksService;
  let orderRepo: jest.Mocked<Repository<Order>>;
  let dataSource: {
    transaction: jest.Mock;
  };
  let enrichmentQueue: jest.Mocked<Queue>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        WebhooksService,
        {
          provide: getRepositoryToken(Order),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
        },
        {
          provide: getQueueToken(QueueName.ENRICHMENT),
          useValue: {
            add: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(WebhooksService);
    orderRepo = module.get(getRepositoryToken(Order));
    dataSource = module.get(DataSource);
    enrichmentQueue = module.get(getQueueToken(QueueName.ENRICHMENT));
  });

  it('deve retornar pedido existente quando a chave de idempotencia ja existir', async () => {
    const existingOrder = {
      id: 'order-1',
      idempotencyKey: 'idem-1',
      status: OrderStatus.ENRICHED,
      customer: {},
      items: [],
    } as Order;

    orderRepo.findOne.mockResolvedValue(existingOrder);

    const result = await service.receiveOrder({
      order_id: 'ORDER-1001',
      customer: {
        email: 'maria@example.com',
        name: 'Maria da Silva',
        cep: '01311000',
      },
      items: [{ sku: 'SKU-123', qty: 2, unit_price: 150.5 }],
      currency: 'USD',
      idempotency_key: 'idem-1',
    });

    expect(result).toEqual({ order: existingOrder, created: false });
    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(enrichmentQueue.add).not.toHaveBeenCalled();
  });

  it('deve manter idempotencia e nao reenfileirar pedido existente mesmo se ainda estiver recebido', async () => {
    const existingOrder = {
      id: 'order-1',
      idempotencyKey: 'idem-1',
      status: OrderStatus.RECEIVED,
      customer: {},
      items: [],
    } as Order;

    orderRepo.findOne.mockResolvedValue(existingOrder);

    const result = await service.receiveOrder({
      order_id: 'ORDER-1001',
      customer: {
        email: 'maria@example.com',
        name: 'Maria da Silva',
        cep: '01311000',
      },
      items: [{ sku: 'SKU-123', qty: 2, unit_price: 150.5 }],
      currency: 'USD',
      idempotency_key: 'idem-1',
    });

    expect(result).toEqual({ order: existingOrder, created: false });
    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(enrichmentQueue.add).not.toHaveBeenCalled();
  });

  it('deve persistir o pedido e enfileirar o job com attempts e backoff', async () => {
    const createdOrder = {
      id: 'order-1',
      customerId: 'customer-1',
      externalId: 'ORDER-1001',
      idempotencyKey: 'idem-1',
      customer: {
        id: 'customer-1',
        email: 'maria@example.com',
        name: 'Maria da Silva',
        cep: '01311000',
      },
      items: [
        {
          sku: 'SKU-123',
          qty: 2,
          unitPrice: 150.5,
          orderId: 'order-1',
        },
      ],
      totalAmount: 301,
      currency: 'USD',
    } as unknown as Order;

    orderRepo.findOne.mockResolvedValue(null);
    dataSource.transaction.mockResolvedValue(createdOrder);

    const result = await service.receiveOrder({
      order_id: 'ORDER-1001',
      customer: {
        email: 'maria@example.com',
        name: 'Maria da Silva',
        cep: '01311000',
      },
      items: [{ sku: 'SKU-123', qty: 2, unit_price: 150.5 }],
      currency: 'USD',
      idempotency_key: 'idem-1',
    });

    expect(result).toEqual({ order: createdOrder, created: true });
    expect(enrichmentQueue.add).toHaveBeenCalledWith(
      queueConfig[QueueName.ENRICHMENT].jobName,
      { orderId: 'order-1' },
      {
        jobId: 'enrich-order-order-1',
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    );
  });

  it('deve criar customer quando nao existir outro com o mesmo email', async () => {
    const manager = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((_entity, data) => data),
      save: jest
        .fn()
        .mockResolvedValueOnce({
          id: 'customer-1',
          email: 'maria@example.com',
          name: 'Maria da Silva',
          cep: '01311000',
        })
        .mockResolvedValueOnce({
          id: 'order-1',
          customerId: 'customer-1',
          externalId: 'ORDER-1001',
          idempotencyKey: 'idem-1',
          currency: 'USD',
          totalAmount: 301,
        })
        .mockResolvedValueOnce([
          {
            id: 'item-1',
            sku: 'SKU-123',
            qty: 2,
            unitPrice: 150.5,
            orderId: 'order-1',
          },
        ]),
    };

    orderRepo.findOne.mockResolvedValue(null);
    dataSource.transaction.mockImplementation(async (callback) =>
      callback(manager),
    );

    const result = await service.receiveOrder({
      order_id: 'ORDER-1001',
      customer: {
        email: 'maria@example.com',
        name: 'Maria da Silva',
        cep: '01311000',
      },
      items: [{ sku: 'SKU-123', qty: 2, unit_price: 150.5 }],
      currency: 'USD',
      idempotency_key: 'idem-1',
    });

    expect(manager.findOne).toHaveBeenCalledWith(Customer, {
      where: { email: 'maria@example.com' },
    });
    expect(manager.save).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        email: 'maria@example.com',
        name: 'Maria da Silva',
        cep: '01311000',
      }),
    );
    expect(manager.save).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        externalId: 'ORDER-1001',
        customerId: 'customer-1',
      }),
    );
    expect(result.created).toBe(true);
    expect(result.order.customerId).toBe('customer-1');
  });

  it('deve falhar quando persistir o pedido mas nao conseguir enfileirar o job', async () => {
    const createdOrder = {
      id: 'order-1',
      customerId: 'customer-1',
      externalId: 'ORDER-1001',
      idempotencyKey: 'idem-1',
      customer: {
        id: 'customer-1',
        email: 'maria@example.com',
        name: 'Maria da Silva',
        cep: '01311000',
      },
      items: [
        {
          sku: 'SKU-123',
          qty: 2,
          unitPrice: 150.5,
          orderId: 'order-1',
        },
      ],
      totalAmount: 301,
      currency: 'USD',
    } as unknown as Order;

    orderRepo.findOne.mockResolvedValue(null);
    dataSource.transaction.mockResolvedValue(createdOrder);
    enrichmentQueue.add.mockRejectedValue(new Error('redis offline'));

    await expect(
      service.receiveOrder({
        order_id: 'ORDER-1001',
        customer: {
          email: 'maria@example.com',
          name: 'Maria da Silva',
          cep: '01311000',
        },
        items: [{ sku: 'SKU-123', qty: 2, unit_price: 150.5 }],
        currency: 'USD',
        idempotency_key: 'idem-1',
      }),
    ).rejects.toThrow(InternalServerErrorException);

    expect(enrichmentQueue.add).toHaveBeenCalledWith(
      queueConfig[QueueName.ENRICHMENT].jobName,
      { orderId: 'order-1' },
      {
        jobId: 'enrich-order-order-1',
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    );
  });

  it('deve reutilizar customer existente ao criar um novo pedido com o mesmo email', async () => {
    const existingCustomer = {
      id: 'customer-1',
      email: 'maria@example.com',
      name: 'Maria da Silva',
      cep: '01311000',
    } as Customer;

    const manager = {
      findOne: jest.fn().mockResolvedValue(existingCustomer),
      create: jest.fn((_entity, data) => data),
      save: jest.fn(async (value) => {
        if (Array.isArray(value)) {
          return value;
        }

        return {
          id: value.id ?? 'generated-id',
          ...value,
        };
      }),
    };

    orderRepo.findOne.mockResolvedValue(null);
    dataSource.transaction.mockImplementation(async (callback) =>
      callback(manager),
    );

    const result = await service.receiveOrder({
      order_id: 'ORDER-1002',
      customer: {
        email: 'maria@example.com',
        name: 'Maria da Silva',
        cep: '01311000',
      },
      items: [{ sku: 'SKU-123', qty: 2, unit_price: 150.5 }],
      currency: 'USD',
      idempotency_key: 'idem-2',
    });

    expect(manager.findOne).toHaveBeenCalledWith(Customer, {
      where: { email: 'maria@example.com' },
    });
    expect(manager.save).not.toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'maria@example.com',
        name: 'Maria da Silva',
        cep: '01311000',
      }),
    );
    expect(result.created).toBe(true);
    expect(result.order.customerId).toBe('customer-1');
  });
});
