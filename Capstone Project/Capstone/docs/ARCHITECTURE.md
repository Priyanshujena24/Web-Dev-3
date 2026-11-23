# System Architecture & Technical Specifications

This document outlines the architectural patterns, database schemas, indexing strategies, real-time event mechanisms, concurrency controls, and aggregation pipelines for the **E-Commerce and Inventory Management API**.

---

## 1. High-Level Architecture Diagram (Text Diagram)

```
+-----------------------------------------------------------------------------+
|                                CLIENT LAYER                                 |
|   Web Frontend / Mobile App / Postman Collection Runner / Socket Clients    |
+-----------------------------------------------------------------------------+
                                       |
                   HTTP/REST + JSON    |   WebSocket (Socket.IO)
                                       v
+-----------------------------------------------------------------------------+
|                              EXPRESS SERVER                                 |
|                                                                             |
|  [Global Middleware]                                                        |
|   ├── Helmet (Security Headers)                                             |
|   ├── CORS (Cross-Origin Policy)                                            |
|   ├── Body / Cookie Parsers (JSON, urlencoded, cookies)                     |
|   └── Morgan + Custom Request Logger (Method, URL, Status, Duration)        |
|                                                                             |
|  [Routing & Security Boundary]                                              |
|   ├── Express Rate Limiting (Brute-force protection on /auth)               |
|   ├── Joi Schema Validation (Request body, params, query sanitization)      |
|   ├── JWT Authentication Middleware (Bearer Token Verification)             |
|   └── Role-Based Access Control (RBAC: customer, seller, admin)             |
|                                                                             |
|  [Controllers Layer]                                                        |
|   ├── AuthController          ├── ProductController   ├── OrderController   |
|   ├── UserController          ├── InventoryController ├── ReportController  |
|   └── CategoryController      └── CartController                            |
|                                                                             |
|  [Services Layer (Core Business Logic)]                                     |
|   ├── token.service.js     -> Access/refresh rotation & reuse detection     |
|   ├── order.service.js     -> Atomic stock deduction, compensation, checkout|
|   ├── inventory.service.js -> Stock updates, threshold monitoring           |
|   └── report.service.js    -> MongoDB Aggregation pipelines (Analytics)     |
|                                                                             |
|  [Real-Time & Decoupled Event System]                                       |
|   ├── appEvents (Node.js EventEmitter Singleton)                            |
|   │     ├── 'order.placed'                                                  |
|   │     ├── 'order.statusChanged'                                           |
|   │     └── 'stock.low'                                                     |
|   └── Socket.IO Integration (events/listeners.js -> sockets/index.js)       |
|         ├── Room 'user:<userId>'                                            |
|         ├── Room 'role:admin'                                               |
|         └── Room 'role:seller'                                              |
|                                                                             |
|  [Centralized Error Handling]                                               |
|   ├── AppError Operational Error Handler                                    |
|   └── Mongoose CastError / ValidationError / 11000 Duplicate Key Mapper     |
+-----------------------------------------------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------+
|                            DATABASE LAYER (MongoDB)                         |
|                                                                             |
|   Collections:                                                              |
|   ├── users                 ├── products                                    |
|   ├── refreshTokens (TTL)   ├── carts                                       |
|   ├── categories            └── orders                                      |
+-----------------------------------------------------------------------------+
```

---

## 2. Entity-Relationship (ER) Description

1. **User**
   - Represents platform actors (`customer`, `seller`, `admin`).
   - Fields: `name`, `email` (unique), `passwordHash` (hidden by default), `role`, `isActive`, `address` (subdocument: `line1`, `city`, `state`, `pincode`), `createdAt`, `updatedAt`.
   - Relationships:
     - 1 User (Customer) to 1 Cart
     - 1 User (Customer) to many Orders
     - 1 User (Seller) to many Products
     - 1 User (Seller) to many Orders (as vendor)
     - 1 User to many RefreshTokens

2. **RefreshToken**
   - Manages active JWT refresh sessions with cryptographic hashes and rotation tracking.
   - Fields: `user` (ref: User), `tokenHash` (SHA-256), `expiresAt`, `revokedAt`, `replacedBy`, `createdAt`.
   - TTL Index automatically removes expired sessions.

3. **Category**
   - Product classification taxonomy.
   - Fields: `name` (unique), `slug` (unique), `description`, `isActive`.
   - Relationships: 1 Category to many Products.

4. **Product**
   - Represents catalog merchandise with inventory controls.
   - Fields: `name`, `description`, `priceCents` (integer, avoids IEEE 754 floating-point errors), `category` (ref: Category), `seller` (ref: User), `stock` (integer >= 0), `lowStockThreshold`, `isActive`, `soldCount`.
   - Virtual property `price`: formatted string in dollars/currency (`priceCents / 100`).

5. **Cart**
   - Stores pre-checkout customer selections.
   - Fields: `user` (unique ref: User), `items: [{ product: ref Product, quantity: Number }]`.
   - **Prices are never stored in the cart**: product prices, availability, and totals are computed dynamically on fetch to ensure live pricing accuracy.

