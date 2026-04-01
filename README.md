# Order Orchestrator

API em NestJS para recebimento de pedidos, persistência no PostgreSQL, enriquecimento assíncrono com BullMQ e consulta do ciclo de processamento.

## Visão Geral

Fluxo principal da aplicação:

1. Receber um pedido em `POST /webhooks/orders`
2. Validar o payload e aplicar idempotência por `idempotency_key`
3. Buscar `Customer` por e-mail e criar caso ainda não exista
4. Persistir o pedido com referência para `customer_id` e seus itens
5. Enfileirar um job na fila `order-enrichment`
6. Processar o job de forma assíncrona
7. Consultar cotação USD/BRL em uma API externa
8. Atualizar o pedido com status final e valor convertido em BRL
9. Em falhas técnicas, aplicar retry com backoff exponencial e enviar para DLQ quando necessário

## Stack

- NestJS
- TypeORM
- PostgreSQL
- BullMQ
- Redis
- Swagger + Scalar
- Bull Board
- Zod para validação de ambiente

## Módulos

- `webhooks`
  Recebimento do pedido e entrada no fluxo
- `orders`
  Consulta de pedidos por lista e detalhe
- `jobs`
  Filas, processor, métricas e DLQ

## Filas

A aplicação trabalha com duas filas:

- `order-enrichment`
  Fila principal de enriquecimento
- `order-enrichment-dlq`
  Fila de dead-letter para falhas técnicas definitivas

Os jobs usam:

- `attempts: 3`
- `backoff` exponencial com `delay` de `2000ms`
- `jobId` no formato `enrich-order-<orderId>`

Regras atuais do worker:

- ao iniciar o processamento, o pedido vai para `PROCESSING`
- se o enriquecimento concluir, o pedido vai para `ENRICHED`
- se o pedido não existir, o worker lança `UnrecoverableError`
- falhas técnicas podem sofrer retry
- ao esgotar as tentativas, o pedido vai para `FAILED_ENRICHMENT` e o job é enviado para a DLQ
- falhas de negócio com `UnrecoverableError` não vão para a DLQ

Exemplo de monitoramento por meio dos logs de um job no qual foram realizadas três tentativas e, após isso, ele foi encaminhado para a DLQ.

![alt text](./assets/monitoring-logs-example.png)

## Status do Pedido

- `RECEIVED`
- `PROCESSING`
- `ENRICHED`
- `FAILED_ENRICHMENT`

## Variáveis de Ambiente

Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

Variáveis mínimas:

```dotenv
DATABASE_URL="postgresql://postgres:your_postgres_password@localhost:5432/orchestrator_db"
REDIS_URL="redis://:redis_secret@localhost:6379"
FRANKFURTER_API_URL="https://api.frankfurter.dev/v1/latest?base=USD&symbols=BRL"
PORT=3000
NODE_ENV=development
BULL_BOARD_USER=admin
BULL_BOARD_PASS=admin_password
```

## Banco de Dados e Migrations

O projeto usa migrations do TypeORM. O schema não é sincronizado automaticamente em runtime.

Scripts disponíveis:

```bash
npm run migration:generate
npm run migration:create
npm run migration:run
npm run migration:run:prod
npm run migration:revert
```

Fluxo recomendado:

1. alterar as entidades
2. gerar ou criar a migration
3. revisar o arquivo da migration
4. executar `npm run migration:run`
5. subir a aplicação

Em produção:

- `synchronize` permanece `false`
- as migrations devem ser versionadas no repositório
- o deploy deve aplicar `migration:run:prod` antes de iniciar a API

## Como Rodar

### 1. Pré-requisitos

- Node.js 20+
- pnpm
- Docker + Docker Compose

### 2. Subir infraestrutura

```bash
docker compose up -d
```

### 3. Instalar dependências

```bash
pnpm install
```

### 4. Rodar a aplicação

Aplicar migrations manualmente:

```bash
npm run migration:run
```

Em seguida, inicie a aplicação em desenvolvimento:

```bash
pnpm start:dev
```

Aplicação:

- `http://localhost:3000`

## Documentação e Administração

- Scalar: `http://localhost:3000/docs/scalar`

![alt text](./assets/scalar-example.png)

- Bull Board: `http://localhost:3000/bull-board`

Bull Board usa autenticação básica com:

- `BULL_BOARD_USER`
- `BULL_BOARD_PASS`

![alt text](./assets/bull-board-example.png)

## Endpoints

### `POST /webhooks/orders`

Recebe um pedido, reaproveita o `Customer` por e-mail quando existir, persiste os dados e enfileira o enriquecimento.

Exemplo de request:

```json
{
  "order_id": "ORDER-1001",
  "customer": {
    "email": "maria@example.com",
    "name": "Maria da Silva",
    "cep": "01311000"
  },
  "items": [
    {
      "sku": "SKU-123",
      "qty": 2,
      "unit_price": 150.5
    }
  ],
  "currency": "USD",
  "idempotency_key": "idem-order-1001"
}
```

Exemplo com `curl`:

```bash
curl -X POST http://localhost:3000/webhooks/orders \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "ORDER-1001",
    "customer": {
      "email": "maria@example.com",
      "name": "Maria da Silva",
      "cep": "01311000"
    },
    "items": [
      {
        "sku": "SKU-123",
        "qty": 2,
        "unit_price": 150.5
      }
    ],
    "currency": "USD",
    "idempotency_key": "idem-order-1001"
  }'
```

Resposta:

- se o pedido for novo, retorna mensagem de sucesso
- se a `idempotency_key` já existir, retorna o pedido existente sem reenfileirar
- o pedido passa a referenciar o cliente via `customerId`

### `GET /orders`

Lista pedidos com paginação e filtro opcional por status.

Parâmetros:

- `page` default `1`
- `limit` default `10`
- `status` opcional: `RECEIVED`, `PROCESSING`, `ENRICHED`, `FAILED_ENRICHMENT`

Exemplo:

```bash
curl "http://localhost:3000/orders?page=1&limit=10&status=ENRICHED"
```

### `GET /orders/:id`

Retorna os detalhes de um pedido específico.

Exemplo:

```bash
curl "http://localhost:3000/orders/8d57ec51-a0f8-4ac1-a3df-a7d6ff1628fa"
```

### `GET /queue/metrics`

Retorna métricas da fila principal e da DLQ, incluindo:

- quantidade de jobs por estado
- quantidade de workers
- status de pausa da fila principal

Exemplo:

```bash
curl "http://localhost:3000/queue/metrics"
```

### `GET /health`

Retorna o estado da aplicação e das dependências principais.

- responde `200` quando banco e Redis estão saudáveis
- responde `503` quando alguma dependência estiver indisponível

Exemplo:

```bash
curl "http://localhost:3000/health"
```

Neste caso, utilizei o Uptime Kuma apenas para demonstrar o monitoramento do endpoint de health.

![alt text](./assets/uptime-kuma-example.png)

## Estrutura de Resposta

Os controllers usam `ResponseDto`, então as respostas seguem o formato:

```json
{
  "success": true,
  "message": "Mensagem da operação",
  "data": {}
}
```

## Scripts Úteis

```bash
pnpm start:dev
pnpm build
pnpm start:prod
npm run migration:run
pnpm test
pnpm test:cov
pnpm lint
```

## Testes

Os testes atuais cobrem principalmente:

- idempotência e enqueue no módulo `webhooks`
- criação e reaproveitamento de `Customer` por e-mail
- transições de status no processor de enriquecimento
- comportamento de retry, falha definitiva e DLQ

Executar:

```bash
pnpm test
```
