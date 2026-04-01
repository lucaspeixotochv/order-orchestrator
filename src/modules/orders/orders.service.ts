import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OrderStatus } from 'src/shared/enums';
import { Order } from 'src/shared/infra/database/entities';
import { Repository } from 'typeorm';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  async listOrders(page: number, limit: number, status?: OrderStatus) {
    const [items, total] = await this.orderRepo.findAndCount({
      where: status ? { status } : {},
      relations: { customer: true, items: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOrderById(id: string) {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: { customer: true, items: true },
    });

    if (!order) {
      throw new NotFoundException(`Pedido ${id} não encontrado.`);
    }

    return order;
  }
}
