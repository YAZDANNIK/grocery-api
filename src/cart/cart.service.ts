import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { ProductService } from '../product/product.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    private readonly productService: ProductService,
  ) {}


  async findOrCreateCart(userId: string): Promise<Cart> {
    let cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items', 'items.product', 'items.product.category'],
    });

    if (!cart) {
      cart = this.cartRepository.create({ userId, items: [] });
      cart = await this.cartRepository.save(cart);
    }

    return cart;
  }


  async getCart(userId: string): Promise<Cart> {
    return this.findOrCreateCart(userId);
  }

  /**
   * Add an item to the cart. If the product is in cart,
   * quantity is incremented.
   */
  async addItem(userId: string, dto: AddCartItemDto): Promise<Cart> {
    // Validate product exist
    const product = await this.productService.findOne(dto.productId);

    const cart = await this.findOrCreateCart(userId);

    // Check if product exists in cart
    const existingItem = cart.items.find(
      (item) => item.productId === dto.productId,
    );

    if (existingItem) {
      // Update existing item q
      existingItem.quantity += dto.quantity;
      await this.cartItemRepository.save(existingItem);
    } else {
      // Add new i
      const newItem = this.cartItemRepository.create({
        cartId: cart.id,
        productId: dto.productId,
        quantity: dto.quantity,
      });
      await this.cartItemRepository.save(newItem);
    }

    
    return this.findOrCreateCart(userId);
  }


  async updateItem(
    userId: string,
    productId: string,
    dto: UpdateCartItemDto,
  ): Promise<Cart> {
    const cart = await this.findOrCreateCart(userId);

    const item = cart.items.find((i) => i.productId === productId);
    if (!item) {
      throw new NotFoundException(
        `Product "${productId}" is not in the cart for user "${userId}"`,
      );
    }

    item.quantity = dto.quantity;
    await this.cartItemRepository.save(item);

    return this.findOrCreateCart(userId);
  }


  async removeItem(userId: string, productId: string): Promise<Cart> {
    const cart = await this.findOrCreateCart(userId);

    const item = cart.items.find((i) => i.productId === productId);
    if (!item) {
      throw new NotFoundException(
        `Product "${productId}" is not in the cart for user "${userId}"`,
      );
    }

    await this.cartItemRepository.remove(item);

    return this.findOrCreateCart(userId);
  }

  /**
   * Clear all items from the user cart
   */
  async clearCart(userId: string): Promise<void> {
    const cart = await this.cartRepository.findOne({
      where: { userId },
    });

    if (cart) {
      await this.cartItemRepository.delete({ cartId: cart.id });
    }
  }
}
