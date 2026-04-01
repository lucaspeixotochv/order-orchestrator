import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ListOrdersQueryDto } from 'src/modules/orders/dto/request/list-orders-query.dto';
import {
  GetOrderNotFoundResponseDto,
  GetOrderResponseDto,
} from 'src/modules/orders/dto/response/get-order-response.dto';
import { ListOrdersResponseDto } from 'src/modules/orders/dto/response/list-orders-response.dto';
import { OrdersService } from 'src/modules/orders/orders.service';
import { ResponseDto } from 'src/shared/dto';

@ApiTags('Pedidos')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @ApiOperation({
    summary: 'Listar pedidos',
    description: 'Lista pedidos com paginação e filtro opcional por status.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['RECEIVED', 'PROCESSING', 'ENRICHED', 'FAILED_ENRICHMENT'],
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiOkResponse({
    description: 'Pedidos listados com sucesso.',
    type: ListOrdersResponseDto,
  })
  @Get()
  async listOrders(@Query() query: ListOrdersQueryDto) {
    const orders = await this.ordersService.listOrders(
      query.page,
      query.limit,
      query.status,
    );

    return ResponseDto.ok({
      success: true,
      message: 'Pedidos listados com sucesso.',
      data: orders,
    });
  }

  @ApiOperation({
    summary: 'Buscar pedido por id',
    description: 'Retorna os detalhes completos de um pedido.',
  })
  @ApiParam({ name: 'id', example: '8d57ec51-a0f8-4ac1-a3df-a7d6ff1628fa' })
  @ApiOkResponse({
    description: 'Pedido encontrado com sucesso.',
    type: GetOrderResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Pedido não encontrado.',
    type: GetOrderNotFoundResponseDto,
  })
  @Get(':id')
  async getOrderById(@Param('id') id: string) {
    const order = await this.ordersService.getOrderById(id);

    return ResponseDto.ok({
      success: true,
      message: 'Pedido encontrado com sucesso.',
      data: order,
    });
  }
}