6. **Order**
   - Immutable snapshot of purchase agreements per seller.
   - Fields: `checkoutId` (UUID linking all orders created in a single multi-seller checkout), `customer` (ref: User), `seller` (ref: User), `items: [{ product, name, unitPriceCents, quantity, lineTotalCents }]`, `subtotalCents`, `totalCents`, `status`, `statusHistory: [{ status, changedBy, at, note }]`, `delivery` (name, phone, address), `payment` (method, status, simulated, reference), `cancelledAt`, timestamps.
   - Virtual properties `subtotal` and `total` provide formatted currency strings.

---

## 3. Database Indexes and Justifications

To achieve high read performance and enforce data integrity, 7 primary indexes are defined:

| # | Collection | Index Specification | Index Type | Purpose / Justification |
|---|------------|---------------------|------------|-------------------------|
| 1 | `users` | `{ email: 1 }` | Unique | Enforces email uniqueness across the system and speeds up authentication lookup during `POST /auth/login`. |
| 2 | `products` | `{ name: "text", description: "text" }` | Text Index | Powers full-text search query `?search=keyword` across product titles and detailed descriptions. |
| 3 | `products` | `{ category: 1, priceCents: 1 }` | Compound | Optimizes frequent storefront category browsing filtered and sorted by price ranges (`?category=id&minPrice=X&sort=price`). |
| 4 | `products` | `{ seller: 1, isActive: 1 }` | Compound | Accelerates seller dashboard queries (`/products/mine`), catalog management, and seller-level inventory aggregation. |
| 5 | `orders` | `{ customer: 1, createdAt: -1 }` | Compound | Optimizes customer order history queries (`GET /orders`) sorted in reverse chronological order. |
| 6 | `orders` | `{ seller: 1, status: 1, createdAt: -1 }` | Compound | Speeds up seller order management filtering by fulfillment status (`PENDING`, `CONFIRMED`, `SHIPPED`) ordered by recency. |
| 7 | `refreshTokens` | `{ expiresAt: 1 }` + `{ tokenHash: 1 }` | TTL & Hash | TTL index automatically purges expired tokens from MongoDB without background cron jobs; `tokenHash` index provides constant-time lookup during token refresh. |

---

## 4. Oversell Prevention & Concurrency Control

### The Challenge
In high-throughput e-commerce systems, race conditions occur when multiple customers attempt to purchase the same low-stock inventory item concurrently (e.g., flash sales). Traditional "read-then-write" patterns lead to overselling and negative stock.

### Solution: Atomic Conditional Updates with Compensation
Rather than requiring MongoDB multi-document transactions (which fail on standalone `mongod` instances), this system utilizes **atomic single-document conditional updates with automatic rollback compensation**:

1. **Atomic Conditional Decrement:**
   ```javascript
   const decremented = await Product.findOneAndUpdate(
     {
       _id: item.product,
       isActive: true,
       stock: { $gte: item.quantity }  // Guard condition
     },
     {
       $inc: {
         stock: -item.quantity,
         soldCount: item.quantity
       }
     },
     { new: true }
   );
   ```
   MongoDB's internal row-level write lock ensures that the condition `{ stock: { $gte: item.quantity } }` is evaluated atomically. If 10 requests hit a product with stock `5` simultaneously, exactly `5` operations find sufficient stock and succeed; the remaining `5` return `null`.

2. **Compensating Transactions (Rollback):**
   If an order contains multiple items (e.g., Item A and Item B) and Item A succeeds but Item B fails due to insufficient stock, the service iterates through all previously decremented items in the transaction and applies an inverse `$inc`:
   ```javascript
   for (const dec of decrementedItems) {
     await Product.findByIdAndUpdate(dec.productId, {
       $inc: {
         stock: dec.quantity,
         soldCount: -dec.quantity
       }
     });
   }
   ```
   The API then halts checkout and responds with **`409 Conflict`** indicating the specific product that ran out of stock. Stock never goes negative.

---

## 5. Order Status State Machine

The order lifecycle adheres strictly to a deterministic finite state machine (FSM) defined in `utils/orderStatus.js`:

```
               +--------------------------------------+
               |               PENDING                |
               +--------------------------------------+
                 /                                  \
                / (Customer, Seller, Admin)          \ (Seller, Admin)
               v                                      v
     +-------------------+                  +-------------------+
     |     CANCELLED     |                  |     CONFIRMED     |
     |    (Terminal)     |                  +-------------------+
     +-------------------+                   /                \
               ^                            / (Seller, Admin)  \ (Customer, Seller, Admin)
               |                           v                    v
               +--------------------------+               +-------------------+
                                                          |      SHIPPED      |
                                                          +-------------------+
                                                                    |
                                                                    | (Seller, Admin)
                                                                    v
                                                          +-------------------+
                                                          |     DELIVERED     |
                                                          |    (Terminal)     |
                                                          +-------------------+
```

