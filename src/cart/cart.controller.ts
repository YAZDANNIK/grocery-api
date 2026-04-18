import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { CartService } from './cart.service';
import { Cart } from './entities/cart.entity';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@ApiTags('Cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get(':userId')
  @ApiOperation({ summary: 'Get the current contents of a user\'s cart' })
  @ApiParam({ name: 'userId', description: 'User identifier' })
  @ApiResponse({ status: 200, description: 'Cart contents', type: Cart })
  async getCart(@Param('userId') userId: string): Promise<Cart> {
    return this.cartService.getCart(userId);
  }

  @Post(':userId/items')
  @ApiOperation({ summary: 'Add an item to the cart (or update quantity if already present)' })
  @ApiParam({ name: 'userId', description: 'User identifier' })
  @ApiResponse({ status: 201, description: 'Item added to cart', type: Cart })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async addItem(
    @Param('userId') userId: string,
    @Body() addCartItemDto: AddCartItemDto,
  ): Promise<Cart> {
    return this.cartService.addItem(userId, addCartItemDto);
  }

  @Put(':userId/items/:productId')
  @ApiOperation({ summary: 'Update the quantity of a specific item in the cart' })
  @ApiParam({ name: 'userId', description: 'User identifier' })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Cart item updated', type: Cart })
  @ApiResponse({ status: 404, description: 'Item not found in cart' })
  async updateItem(
    @Param('userId') userId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ): Promise<Cart> {
    return this.cartService.updateItem(userId, productId, updateCartItemDto);
  }

  @Delete(':userId/items/:productId')
  @ApiOperation({ summary: 'Remove a single item from the cart' })
  @ApiParam({ name: 'userId', description: 'User identifier' })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Item removed from cart', type: Cart })
  @ApiResponse({ status: 404, description: 'Item not found in cart' })
  async removeItem(
    @Param('userId') userId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
  ): Promise<Cart> {
    return this.cartService.removeItem(userId, productId);
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear the entire cart for a user' })
  @ApiParam({ name: 'userId', description: 'User identifier' })
  @ApiResponse({ status: 204, description: 'Cart cleared' })
  async clearCart(@Param('userId') userId: string): Promise<void> {
    return this.cartService.clearCart(userId);
  }
}
