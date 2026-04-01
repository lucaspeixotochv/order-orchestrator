import { ApiProperty } from '@nestjs/swagger';
import { OrderResponseDto } from 'src/modules/orders/dto/response/order-response.dto';

class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 57 })
  total: number;

  @ApiProperty({ example: 6 })
  totalPages: number;
}

class ListOrdersDataResponseDto {
  @ApiProperty({ type: () => [OrderResponseDto] })
  items: OrderResponseDto[];

  @ApiProperty({ type: () => PaginationMetaDto })
  meta: PaginationMetaDto;
}

export class ListOrdersResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Pedidos listados com sucesso.' })
  message: string;

  @ApiProperty({ type: () => ListOrdersDataResponseDto })
  data: ListOrdersDataResponseDto;
}
