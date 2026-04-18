import {
  Controller,
  Get,
  Post,
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
import { OrderService } from './order.service';
import { Order } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';

@ApiTags('Orders')
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new order from a user\'s cart',
    description:
      'Atomically validates stock, reserves inventory, creates the order, ' +
      'and clears the cart. Uses pessimistic row-level locking to prevent overselling.',
  })
  @ApiResponse({ status: 201, description: 'Order created successfully', type: Order })
  @ApiResponse({
    status: 400,
    description: 'Cart is empty or insufficient stock. Response includes which items failed.',
  })
  async createOrder(@Body() createOrderDto: CreateOrderDto): Promise<Order> {
    return this.orderService.createOrder(createOrderDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch a specific order with its items and status' })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Order details', type: Order })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Order> {
    return this.orderService.findOne(id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel an order and restore reserved stock',
    description:
      'Changes order status to CANCELLED and returns all reserved stock ' +
      'back to inventory using a transactional rollback.',
  })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Order cancelled, stock restored', type: Order })
  @ApiResponse({ status: 400, description: 'Order is already cancelled' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async cancelOrder(@Param('id', ParseUUIDPipe) id: string): Promise<Order> {
    return this.orderService.cancelOrder(id);
  }
}
