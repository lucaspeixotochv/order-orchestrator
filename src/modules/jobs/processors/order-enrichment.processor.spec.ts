import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Job, Queue, UnrecoverableError } from 'bullmq';
import { queueConfig } from '../../../shared/config';
import { OrderStatus, QueueName } from '../../../shared/enums';
import { Order } from '../../../shared/infra/database/entities';
import { OrderEnrichmentService } from '../services/order-enrichment.service';
import { EnrichmentJobData } from '../types';
import { OrderEnrichmentProcessor } from './order-enrichment.processor';
import { Repository } from 'typeorm';

describe('OrderEnrichmentProcessor', () => {
  let processor: OrderEnrichmentProcessor;
  let orderRepository: jest.Mocked<Repository<Order>>;
  let orderEnrichmentService: jest.Mocked<OrderEnrichmentService>;
  let enrichmentDlq: jest.Mocked<Queue>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        OrderEnrichmentProcessor,
        {
          provide: getRepositoryToken(Order),
          useValue: {
            findOne: jest.fn(),
            update: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: OrderEnrichmentService,
          useValue: {
            enrich: jest.fn(),
          },
        },
        {
          provide: getQueueToken(QueueName.ENRICHMENT_DLQ),
          useValue: {
            add: jest.fn(),
          },
        },
      ],
    }).compile();

    processor = module.get(OrderEnrichmentProcessor);
    orderRepository = module.get(getRepositoryToken(Order));
    orderEnrichmentService = module.get(OrderEnrichmentService);
    enrichmentDlq = module.get(getQueueToken(QueueName.ENRICHMENT_DLQ));
  });

  it('deve marcar o pedido como PROCESSING e depois ENRICHED ao processar com sucesso', async () => {
    const order = {
      id: 'order-1',
      status: OrderStatus.RECEIVED,
      customer: {},
      items: [],
    } as unknown as Order;
    const job = {
      data: { orderId: 'order-1' },
    } as Job<EnrichmentJobData>;

    orderRepository.findOne.mockResolvedValue(order);
    orderEnrichmentService.enrich.mockResolvedValue({ convertedAmount: 1711.24 });

    const result = await processor.process(job);

    expect(orderRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      relations: { customer: true, items: true },
    });
    expect(orderRepository.update).toHaveBeenCalledWith('order-1', {
      status: OrderStatus.PROCESSING,
      failureReason: null,
    });
    expect(orderEnrichmentService.enrich).toHaveBeenCalledWith(order);
    expect(orderRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'order-1',
        status: OrderStatus.ENRICHED,
        brlAmount: 1711.24,
        failureReason: null,
      }),
    );
    expect(result).toEqual({ convertedAmount: 1711.24 });
  });

  it('deve propagar erro tecnico no processamento sem marcar enriquecimento como concluido', async () => {
    const order = {
      id: 'order-1',
      status: OrderStatus.RECEIVED,
      customer: {},
      items: [],
    } as unknown as Order;
    const job = {
      data: { orderId: 'order-1' },
    } as Job<EnrichmentJobData>;

    orderRepository.findOne.mockResolvedValue(order);
    orderEnrichmentService.enrich.mockRejectedValue(new Error('timeout'));

    await expect(processor.process(job)).rejects.toThrow('timeout');

    expect(orderRepository.update).toHaveBeenCalledWith('order-1', {
      status: OrderStatus.PROCESSING,
      failureReason: null,
    });
    expect(orderRepository.save).not.toHaveBeenCalled();
  });

  it('deve falhar sem retry quando o pedido nao existir', async () => {
    const job = {
      data: { orderId: 'missing-order' },
    } as Job<EnrichmentJobData>;

    orderRepository.findOne.mockResolvedValue(null);

    await expect(processor.process(job)).rejects.toThrow(UnrecoverableError);
    expect(orderRepository.update).not.toHaveBeenCalled();
    expect(orderRepository.save).not.toHaveBeenCalled();
  });

  it('nao deve marcar falha definitiva nem enviar para a DLQ enquanto ainda houver tentativas', async () => {
    const job = {
      data: { orderId: 'order-1' },
      attemptsMade: 1,
      opts: { attempts: 3 },
    } as Job<EnrichmentJobData>;

    await processor.onFailed(job, new Error('timeout'));

    expect(orderRepository.update).not.toHaveBeenCalled();
    expect(enrichmentDlq.add).not.toHaveBeenCalled();
  });

  it('deve marcar FAILED_ENRICHMENT e enviar para a DLQ em falha tecnica definitiva', async () => {
    const job = {
      id: 'job-1',
      queueName: 'order-enrichment',
      data: { orderId: 'order-1' },
      attemptsMade: 3,
      opts: { attempts: 3 },
    } as Job<EnrichmentJobData>;
    const error = new Error('timeout');

    await processor.onFailed(job, error);

    expect(orderRepository.update).toHaveBeenCalledWith('order-1', {
      status: OrderStatus.FAILED_ENRICHMENT,
      failureReason: 'timeout',
    });
    expect(enrichmentDlq.add).toHaveBeenCalledWith(
      queueConfig[QueueName.ENRICHMENT_DLQ].jobName,
      {
        orderId: 'order-1',
        failedReason: 'timeout',
        attemptsMade: 3,
        originalJobId: 'job-1',
        originalQueue: 'order-enrichment',
        payload: { orderId: 'order-1' },
      },
      {
        removeOnComplete: 1000,
      },
    );
  });

  it('deve marcar FAILED_ENRICHMENT e nao enviar para a DLQ em falha de negocio, mesmo com attempts maiores', async () => {
    const job = {
      data: { orderId: 'order-1' },
      attemptsMade: 1,
      opts: { attempts: 3 },
    } as Job<EnrichmentJobData>;
    const error = new UnrecoverableError('moeda nao suportada');

    await processor.onFailed(job, error);

    expect(orderRepository.update).toHaveBeenCalledWith('order-1', {
      status: OrderStatus.FAILED_ENRICHMENT,
      failureReason: 'moeda nao suportada',
    });
    expect(enrichmentDlq.add).not.toHaveBeenCalled();
  });
});
