import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({
    description: 'User ID whose cart will be converted to an order',
    example: 'user-123',
  })
  @IsNotEmpty()
  @IsString()
  userId: string;
}
