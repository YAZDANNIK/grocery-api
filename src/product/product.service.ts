import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}


  async findAll(paginationDto: PaginationDto): Promise<PaginatedResponseDto<Product>> {
    const { page, limit } = paginationDto;
    const skip = (page - 1) * limit;

    const [products, total] = await this.productRepository.findAndCount({
      relations: ['category'],
      order: { name: 'ASC' },
      skip,
      take: limit,
    });

    return new PaginatedResponseDto(products, total, page, limit);
  }

  /**
   * get full details for a single product,
   * @throws NotFoundException if product doesnt exist or is soft-deleted
   */
  async findOne(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['category'],
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    return product;
  }


  async findByCategory(
    categoryId: string,
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponseDto<Product>> {
    const { page, limit } = paginationDto;
    const skip = (page - 1) * limit;

    const [products, total] = await this.productRepository.findAndCount({
      where: { categoryId },
      relations: ['category'],
      order: { name: 'ASC' },
      skip,
      take: limit,
    });

    return new PaginatedResponseDto(products, total, page, limit);
  }
}
