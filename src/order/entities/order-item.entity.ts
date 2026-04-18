import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Order } from './order.entity';
import { Product } from '../../product/entities/product.entity';

@Entity('order_items')
export class OrderItem {
  @ApiProperty({ description: 'Unique identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column()
  orderId: string;

  @ApiProperty({ description: 'Product ID (preserved even if product is soft-deleted)' })
  @Column()
  productId: string;

  /**
   * I use withDeleted relation so orders can still reference soft-deleted products
   */
  @ApiProperty({ type: () => Product, description: 'The product ordered' })
  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @ApiProperty({ description: 'Quantity ordered', example: 2 })
  @Column({ type: 'int' })
  quantity: number;

  @ApiProperty({ description: 'Price at time of order (snapshot)', example: 4.99 })
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  priceAtOrder: number;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;
}
