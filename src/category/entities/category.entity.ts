import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Product } from '../../product/entities/product.entity';

@Entity('categories')
export class Category {
  @ApiProperty({ description: 'Unique identifier', example: 'uuid-string' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Category name', example: 'Dairy' })
  @Column({ unique: true })
  name: string;

  @ApiProperty({ description: 'Category description', example: 'Milk, cheese, yogurt and more' })
  @Column({ nullable: true })
  description: string;

  @ApiProperty({ type: () => [Product] })
  @OneToMany(() => Product, (product) => product.category)
  products: Product[];

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
