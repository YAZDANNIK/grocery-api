import { Controller, Get, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { ProductService } from '../product/product.service';
import { Category } from './entities/category.entity';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Categories')
@Controller('categories')
export class CategoryController {
  constructor(
    private readonly categoryService: CategoryService,
    private readonly productService: ProductService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all product categories' })
  @ApiResponse({ status: 200, description: 'List of categories', type: [Category] })
  async findAll(): Promise<Category[]> {
    return this.categoryService.findAll();
  }

  @Get(':id/products')
  @ApiOperation({ summary: 'List all products in a category' })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @ApiResponse({ status: 200, description: 'Paginated list of products in the category' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async findProductsByCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() paginationDto: PaginationDto,
  ) {
    // Validate the category exists first
    await this.categoryService.findOne(id);
    return this.productService.findByCategory(id, paginationDto);
  }
}
