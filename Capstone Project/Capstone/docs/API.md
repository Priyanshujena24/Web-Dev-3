# API Reference Documentation

All endpoints are prefixed with `/api/v1` (with `/health` also available at root).

All currency fields are handled as integer cents (`priceCents`, `totalCents`) to avoid floating-point issues, and formatted string representations (`price`, `total`) are included for frontend consumption.

---

## 1. Health

### GET `/health` & `/api/v1/health`
- **Access**: Public
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "API is healthy",
  "data": {
    "uptime": 12.34,
    "timestamp": "2026-11-22T20:00:00.000Z",
    "environment": "development"
  }
}
```

---

## 2. Authentication & Authorization (`/api/v1/auth`)

### POST `/api/v1/auth/register`
- **Access**: Public
- **Body**:
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "Password@123",
  "role": "customer",
  "address": {
    "line1": "123 Market St",
    "city": "Seattle",
    "state": "WA",
    "pincode": "98101"
  }
}
```
- **Response**: `201 Created`
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "6740d...",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "customer",
      "isActive": true,
      "address": { ... },
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}
```

### POST `/api/v1/auth/login`
- **Access**: Public
- **Body**:
```json
{
  "email": "jane@example.com",
  "password": "Password@123"
}
```
- **Response**: `200 OK` (also sets `refreshToken` in httpOnly cookie)
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "48b6c0...",
    "user": {
      "_id": "6740d...",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "customer"
    }
  }
}
```

### POST `/api/v1/auth/refresh`
- **Access**: Public (Cookie or Body token)
- **Body** (optional if cookie is present):
```json
{
  "refreshToken": "48b6c0..."
}
```
- **Response**: `200 OK` (returns newly rotated token pair)
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "92f1a8...",
    "user": { ... }
  }
}
```

### POST `/api/v1/auth/logout`
- **Access**: Public (Revokes provided refresh token)
- **Response**: `200 OK`

### POST `/api/v1/auth/logout-all`
- **Access**: Authenticated (Revokes all active sessions for current user)
- **Response**: `200 OK`

### GET `/api/v1/auth/me`
- **Access**: Authenticated (`customer`, `seller`, `admin`)
- **Headers**: `Authorization: Bearer <accessToken>`
- **Response**: `200 OK` with user details.

---

## 3. Users & Profile (`/api/v1/users`)

### PATCH `/api/v1/users/me`
- **Access**: Authenticated (`customer`, `seller`, `admin`)
- **Body**: `{ "name": "Updated Name", "address": { "line1": "..." } }`
- **Response**: `200 OK`

### PATCH `/api/v1/users/me/password`
- **Access**: Authenticated
- **Body**: `{ "currentPassword": "Password@123", "newPassword": "NewPassword@456" }`
- **Response**: `200 OK`

### GET `/api/v1/users`
- **Access**: Admin only
- **Query**: `?role=customer&page=1&limit=10`
- **Response**: `200 OK` with `meta` pagination.

### GET `/api/v1/users/:id`
- **Access**: Admin only
- **Response**: `200 OK`

### PATCH `/api/v1/users/:id/status`
- **Access**: Admin only
- **Body**: `{ "isActive": false }`
- **Response**: `200 OK`

### DELETE `/api/v1/users/:id`
- **Access**: Admin only
- **Response**: `200 OK`

---

## 4. Categories (`/api/v1/categories`)

### GET `/api/v1/categories`
- **Access**: Public
- **Response**: `200 OK` with list of active categories.

### GET `/api/v1/categories/:id`
- **Access**: Public
- **Response**: `200 OK`

### POST `/api/v1/categories`
- **Access**: Admin only
- **Body**:
```json
{
  "name": "Smart Wearables",
  "slug": "smart-wearables",
  "description": "Fitness bands and watches"
}
```
- **Response**: `201 Created`

### PATCH `/api/v1/categories/:id`
- **Access**: Admin only
- **Response**: `200 OK`

### DELETE `/api/v1/categories/:id`
- **Access**: Admin only
- **Response**: `200 OK` (Returns `409 Conflict` if products are assigned to this category).

---

## 5. Products (`/api/v1/products`)

### GET `/api/v1/products`
- **Access**: Public
- **Query Parameters**:
  - `search`: Full text search on name and description
  - `category`: Category ObjectId
  - `minPrice`: Minimum price in dollars
  - `maxPrice`: Maximum price in dollars
  - `seller`: Seller ObjectId
  - `inStock`: `true` or `false`
  - `sort`: `price`, `-price`, `name`, `-name`, `sold`, `-createdAt`
  - `page`: Page number (default: 1)
  - `limit`: Page limit (default: 10, max: 50)
- **Response**: `200 OK` with `data.products` and `meta` pagination.

### GET `/api/v1/products/mine`
- **Access**: Seller only
- **Response**: `200 OK` with products owned by the authenticated seller.

### GET `/api/v1/products/:id`
- **Access**: Public
- **Response**: `200 OK` with populated category and seller.

### POST `/api/v1/products`
- **Access**: Seller, Admin
- **Body**:
```json
{
  "name": "Wireless Gaming Headset",
  "description": "Ultra low latency 7.1 surround sound headset.",
  "priceCents": 12999,
  "category": "6740d...",
  "stock": 25,
  "lowStockThreshold": 5
}
```
- **Response**: `201 Created`

### PATCH `/api/v1/products/:id`
- **Access**: Owner Seller, Admin
- **Response**: `200 OK`

### DELETE `/api/v1/products/:id`
- **Access**: Owner Seller, Admin
- **Response**: `200 OK` (Soft-deletes if product appears in prior orders, hard-deletes otherwise).

---

## 6. Inventory (`/api/v1/inventory`)

### PATCH `/api/v1/inventory/:productId/stock`
- **Access**: Owner Seller, Admin
- **Body** (mutually exclusive):
```json
{ "delta": 10 }
```
OR
```json
{ "set": 50 }
```
- **Response**: `200 OK` (Rejects updates that result in stock < 0 with `400 Bad Request`).

### GET `/api/v1/inventory/low-stock`
- **Access**: Seller (own low stock), Admin (all low stock)
- **Response**: `200 OK` with list of products where `stock <= lowStockThreshold`.

---

## 7. Cart (`/api/v1/cart`)

### GET `/api/v1/cart`
- **Access**: Customer
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Cart fetched successfully",
  "data": {
    "items": [
      {
        "product": {
          "_id": "6740d...",
          "name": "Wireless Gaming Headset",
          "stock": 25,
          "unitPriceCents": 12999,
          "price": "129.99"
        },
        "quantity": 2,
        "lineTotalCents": 25998,
        "lineTotal": "259.98"
      }
    ],
    "totalCents": 25998,
    "total": "259.98",
    "warnings": []
  }
}
```

