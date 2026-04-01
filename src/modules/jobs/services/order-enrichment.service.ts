import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Decimal from 'decimal.js';
import { lastValueFrom } from 'rxjs';
import {
  OrderEnrichmentResult,
  UsdBrlExchangeRateResponse,
} from 'src/modules/jobs/types';
import { Order } from 'src/shared/infra/database/entities';

@Injectable()
export class OrderEnrichmentService {
  private readonly logger = new Logger(OrderEnrichmentService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async enrich(order: Order): Promise<OrderEnrichmentResult> {
    const exchangeRate = await this.getUsdBrlExchangeRate();

    const originalAmount = new Decimal(order.totalAmount);
    const convertedAmount = originalAmount
      .mul(exchangeRate)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

    return {
      convertedAmount: convertedAmount.toNumber(),
    };
  }

  private async getUsdBrlExchangeRate(): Promise<Decimal> {
    const exchangeRateUrl = this.configService.getOrThrow<string>(
      'FRANKFURTER_API_URL',
    );

    let data: UsdBrlExchangeRateResponse;

    try {
      const response = await lastValueFrom(
        this.httpService.get<UsdBrlExchangeRateResponse>(exchangeRateUrl, {
          timeout: 5000,
        }),
      );

      data = response.data;
    } catch (error) {
      this.logger.error(
        'Erro ao obter cotação USD/BRL da API externa: ' + error.message,
      );

      throw error;
    }

    const exchangeRateValue = data.rates.BRL;

    if (!exchangeRateValue) {
      throw new Error(
        'Resposta da API de câmbio está em formato inesperado: ' +
          JSON.stringify(data),
      );
    }

    const exchangeRate = new Decimal(exchangeRateValue);

    if (!exchangeRate.isFinite() || exchangeRate.lte(0)) {
      throw new Error('Cotação USD para BRL inválida: ' + exchangeRateValue);
    }

    return exchangeRate;
  }
}