### Transition Rules & Permissions
- `PENDING` -> `CONFIRMED` | `CANCELLED`
- `CONFIRMED` -> `SHIPPED` | `CANCELLED`
- `SHIPPED` -> `DELIVERED`
- `DELIVERED` -> (terminal; no transitions permitted)
- `CANCELLED` -> (terminal; no transitions permitted)

### Role Permissions
- **Customer**: Can cancel their own orders while in `PENDING` or `CONFIRMED` state.
- **Seller**: Can advance their own orders through `CONFIRMED` -> `SHIPPED` -> `DELIVERED`, and can cancel orders in `PENDING` or `CONFIRMED`.
- **Admin**: Can perform any valid transition on any order.

### Idempotent Cancellation & Stock Restoral
When an order is cancelled:
1. `Order.findOneAndUpdate({ _id, status: { $in: ['PENDING', 'CONFIRMED'] } }, ...)` ensures that concurrent cancellation requests are executed exactly once.
2. The order status is set to `CANCELLED`, `payment.status` is set to `REFUNDED`, and `cancelledAt` is stamped.
3. Every item's quantity is returned to the product stock using `$inc: { stock: +qty, soldCount: -qty }`. Double-cancellation is strictly blocked with `409 Conflict`.

---

## 6. Real-Time Architecture: EventEmitter & Socket.IO

### Decoupling Philosophy
To maintain clean separation of concerns, the core business domain (`services/`) never directly imports or couples to the WebSocket transport layer (`sockets/index.js`). Instead, services emit business domain events onto the singleton `appEvents` (`events/appEvents.js`).

`events/listeners.js` subscribes to these events and manages notifications and socket emissions. All listeners wrap their actions in `try/catch` blocks so that a socket delivery error never disrupts database state or HTTP transactions.

### Events & Socket Deliveries
| Domain Event | Emitted By | Payload | Socket Event | Recipient Room |
|--------------|------------|---------|--------------|----------------|
| `order.placed` | `order.service.js` | Order details | `order:new` | `user:<sellerId>` |
| `order.statusChanged` | `order.service.js` | Updated Order, Prev Status | `order:status` | `user:<customerId>` (+ `user:<sellerId>` if changed by Admin) |
| `stock.low` | `order.service.js` / `inventory.service.js` | Product ID, name, current stock, threshold | `stock:low` | `user:<sellerId>` and `role:admin` |

### Socket Authentication
Socket connections require a valid JWT access token passed via `socket.handshake.auth.token`. Connections without tokens or with expired tokens are rejected in the `io.use` authentication middleware.

---

## 7. MongoDB Aggregation Pipelines

All analytical reports are implemented in `report.service.js`:

### 1. Sales Summary Pipeline (`GET /reports/sales-summary`)
- **Stage 1 (`$match`)**: Filters orders with status in `['CONFIRMED', 'SHIPPED', 'DELIVERED']`. Filters by seller if requestor has `seller` role; applies optional `from` and `to` date boundaries.
- **Stage 2 (`$group`)**: Groups documents by formatted date (`%Y-%m-%d` for daily or `%Y-%m` for monthly). Computes total orders count (`$sum: 1`), total revenue in cents (`$sum: '$totalCents'`), and total units sold via an array reduce over `$items.quantity`.
- **Stage 3 (`$sort`)**: Sorts ascending by date.
- **Stage 4 (`$project`)**: Formats output and computes decimal dollar revenue.

### 2. Best-Selling Products Pipeline (`GET /reports/best-selling`)
- **Stage 1 (`$match`)**: Filters completed orders and seller ownership.
- **Stage 2 (`$unwind`)**: Deconstructs the `items` array into individual line item documents.
- **Stage 3 (`$group`)**: Groups by `items.product` ID, summing `totalQuantitySold` and `totalRevenueCents`.
- **Stage 4 (`$sort`)**: Sorts descending by `totalQuantitySold`.
- **Stage 5 (`$limit`)**: Limits to top `N` results (default 5).
- **Stage 6 (`$lookup`)**: Joins with the `products` collection to populate current stock and status.

### 3. Inventory Summary Pipeline (`GET /reports/inventory-summary`)
- **Stage 1 (`$match`)**: Filters active products (`isActive: true`) and seller scope if applicable.
- **Stage 2 (`$group`)**: Groups by product `category`. Computes:
  - `productCount`: count of products in category
  - `totalUnits`: total stock units on hand
  - `stockValueCents`: `$sum: { $multiply: ['$stock', '$priceCents'] }`
  - `lowStockCount`: conditional sum evaluating `$cond: [{ $lte: ['$stock', '$lowStockThreshold'] }, 1, 0]`
- **Stage 3 (`$lookup`)**: Joins with `categories` collection for category name and slug.
- **Stage 4 (`$sort`)**: Sorts descending by total units in inventory.
