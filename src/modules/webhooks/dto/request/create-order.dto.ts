import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { Currency } from 'src/shared/enums';

export class CustomerDto {
  @ApiProperty({ example: 'maria@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Maria da Silva' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: '01311000' })
  @IsString()
  @IsOptional()
  @Matches(/^\d{8}$/, {
    message: 'CEP deve conter 8 numeros, sem caracteres especiais',
  })
  cep?: string;
}

export class OrderItemDto {
  @ApiProperty({ example: 'SKU-123' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  qty: number;

  @ApiProperty({ example: 150.5 })
  @IsNumber()
  @IsPositive()
  unit_price: number;
}

export class CreateOrderDto {
  @ApiProperty({ example: 'ORDER-1001' })
  @IsString()
  @IsNotEmpty()
  order_id: string;

  @ApiProperty({ type: () => CustomerDto, description: 'Dados do cliente' })
  @ValidateNested()
  @Type(() => CustomerDto)
  customer: CustomerDto;

  @ApiProperty({
    type: () => [OrderItemDto],
    description: 'Lista de itens do pedido',
  })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({
    enum: Currency,
    example: Currency.USD,
    description: 'Moeda da transação',
  })
  @IsEnum(Currency)
  @IsNotEmpty()
  currency: Currency;

  @ApiProperty({
    example: 'idem-order-1001',
    description: 'Chave única para garantir idempotência da requisição',
  })
  @IsString()
  @IsNotEmpty()
  idempotency_key: string;
}
