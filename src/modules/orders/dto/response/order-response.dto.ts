import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from 'src/shared/enums';

export class OrderCustomerResponseDto {
  @ApiProperty({ example: 'f2d4d87e-72e5-4ed0-92b5-649a503b6be2' })
  id: string;

  @ApiProperty({ example: 'maria@example.com' })
  email: string;

  @ApiProperty({ example: 'Maria da Silva' })
  name: string;

  @ApiPropertyOptional({ example: '01311000', nullable: true })
  cep?: string | null;
}

export class OrderItemResponseDto {
  @ApiProperty({ example: '0d12c767-c87f-4382-b5df-dcd5b6db8ad0' })
  id: string;

  @ApiProperty({ example: 'SKU-123' })
  sku: string;

  @ApiProperty({ example: 2 })
  qty: number;

  @ApiProperty({ example: 150.5 })
  unitPrice: number;

  @ApiProperty({ example: '8d57ec51-a0f8-4ac1-a3df-a7d6ff1628fa' })
  orderId: string;
}

export class OrderResponseDto {
  @ApiProperty({ example: '8d57ec51-a0f8-4ac1-a3df-a7d6ff1628fa' })
  id: string;

  @ApiProperty({ example: 'ORDER-1001' })
  externalId: string;

  @ApiProperty({ example: 'idem-order-1001' })
  idempotencyKey: string;

  @ApiProperty({ example: 'USD' })
  currency: string;

  @ApiProperty({ example: 301 })
  totalAmount: number;

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.ENRICHED })
  status: OrderStatus;

  @ApiPropertyOptional({ example: 1711.24, nullable: true })
  brlAmount?: number | null;

  @ApiPropertyOptional({
    example: 'Não foi possível obter a cotação USD para BRL',
    nullable: true,
  })
  failureReason?: string | null;

  @ApiProperty({ example: '2026-03-31T21:35:10.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-03-31T21:35:15.000Z' })
  updatedAt: Date;

  @ApiProperty({ type: () => OrderCustomerResponseDto })
  customer: OrderCustomerResponseDto;

  @ApiProperty({ type: () => [OrderItemResponseDto] })
  items: OrderItemResponseDto[];
}
