import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HttpStatusCode } from 'axios';
import { CreateOrderDto } from 'src/modules/webhooks/dto/request/create-order.dto';
import { ReceiveOrderResponseDto } from 'src/modules/webhooks/dto/response/receive-order-response.dto';
import { WebhooksService } from 'src/modules/webhooks/webhooks.service';
import { ResponseDto } from 'src/shared/dto';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @ApiOperation({
    summary: 'Receber pedido via webhook',
    description: 'Cria um pedido e enfileira o enriquecimento assíncrono.',
  })
  @ApiBody({ type: CreateOrderDto })
  @ApiOkResponse({
    description: 'Pedido recebido ou retornado por idempotência.',
    type: ReceiveOrderResponseDto,
  })
  @Post('orders')
  @HttpCode(HttpStatusCode.Ok)
  async receiveOrder(@Body() dto: CreateOrderDto) {
    const { order, created } = await this.webhooksService.receiveOrder(dto);

    return ResponseDto.ok(
      order,
      created
        ? 'Pedido recebido com sucesso.'
        : 'Pedido já processado anteriormente.',
    );
  }
}
