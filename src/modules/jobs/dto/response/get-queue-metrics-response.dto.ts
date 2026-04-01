import { ApiProperty } from '@nestjs/swagger';

class QueueJobCountsResponseDto {
  @ApiProperty({ example: 2 })
  waiting: number;

  @ApiProperty({ example: 1 })
  active: number;

  @ApiProperty({ example: 25 })
  completed: number;

  @ApiProperty({ example: 3 })
  failed: number;

  @ApiProperty({ example: 0 })
  delayed: number;

  @ApiProperty({ example: 0 })
  paused: number;
}

class EnrichmentQueueMetricsResponseDto {
  @ApiProperty({ example: 'order_enrichment' })
  name: string;

  @ApiProperty({ example: false })
  isPaused: boolean;

  @ApiProperty({ example: 1 })
  workersCount: number;

  @ApiProperty({ type: () => QueueJobCountsResponseDto })
  jobs: QueueJobCountsResponseDto;
}

class DlqQueueMetricsResponseDto {
  @ApiProperty({ example: 'order_enrichment_dlq' })
  name: string;

  @ApiProperty({ type: () => QueueJobCountsResponseDto })
  jobs: QueueJobCountsResponseDto;
}

class GetQueueMetricsDataResponseDto {
  @ApiProperty({ type: () => EnrichmentQueueMetricsResponseDto })
  enrichmentQueue: EnrichmentQueueMetricsResponseDto;

  @ApiProperty({ type: () => DlqQueueMetricsResponseDto })
  dlqQueue: DlqQueueMetricsResponseDto;
}

export class GetQueueMetricsResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Métricas da fila carregadas com sucesso.' })
  message: string;

  @ApiProperty({ type: () => GetQueueMetricsDataResponseDto })
  data: GetQueueMetricsDataResponseDto;
}
