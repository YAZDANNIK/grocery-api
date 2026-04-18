import { DataSource } from 'typeorm';
import { Category } from '../category/entities/category.entity';
import { Product } from '../product/entities/product.entity';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Order } from '../order/entities/order.entity';
import { OrderItem } from '../order/entities/order-item.entity';


export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'oont_user',
  password: process.env.DB_PASSWORD || 'oont_password_123',
  database: process.env.DB_DATABASE || 'oont_grocery',
  entities: [Category, Product, Cart, CartItem, Order, OrderItem],
  synchronize: false,
  migrations: ['src/database/migrations/*.ts'],
});
