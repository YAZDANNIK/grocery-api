import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CategoryModule } from '../src/category/category.module';
import { ProductModule } from '../src/product/product.module';
import { CartModule } from '../src/cart/cart.module';
import { OrderModule } from '../src/order/order.module';
import { Category } from '../src/category/entities/category.entity';
import { Product } from '../src/product/entities/product.entity';
import { Cart } from '../src/cart/entities/cart.entity';
import { CartItem } from '../src/cart/entities/cart-item.entity';
import { Order } from '../src/order/entities/order.entity';
import { OrderItem } from '../src/order/entities/order-item.entity';

describe('OoNt Grocery API (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let testCategory: Category;
  let testProduct: Product;
  let testProduct2: Product;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          username: process.env.DB_USERNAME || 'oont_user',
          password: process.env.DB_PASSWORD || 'oont_password_123',
          database: process.env.DB_DATABASE || 'oont_grocery_test',
          entities: [Category, Product, Cart, CartItem, Order, OrderItem],
          synchronize: true,
          dropSchema: true, // Clean slate for each test run
        }),
        CategoryModule,
        ProductModule,
        CartModule,
        OrderModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    await app.init();
    dataSource = moduleFixture.get(DataSource);

    // Seed test data
    const categoryRepo = dataSource.getRepository(Category);
    const productRepo = dataSource.getRepository(Product);

    testCategory = await categoryRepo.save(
      categoryRepo.create({ name: 'Test Category', description: 'For testing' }),
    );

    testProduct = await productRepo.save(
      productRepo.create({
        name: 'Test Milk',
        description: 'Test product',
        price: 4.99,
        stock: 10,
        categoryId: testCategory.id,
      }),
    );

    testProduct2 = await productRepo.save(
      productRepo.create({
        name: 'Test Bread',
        description: 'Another test product',
        price: 3.49,
        stock: 5,
        categoryId: testCategory.id,
      }),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── PRODUCT TESTS ──────────────────────────────────────

  describe('Products', () => {
    it('GET /products — should return paginated products', async () => {
      const res = await request(app.getHttpServer())
        .get('/products')
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('page');
      expect(res.body).toHaveProperty('limit');
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('GET /products/:id — should return a single product', async () => {
      const res = await request(app.getHttpServer())
        .get(`/products/${testProduct.id}`)
        .expect(200);

      expect(res.body.name).toBe('Test Milk');
      expect(res.body.stock).toBe(10);
    });

    it('GET /products/:id — should 404 for non-existent product', async () => {
      await request(app.getHttpServer())
        .get('/products/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  // ─── CATEGORY TESTS ─────────────────────────────────────

  describe('Categories', () => {
    it('GET /categories — should return all categories', async () => {
      const res = await request(app.getHttpServer())
        .get('/categories')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('GET /categories/:id/products — should return products for a category', async () => {
      const res = await request(app.getHttpServer())
        .get(`/categories/${testCategory.id}/products`)
        .expect(200);

      expect(res.body.data.length).toBe(2);
    });
  });

  // ─── CART TESTS ──────────────────────────────────────────

  describe('Cart', () => {
    const userId = 'test-user-cart';

    it('GET /cart/:userId — should return empty cart for new user', async () => {
      const res = await request(app.getHttpServer())
        .get(`/cart/${userId}`)
        .expect(200);

      expect(res.body.userId).toBe(userId);
      expect(res.body.items).toHaveLength(0);
    });

    it('POST /cart/:userId/items — should add item to cart', async () => {
      const res = await request(app.getHttpServer())
        .post(`/cart/${userId}/items`)
        .send({ productId: testProduct.id, quantity: 2 })
        .expect(201);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].quantity).toBe(2);
    });

    it('POST /cart/:userId/items — should update quantity for existing item', async () => {
      const res = await request(app.getHttpServer())
        .post(`/cart/${userId}/items`)
        .send({ productId: testProduct.id, quantity: 3 })
        .expect(201);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].quantity).toBe(5); // 2 + 3
    });

    it('PUT /cart/:userId/items/:productId — should set quantity', async () => {
      const res = await request(app.getHttpServer())
        .put(`/cart/${userId}/items/${testProduct.id}`)
        .send({ quantity: 1 })
        .expect(200);

      expect(res.body.items[0].quantity).toBe(1);
    });

    it('DELETE /cart/:userId/items/:productId — should remove item', async () => {
      // Add second product first
      await request(app.getHttpServer())
        .post(`/cart/${userId}/items`)
        .send({ productId: testProduct2.id, quantity: 1 });

      const res = await request(app.getHttpServer())
        .delete(`/cart/${userId}/items/${testProduct2.id}`)
        .expect(200);

      expect(res.body.items).toHaveLength(1);
    });

    it('DELETE /cart/:userId — should clear the entire cart', async () => {
      await request(app.getHttpServer())
        .delete(`/cart/${userId}`)
        .expect(204);

      const res = await request(app.getHttpServer())
        .get(`/cart/${userId}`)
        .expect(200);

      expect(res.body.items).toHaveLength(0);
    });

    it('POST /cart/:userId/items — should reject negative quantity', async () => {
      await request(app.getHttpServer())
        .post(`/cart/${userId}/items`)
        .send({ productId: testProduct.id, quantity: -1 })
        .expect(400);
    });
  });

  // ─── ORDER TESTS ─────────────────────────────────────────

  describe('Orders', () => {
    const userId = 'test-user-orders';

    it('POST /orders — should fail with empty cart', async () => {
      await request(app.getHttpServer())
        .post('/orders')
        .send({ userId })
        .expect(400);
    });

    it('POST /orders — should create order and clear cart', async () => {
      // Add items to cart
      await request(app.getHttpServer())
        .post(`/cart/${userId}/items`)
        .send({ productId: testProduct.id, quantity: 2 });

      // Create order
      const res = await request(app.getHttpServer())
        .post('/orders')
        .send({ userId })
        .expect(201);

      expect(res.body.status).toBe('PENDING');
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].quantity).toBe(2);
      expect(Number(res.body.items[0].priceAtOrder)).toBe(4.99);

      // Verify cart is cleared
      const cartRes = await request(app.getHttpServer())
        .get(`/cart/${userId}`)
        .expect(200);
      expect(cartRes.body.items).toHaveLength(0);

      // Verify stock decreased
      const productRes = await request(app.getHttpServer())
        .get(`/products/${testProduct.id}`)
        .expect(200);
      expect(productRes.body.stock).toBe(8); // 10 - 2
    });

    it('POST /orders — should fail when stock is insufficient', async () => {
      // Try to order more than available stock
      await request(app.getHttpServer())
        .post(`/cart/${userId}/items`)
        .send({ productId: testProduct2.id, quantity: 999 });

      const res = await request(app.getHttpServer())
        .post('/orders')
        .send({ userId })
        .expect(400);

      expect(res.body.message).toContain('Insufficient stock');
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].productId).toBe(testProduct2.id);

      // Cart should remain intact after failure
      const cartRes = await request(app.getHttpServer())
        .get(`/cart/${userId}`)
        .expect(200);
      expect(cartRes.body.items).toHaveLength(1);

      // Clean up
      await request(app.getHttpServer()).delete(`/cart/${userId}`);
    });

    it('GET /orders/:id — should return order details', async () => {
      // Create an order first
      await request(app.getHttpServer())
        .post(`/cart/${userId}/items`)
        .send({ productId: testProduct.id, quantity: 1 });

      const orderRes = await request(app.getHttpServer())
        .post('/orders')
        .send({ userId })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/orders/${orderRes.body.id}`)
        .expect(200);

      expect(res.body.id).toBe(orderRes.body.id);
      expect(res.body.items).toHaveLength(1);
    });

    it('POST /orders/:id/cancel — should cancel order and restore stock', async () => {
      // Check current stock
      const beforeRes = await request(app.getHttpServer())
        .get(`/products/${testProduct.id}`)
        .expect(200);
      const stockBefore = beforeRes.body.stock;

      // Create an order
      await request(app.getHttpServer())
        .post(`/cart/${userId}/items`)
        .send({ productId: testProduct.id, quantity: 2 });

      const orderRes = await request(app.getHttpServer())
        .post('/orders')
        .send({ userId })
        .expect(201);

      // Cancel it
      const cancelRes = await request(app.getHttpServer())
        .post(`/orders/${orderRes.body.id}/cancel`)
        .expect(200);

      expect(cancelRes.body.status).toBe('CANCELLED');

      // Verify stock is restored
      const afterRes = await request(app.getHttpServer())
        .get(`/products/${testProduct.id}`)
        .expect(200);
      expect(afterRes.body.stock).toBe(stockBefore);
    });

    it('POST /orders/:id/cancel — should fail on already cancelled order', async () => {
      // Create and cancel an order
      await request(app.getHttpServer())
        .post(`/cart/${userId}/items`)
        .send({ productId: testProduct.id, quantity: 1 });

      const orderRes = await request(app.getHttpServer())
        .post('/orders')
        .send({ userId })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/orders/${orderRes.body.id}/cancel`)
        .expect(200);

      // Try to cancel again
      await request(app.getHttpServer())
        .post(`/orders/${orderRes.body.id}/cancel`)
        .expect(400);
    });
  });

  // ─── CONCURRENCY TESTS ──────────────────────────────────

  describe('Concurrency', () => {
    it('should prevent overselling when multiple users order the last item', async () => {
      // Create a product with stock = 1
      const productRepo = dataSource.getRepository(Product);
      const scarceProduct = await productRepo.save(
        productRepo.create({
          name: 'Last Cookie',
          description: 'Only one left!',
          price: 1.99,
          stock: 1,
          categoryId: testCategory.id,
        }),
      );

      // Set up carts for 5 users, each wanting 1 of this product
      const userIds = ['race-user-1', 'race-user-2', 'race-user-3', 'race-user-4', 'race-user-5'];

      for (const uid of userIds) {
        await request(app.getHttpServer())
          .post(`/cart/${uid}/items`)
          .send({ productId: scarceProduct.id, quantity: 1 });
      }

      // Fire all orders simultaneously
      const results = await Promise.allSettled(
        userIds.map((uid) =>
          request(app.getHttpServer())
            .post('/orders')
            .send({ userId: uid }),
        ),
      );

      // Count successes and failures
      const successes = results.filter(
        (r) => r.status === 'fulfilled' && r.value.status === 201,
      );
      const failures = results.filter(
        (r) => r.status === 'fulfilled' && r.value.status === 400,
      );

      // Exactly 1 should succeed, the rest should fail
      expect(successes.length).toBe(1);
      expect(failures.length).toBe(4);

      // Verify stock is now 0, not negative
      const updatedProduct = await productRepo.findOne({
        where: { id: scarceProduct.id },
      });
      expect(updatedProduct!.stock).toBe(0);
    });
  });
});
