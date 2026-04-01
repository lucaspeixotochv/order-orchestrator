import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInitialSchema1743462000000 implements MigrationInterface {
  name = 'CreateInitialSchema1743462000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(
      `CREATE TYPE "public"."orders_currency_enum" AS ENUM('USD')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."orders_status_enum" AS ENUM('RECEIVED', 'PROCESSING', 'ENRICHED', 'FAILED_ENRICHMENT')`,
    );
    await queryRunner.query(
      `CREATE TABLE "customers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "name" character varying NOT NULL, "cep" character varying, CONSTRAINT "PK_133ec679a801fab5e070f73d3ea" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "external_id" character varying NOT NULL, "idempotency_key" character varying NOT NULL, "currency" "public"."orders_currency_enum" NOT NULL DEFAULT 'USD', "total_amount" numeric(14,2) NOT NULL, "status" "public"."orders_status_enum" NOT NULL DEFAULT 'RECEIVED', "brl_amount" numeric(14,2), "failure_reason" character varying, "customer_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_9285f6f0ca304fe368f4b9ff318" UNIQUE ("idempotency_key"), CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "order_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sku" character varying NOT NULL, "qty" integer NOT NULL, "unit_price" numeric(14,2) NOT NULL, "order_id" uuid NOT NULL, CONSTRAINT "PK_aeb06f9c622fe25847ff8a6de95" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_7f141f60b81b3f2ecf3d3d5b8ac" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD CONSTRAINT "FK_d2d47a7c8f4c4a1bdab3a0f6d1d" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP CONSTRAINT "FK_d2d47a7c8f4c4a1bdab3a0f6d1d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_7f141f60b81b3f2ecf3d3d5b8ac"`,
    );
    await queryRunner.query(`DROP TABLE "order_items"`);
    await queryRunner.query(`DROP TABLE "orders"`);
    await queryRunner.query(`DROP TABLE "customers"`);
    await queryRunner.query(`DROP TYPE "public"."orders_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."orders_currency_enum"`);
  }
}
