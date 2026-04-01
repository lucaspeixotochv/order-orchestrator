import { Controller, Get, Res } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { HttpStatusCode } from 'axios';
import { Response } from 'express';
import {
  HealthResponseDto,
  HealthServiceUnavailableResponseDto,
} from 'src/modules/health/dto/response/health-response.dto';
import { HealthService } from 'src/modules/health/health.service';
import { ResponseDto } from 'src/shared/dto';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @ApiOperation({
    summary: 'Verificar saúde da aplicação',
    description: 'Valida a conectividade com PostgreSQL e Redis.',
  })
  @ApiOkResponse({
    description: 'Aplicação e dependências estão saudáveis.',
    type: HealthResponseDto,
  })
  @ApiServiceUnavailableResponse({
    description: 'Uma ou mais dependências estão indisponíveis.',
    type: HealthServiceUnavailableResponseDto,
  })
  @Get()
  async check(@Res({ passthrough: true }) response: Response) {
    const result = await this.healthService.check();
    response.status(
      result.isHealthy ? HttpStatusCode.Ok : HttpStatusCode.ServiceUnavailable,
    );

    return result.isHealthy
      ? ResponseDto.ok(result.payload, 'Healthcheck OK')
      : ResponseDto.fail('Healthcheck failed', result.payload);
  }
}
