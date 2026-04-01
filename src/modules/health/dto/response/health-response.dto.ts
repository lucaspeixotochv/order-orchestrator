import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class DependencyStatusResponseDto {
  @ApiProperty({ enum: ['up', 'down'], example: 'up' })
  status: 'up' | 'down';

  @ApiPropertyOptional({
    example: 'connect ECONNREFUSED 127.0.0.1:6379',
    nullable: true,
  })
  error?: string;
}

class HealthDependenciesResponseDto {
  @ApiProperty({ type: () => DependencyStatusResponseDto })
  database: DependencyStatusResponseDto;

  @ApiProperty({ type: () => DependencyStatusResponseDto })
  redis: DependencyStatusResponseDto;
}

class HealthDataResponseDto {
  @ApiProperty({ enum: ['ok', 'degraded'], example: 'ok' })
  status: 'ok' | 'degraded';

  @ApiProperty({ example: '2026-04-01T03:15:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: 123 })
  uptimeSeconds: number;

  @ApiProperty({ type: () => HealthDependenciesResponseDto })
  dependencies: HealthDependenciesResponseDto;

  @ApiProperty({ example: 12 })
  responseTimeMs: number;
}

export class HealthResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Healthcheck OK' })
  message: string;

  @ApiProperty({ type: () => HealthDataResponseDto })
  data: HealthDataResponseDto;
}

export class HealthServiceUnavailableResponseDto {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiProperty({ example: 'Healthcheck failed' })
  message: string;

  @ApiProperty({ type: () => HealthDataResponseDto })
  data: HealthDataResponseDto;
}
