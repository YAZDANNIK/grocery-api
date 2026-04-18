import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsInt, Min, IsUUID } from 'class-validator';

export class AddCartItemDto {
  @ApiProperty({ description: 'Product ID to add to cart', example: 'uuid-string' })
  @IsNotEmpty()
  @IsUUID()
  productId: string;

  @ApiProperty({ description: 'Quantity to add', example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}
