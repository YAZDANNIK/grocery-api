import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  VersionColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Category } from '../../category/entities/category.entity';

@Entity('products')
export class Product {
  @ApiProperty({ description: 'Unique identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Product name', example: 'Organic Whole Milk' })
  @Column()
  name: string;

  @ApiProperty({ description: 'Product description', example: 'Fresh organic whole milk, 1 gallon' })
  @Column({ type: 'text', nullable: true })
  description: string;

  @ApiProperty({ description: 'Price in USD', example: 4.99 })
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @ApiProperty({ description: 'Available stock quantity', example: 50 })
  @Column({ type: 'int', default: 0 })
  stock: number;

  @ApiPropertyOptional({ description: 'Product image URL' })
  @Column({ nullable: true })
  imageUrl: string;

  @ApiProperty({ type: () => Category, description: 'Category this product belongs to' })
  @ManyToOne(() => Category, (category) => category.products, { eager: true })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Index()
  @Column()
  categoryId: string;


  @VersionColumn()
  version: number;


  @ApiPropertyOptional({ description: 'Soft delete timestamp' })
  @DeleteDateColumn()
  deletedAt: Date | null;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
