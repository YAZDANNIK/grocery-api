# Grocery Inventory & Order API

A production-ready **NestJS** microservice for grocery inventory management, shopping carts, and transactional order processing with **robust concurrency control**.

Built with **NestJS + TypeORM + PostgreSQL**, containerized with **Docker**.

---

## Quick Start

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/)

### Run the Application

```bash
# 1. Clone the repository
git clone <repository-url>
cd oont-grocery-api

# 2. Start everything (NestJS API + PostgreSQL)
docker-compose up --build

# 3. (Optional) Seed the database with sample data
docker-compose --profile seed run seed
```

The API will be available at: **http://localhost:3000**

### Swagger API Documentation

Once the server is running, open: **[http://localhost:3000/api](http://localhost:3000/api)**

This provides an interactive Swagger UI to explore and test all endpoints.

---

## Architecture

```
src/
├── main.ts                    # App bootstrap, Swagger, validation pipe
├── app.module.ts              # Root module
├── config/                    # Configuration module
├── database/                  # TypeORM config, data source, seed script
├── common/dto/                # Shared DTOs (pagination)
├── category/                  # Category module (controller, service, entity)
├── product/                   # Product module (controller, service, entity)
├── cart/                      # Cart module (controller, service, entities)
└── order/                     # Order module (controller, service, entities)
```

### Modules

| Module | Responsibility |
|--------|---------------|
| **CategoryModule** | Product categories CRUD |
| **ProductModule** | Product catalog with pagination & soft deletes |
| **CartModule** | Persistent shopping cart per user (stored in Postgres) |
| **OrderModule** | Transactional order creation with concurrency control |

---

## Concurrency Strategy: Pessimistic Row-Level Locking

Detailed technical documentation can be found in [CONCURRENCY.md](./CONCURRENCY.md).

The most critical challenge in this application is preventing **overselling** — ensuring we never sell more items than we have in stock, even when multiple users attempt to purchase the last item simultaneously.

### Our Approach: `SELECT ... FOR UPDATE`

When a `POST /orders` request arrives, we use **pessimistic row-level locking** within a database transaction:

1. **Begin Transaction** : All operations are wrapped in a single PostgreSQL transaction.
2. **Lock Product Rows** : We execute `SELECT ... FOR UPDATE` on all product rows in the cart. This acquires an exclusive row-level lock in PostgreSQL, meaning any other transaction trying to read or modify these rows will **wait** until our transaction completes.
3. **Validate Stock** : With the rows locked, we check that sufficient stock exists for every item. If any item fails, we roll back the **entire** transaction — no partial orders, no partial stock changes.
4. **Decrement & Commit** : If all validations pass, we decrement stock, create the order, and commit. Only then are the locks released.
5. **Deadlock Prevention** : Product rows are always locked in a consistent order (sorted by product ID), preventing circular wait conditions.

This strategy is simple, proven, and leverages PostgreSQL's battle-tested concurrency primitives. It trades a small amount of throughput (due to lock contention) for **absolute correctness**  exactly the right trade-off for an inventory system.

---

## API Endpoints

### Public Market API (Read-Heavy)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/products?page=1&limit=20` | List all products (paginated) |
| `GET` | `/products/:id` | Get product details with stock |
| `GET` | `/categories` | List all categories |
| `GET` | `/categories/:id/products` | Products in a category |

### Cart Management API (Stateful)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/cart/:userId` | Get cart contents |
| `POST` | `/cart/:userId/items` | Add item (upserts quantity) |
| `PUT` | `/cart/:userId/items/:productId` | Update item quantity |
| `DELETE` | `/cart/:userId/items/:productId` | Remove item from cart |
| `DELETE` | `/cart/:userId` | Clear entire cart |

### Order Processing API (Write-Heavy & Transactional)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/orders` | Create order from cart (atomic) |
| `GET` | `/orders/:id` | Get order details |
| `POST` | `/orders/:id/cancel` | Cancel order & restore stock |

---

## Design Decisions

### 1. Cart Persistence in PostgreSQL
The cart is stored in Postgres (not Redis or in-memory) as required. Each user has exactly one cart (enforced by a unique constraint on `userId`). Cart items reference products via foreign keys.

### 2. Price Snapshot in Orders
`OrderItem` stores `priceAtOrder` — the product's price at the time of purchase. This ensures order history remains accurate even if product prices change later.

### 3. Soft Deletes for Products
Products use TypeORM's `@DeleteDateColumn()`. When "deleted," they're excluded from public listings but remain in the database so past orders referencing them stay valid and viewable.

### 4. Consistent Lock Ordering
When acquiring row locks, product IDs are sorted ascending. This prevents **deadlocks** that could occur if two transactions lock rows in different orders.

### 5. Version Column
Products include a `@VersionColumn()` as a secondary safety net. TypeORM uses this for optimistic concurrency control on `save()` operations.

---

## Testing

### Run E2E Tests

```bash
# With a test database running
npm run test:e2e
```

The test suite covers:
- Product listing and pagination
- Category listing and filtering
- Full cart CRUD lifecycle
- Order creation with stock validation
- Order cancellation with stock restoration
- Input validation (negative quantities rejected)
- **Concurrency test**: 5 users racing for 1 item — exactly 1 succeeds

---

## Seed Data

The seed script populates the database with **8 categories** and **28 products** with realistic grocery data:

```bash
# Via Docker
docker-compose --profile seed run seed

# Locally (with DB running)
npm run seed
```

Categories: Dairy, Fruits, Vegetables, Bakery, Beverages, Meat & Seafood, Snacks, Frozen Foods.

---

## Tech Stack

- **Framework**: NestJS 10
- **Language**: TypeScript 5
- **Database**: PostgreSQL 16
- **ORM**: TypeORM 0.3
- **Validation**: class-validator + class-transformer
- **Documentation**: @nestjs/swagger (OpenAPI)
- **Testing**: Jest + Supertest
- **Container**: Docker + Docker Compose

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | `db` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USERNAME` | `oont_user` | Database username |
| `DB_PASSWORD` | `oont_password_123` | Database password |
| `DB_DATABASE` | `oont_grocery` | Database name |
| `PORT` | `3000` | API server port |
| `NODE_ENV` | `development` | Environment mode |