### POST `/api/v1/cart/items`
- **Access**: Customer
- **Body**: `{ "productId": "6740d...", "quantity": 2 }`
- **Response**: `200 OK`

### PATCH `/api/v1/cart/items/:productId`
- **Access**: Customer
- **Body**: `{ "quantity": 4 }`
- **Response**: `200 OK`

### DELETE `/api/v1/cart/items/:productId`
- **Access**: Customer
- **Response**: `200 OK`

### DELETE `/api/v1/cart`
- **Access**: Customer
- **Response**: `200 OK`

---

## 8. Orders (`/api/v1/orders`)

### POST `/api/v1/orders/checkout`
- **Access**: Customer
- **Body**:
```json
{
  "delivery": {
    "name": "Jane Doe",
    "phone": "+1-555-0199",
    "line1": "456 Market St, Apt 2B",
    "city": "Seattle",
    "state": "WA",
    "pincode": "98101"
  }
}
```
- **Response**: `201 Created`
```json
{
  "success": true,
  "message": "Order(s) placed successfully",
  "data": {
    "checkoutId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "orders": [
      {
        "_id": "6740f...",
        "checkoutId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "customer": "6740d...",
        "seller": "6740e...",
        "items": [ ... ],
        "subtotalCents": 25998,
        "totalCents": 25998,
        "status": "PENDING",
        "payment": {
          "method": "SIMULATED",
          "status": "PAID",
          "simulated": true,
          "reference": "SIM-4FA89B10C2"
        }
      }
    ]
  }
}
```

### GET `/api/v1/orders`
- **Access**: Authenticated (`customer`: own; `seller`: assigned; `admin`: all)
- **Query**: `?status=PENDING&page=1&limit=10`
- **Response**: `200 OK` with paginated orders.

### GET `/api/v1/orders/:id`
- **Access**: Owner Customer, Assigned Seller, Admin
- **Response**: `200 OK`

### PATCH `/api/v1/orders/:id/status`
- **Access**: Per state machine rules
- **Body**: `{ "status": "CONFIRMED", "note": "Payment verified" }`
- **Response**: `200 OK` (Rejects invalid transitions with `409 Conflict`).

### POST `/api/v1/orders/:id/cancel`
- **Access**: Owner Customer (`PENDING`/`CONFIRMED`), Seller, Admin
- **Body**: `{ "note": "Customer requested cancellation" }`
- **Response**: `200 OK` (Atomically restores stock, updates payment to `REFUNDED`).

---

## 9. Reports & Analytics (`/api/v1/reports`)

### GET `/api/v1/reports/sales-summary`
- **Access**: Seller (own sales), Admin (platform sales)
- **Query**: `?groupBy=day` (or `month`) `&from=2026-11-01&to=2026-11-30`
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Sales summary report generated successfully",
  "data": {
    "summary": [
      {
        "date": "2026-11-20",
        "orders": 3,
        "revenueCents": 35000,
        "revenue": "350.00",
        "unitsSold": 5
      }
    ]
  }
}
```

### GET `/api/v1/reports/best-selling`
- **Access**: Seller (own products), Admin (platform products)
- **Query**: `?limit=5&from=2026-11-01&to=2026-11-30`
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Best-selling products report generated successfully",
  "data": {
    "bestSelling": [
      {
        "productId": "6740d...",
        "name": "Wireless Noise-Canceling Headphones",
        "totalQuantitySold": 45,
        "totalRevenueCents": 674955,
        "totalRevenue": "6749.55",
        "currentStock": 35,
        "isActive": true
      }
    ]
  }
}
```

### GET `/api/v1/reports/inventory-summary`
- **Access**: Seller (own inventory), Admin (platform inventory)
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Inventory summary report generated successfully",
  "data": {
    "inventorySummary": [
      {
        "categoryId": "6740c...",
        "categoryName": "Electronics",
        "categorySlug": "electronics",
        "productCount": 5,
        "totalUnits": 61,
        "stockValueCents": 314965,
        "stockValue": "3149.65",
        "lowStockCount": 3
      }
    ]
  }
}
```
