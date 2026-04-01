import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { OrderStatus } from 'src/shared/enums';

export class ListOrdersQueryDto {
  @ApiPropertyOptional({
    enum: OrderStatus,
    example: OrderStatus.ENRICHED,
    description: 'Status do pedido para filtrar os resultados',
  })
  @IsOptional()
  @IsEnum(OrderStatus, { message: 'Status do pedido inválido' })
  status?: OrderStatus;

  @ApiPropertyOptional({
    example: 1,
    default: 1,
    description: 'Número da página',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Página deve ser um número inteiro' })
  @Min(1, { message: 'Página deve ser maior ou igual a 1' })
  page = 1;

  @ApiPropertyOptional({
    example: 10,
    default: 10,
    maximum: 100,
    description: 'Número de itens por página',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limite deve ser um número inteiro' })
  @Min(1, { message: 'Limite deve ser maior ou igual a 1' })
  @Max(100, { message: 'Limite deve ser menor ou igual a 100' })
  limit = 10;
}
