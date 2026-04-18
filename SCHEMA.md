# Database Schema Design

## Entity-Relationship Diagram

```
┌──────────────────────┐           ┌───────────────────────────┐
│      categories      │           │         products          │
├──────────────────────┤           ├───────────────────────────┤
│ id          UUID  PK │◄──────────│ categoryId    UUID     FK │
│ name        VARCHAR  │    1:N    │ id            UUID     PK │
│ description VARCHAR  │           │ name          VARCHAR     │
│ createdAt   DATETIME │           │ description   TEXT        │
│ updatedAt   DATETIME │           │ price         DECIMAL     │
└──────────────────────┘           │ stock         INT         │
                                   │ imageUrl      VARCHAR     │
                                   │ version       INT         │  ← optimistic lock
                                   │ deletedAt     DATETIME    │  ← soft delete
                                   │ createdAt     DATETIME    │
                                   │ updatedAt     DATETIME    │
                                   └───────────┬───────────────┘
                                               │
                               ┌───────────────┴───────────────┐
                               │                               │
                               ▼                               ▼
                ┌──────────────────────┐       ┌──────────────────────────┐
                │     cart_items       │       │      order_items         │
                ├──────────────────────┤       ├──────────────────────────┤
                │ id        UUID    PK │       │ id           UUID     PK │
                │ cartId    UUID    FK │       │ orderId      UUID     FK │
                │ productId UUID    FK │       │ productId    UUID     FK │
                │ quantity  INT       │       │ quantity     INT        │
                │ createdAt DATETIME  │       │ priceAtOrder DECIMAL   │
                │ updatedAt DATETIME  │       │ createdAt    DATETIME  │
                └──────────┬──────────┘       └──────────┬─────────────┘
                           │                              │
                           ▼                              ▼
                ┌──────────────────────┐       ┌──────────────────────────┐
                │       carts         │       │        orders            │
                ├──────────────────────┤       ├──────────────────────────┤
                │ id        UUID    PK │       │ id          UUID      PK │
                │ userId    VARCHAR UQ │       │ userId      VARCHAR      │
                │ createdAt DATETIME  │       │ status      ENUM         │
                │ updatedAt DATETIME  │       │ totalAmount DECIMAL      │
                └──────────────────────┘       │ createdAt   DATETIME    │
                                               │ updatedAt   DATETIME    │
                                               └──────────────────────────┘

                                               Status: PENDING | CONFIRMED | CANCELLED
```

---

## Relationships Explained

### Category → Product (One-to-Many)
- A category (e.g., "Dairy") contains many products (e.g., "Milk", "Cheese", "Yogurt").
- Each product belongs to exactly one category.
- **Why One-to-Many?** In a grocery context, products have a single primary category. A many-to-many relationship would add complexity without clear benefit for this use case.

### Cart → CartItem → Product
- **Cart → CartItem (One-to-Many)**: A user has one cart, which contains many cart items.
- **CartItem → Product (Many-to-One)**: Each cart item references one product.
- **Unique Constraint**: `(cartId, productId)` ensures a product appears only once per cart. Adding the same product again increases its quantity instead of creating a duplicate row.
- **Cascade Delete**: Deleting a cart removes all its items.

### Order → OrderItem → Product
- **Order → OrderItem (One-to-Many)**: An order contains many line items.
- **OrderItem → Product (Many-to-One)**: Each line item references the product that was ordered.
- **Price Snapshot**: `priceAtOrder` captures the price at order time. This is critical because product prices may change, but historical orders must reflect the price the customer actually paid.
- **Soft Delete Compatibility**: Even if a product is soft-deleted, past orders referencing it remain valid because `productId` is just a UUID foreign key, and the relation uses `withDeleted` to include soft-deleted products.

### User → Cart (Implicit One-to-One)
- The `userId` column on `carts` has a **unique constraint**, enforcing that each user has at most one cart.
- There is no separate `users` table — `userId` is a simple string identifier, as authentication is outside the scope of this service.

---

## Key Design Decisions

### 1. UUID Primary Keys
All tables use UUID primary keys instead of auto-incrementing integers. This avoids sequential ID enumeration and makes IDs safe to expose in URLs.

### 2. Soft Deletes (`deletedAt`)
The `products` table includes a `deletedAt` column. When a product is "deleted":
- It's excluded from `GET /products` listings (TypeORM filters automatically).
- Past orders referencing it remain valid and viewable.
- Stock can still be restored if an order containing a soft-deleted product is cancelled.

### 3. Version Column (Optimistic Locking)
The `products.version` column is auto-incremented by TypeORM on every update. This provides an additional safety net: if two transactions somehow bypass the pessimistic lock and try to update the same row, the second update will fail with a `VersionError`.

### 4. Price Snapshot (`priceAtOrder`)
`order_items.priceAtOrder` stores the product price at the time the order was placed. This decouples order history from current product pricing, which is essential for:
- Accurate financial reporting
- Customer dispute resolution
- Audit trails

### 5. Consistent Timestamps
All entities include `createdAt` and `updatedAt` timestamps, auto-managed by TypeORM. This supports data auditing and debugging.

---

## Indexes

| Table | Column(s) | Type | Purpose |
|-------|-----------|------|---------|
| `categories` | `name` | Unique | Prevent duplicate categories |
| `products` | `categoryId` | Index | Fast category-based product lookups |
| `carts` | `userId` | Unique Index | One cart per user, fast user lookups |
| `orders` | `userId` | Index | Fast order history lookups per user |
| `cart_items` | `(cartId, productId)` | Unique Composite | Prevent duplicate products in a cart |
