import { ApiProperty } from '@nestjs/swagger';
import { OrderResponseDto } from 'src/modules/orders/dto/response/order-response.dto';

export class GetOrderResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Pedido encontrado com sucesso.' })
  message: string;

  @ApiProperty({ type: () => OrderResponseDto })
  data: OrderResponseDto;
}

export class GetOrderNotFoundResponseDto {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiProperty({
    example: 'Pedido 8d57ec51-a0f8-4ac1-a3df-a7d6ff1628fa não encontrado.',
  })
  message: string;

  @ApiProperty({ type: 'string', example: null, nullable: true })
  data: null;
}
