import { Order } from 'src/shared/infra/database/entities/order.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  email: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  cep: string | null;

  @OneToMany(() => Order, (order) => order.customer)
  orders: Order[];
}
