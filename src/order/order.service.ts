import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../product/entities/product.entity';
import { CartService } from '../cart/cart.service';
import { CreateOrderDto } from './dto/create-order.dto';

/**
 * represents a stock validation failure for a single item
 */
interface StockFailure {
  productId: string;
  productName: string;
  requested: number;
  available: number;
}

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly cartService: CartService,
    private readonly dataSource: DataSource,
  ) {}


  async createOrder(dto: CreateOrderDto): Promise<Order> {
    const { userId } = dto;

    // 1. get the user cart 
    const cart = await this.cartService.getCart(userId);

    if (!cart.items || cart.items.length === 0) {
      throw new BadRequestException(
        'Cannot create an order from an empty cart',
      );
    }

    // 2. execute the entire order creation in single transction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 3. lock the product rows with SELECT ... FOR UPDATE
      //    order by product id to prevent deadlocks
      const productIds = cart.items
        .map((item) => item.productId)
        .sort();

      const lockedProducts = await queryRunner.manager
        .createQueryBuilder(Product, 'product')
        .setLock('pessimistic_write')
        .where('product.id IN (:...ids)', { ids: productIds })
        .orderBy('product.id', 'ASC')
        .getMany();

      // build a map for quick lookup
      const productMap = new Map<string, Product>();
      for (const product of lockedProducts) {
        productMap.set(product.id, product);
      }

      // 4. validate stock for ALL items before making any change
      const failures: StockFailure[] = [];

      for (const cartItem of cart.items) {
        const product = productMap.get(cartItem.productId);

        if (!product) {
          failures.push({
            productId: cartItem.productId,
            productName: 'Unknown (deleted)',
            requested: cartItem.quantity,
            available: 0,
          });
          continue;
        }

        if (product.stock < cartItem.quantity) {
          failures.push({
            productId: product.id,
            productName: product.name,
            requested: cartItem.quantity,
            available: product.stock,
          });
        }
      }

      // if any item fails validate rollback and report ALL failure
      if (failures.length > 0) {
        await queryRunner.rollbackTransaction();
        throw new BadRequestException({
          message: 'Insufficient stock for one or more items',
          errors: failures,
        });
      }

      // 5. all items pass — decrement stock and create order
      let totalAmount = 0;
      const orderItems: Partial<OrderItem>[] = [];

      for (const cartItem of cart.items) {
        const product = productMap.get(cartItem.productId)!;

        // decrement stock
        product.stock -= cartItem.quantity;
        await queryRunner.manager.save(Product, product);

        // calculate line total
        const lineTotal = Number(product.price) * cartItem.quantity;
        totalAmount += lineTotal;

        orderItems.push({
          productId: product.id,
          quantity: cartItem.quantity,
          priceAtOrder: Number(product.price),
        });
      }

      // 6. create the order record
      const order = queryRunner.manager.create(Order, {
        userId,
        status: OrderStatus.PENDING,
        totalAmount: Math.round(totalAmount * 100) / 100,
        items: orderItems as OrderItem[],
      });

      const savedOrder = await queryRunner.manager.save(Order, order);

      // 7. commit the transaction
      await queryRunner.commitTransaction();

      // 8. clear the cart 
      await this.cartService.clearCart(userId);

      // 9. return the full order with relations
      return this.findOne(savedOrder.id);
    } catch (error) {
      // ensure rollback on any unexpected error
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * find a specific order by id with all items and product detail
   */
  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items', 'items.product'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }

    return order;
  }

  /**
   * cancel an order and restore reserved stock.
   *
   * uses the same pessimistic locking strategy as createOrder
   * to safely restore stock back to inventory.
   */
  async cancelOrder(id: string): Promise<Order> {
    const order = await this.findOne(id);

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Order is already cancelled');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // lock product rows for the items in this order
      const productIds = order.items
        .map((item) => item.productId)
        .sort();

      const lockedProducts = await queryRunner.manager
        .createQueryBuilder(Product, 'product')
        .setLock('pessimistic_write')
        .where('product.id IN (:...ids)', { ids: productIds })
        .orderBy('product.id', 'ASC')
        .withDeleted() // Include soft-deleted products to restore their stock
        .getMany();

      const productMap = new Map<string, Product>();
      for (const product of lockedProducts) {
        productMap.set(product.id, product);
      }

      // restore stock for each item
      for (const orderItem of order.items) {
        const product = productMap.get(orderItem.productId);
        if (product) {
          product.stock += orderItem.quantity;
          await queryRunner.manager.save(Product, product);
        }
      }

      // update order status
      order.status = OrderStatus.CANCELLED;
      await queryRunner.manager.save(Order, order);

      await queryRunner.commitTransaction();

      return this.findOne(id);
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
