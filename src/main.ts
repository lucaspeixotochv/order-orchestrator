import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { AppModule } from 'src/app.module';
import { validateEnv } from 'src/shared/config/env.validation';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  validateEnv();

  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Order Orchestrator API')
    .setDescription('Documentação dos endpoints de pedidos, webhooks e filas.')
    .setVersion('1.0.0')
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

  app.use(
    '/docs/scalar',
    apiReference({
      content: swaggerDocument,
      pageTitle: 'Order Orchestrator API Reference',
      theme: 'moon',
    }),
  );

  await app.listen(process.env.PORT ?? 3000);

  logger.log(`Aplicação em execução na porta ${process.env.PORT ?? 3000}`);
  logger.log('Scalar disponível em /docs/scalar');
}
bootstrap();
