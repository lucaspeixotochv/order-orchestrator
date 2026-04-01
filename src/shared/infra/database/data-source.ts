import * as dotenv from 'dotenv';
import { join } from 'path';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Customer, Order, OrderItem } from './entities';

dotenv.config();

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [Order, Customer, OrderItem],
  migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
});
