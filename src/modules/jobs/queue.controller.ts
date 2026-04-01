import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetQueueMetricsResponseDto } from 'src/modules/jobs/dto/response/get-queue-metrics-response.dto';
import { QueueMetricsService } from 'src/modules/jobs/services/queue-metrics.service';
import { ResponseDto } from 'src/shared/dto';

@ApiTags('Filas')
@Controller('queue')
export class QueueController {
  constructor(private readonly queueMetricsService: QueueMetricsService) {}

  @ApiOperation({
    summary: 'Consultar métricas da fila',
    description:
      'Exibe contadores da fila principal de enriquecimento e da DLQ.',
  })
  @ApiOkResponse({
    description: 'Métricas da fila carregadas com sucesso.',
    type: GetQueueMetricsResponseDto,
  })
  @Get('metrics')
  async getMetrics() {
    const metrics = await this.queueMetricsService.getMetrics();

    return ResponseDto.ok({
      success: true,
      message: 'Métricas da fila carregadas com sucesso.',
      data: metrics,
    });
  }
}
