# NOVA E-Commerce

A complete, polished e-commerce web application built as a **QA Automation Portfolio Project**. NOVA features a full customer shopping experience, admin panel, REST API, and SQLite database — all designed with testability in mind.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, CSS, JavaScript (vanilla) |
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| Auth | JWT (JSON Web Tokens) |
| Validation | express-validator |

## Quick Start

### Prerequisites

- Node.js 18+ installed

### Installation

```bash
# Navigate to project directory
cd nova-ecommerce

# Install dependencies
npm install

# Seed the database with test data
npm run seed

# Reseed from scratch (deletes existing database)
npm run seed:reset

# Start the server
npm start
```

The application will be available at **http://localhost:3000**

### Verify Installation

```bash
# Verify SQLite native module (runs automatically on npm install)
npm run verify:sqlite

# Verify API authorization (server must be running)
npm run verify:auth
```

For development with auto-reload:
```bash
npm run dev
```

### Environment Configuration

Copy `.env.example` to `.env` and adjust as needed:

```env
PORT=3000
JWT_SECRET=your-secret-key
TAX_RATE=0.08
SHIPPING_FLAT_RATE=9.99
FREE_SHIPPING_THRESHOLD=75.00
```

## Test Credentials

### Admin Account
| Field | Value |
|-------|-------|
| Email | `admin@nova.com` |
| Password | `Admin123!` |
| URL | http://localhost:3000/admin/login.html |

### Customer Accounts
| Email | Password | Notes |
|-------|----------|-------|
| `john.doe@example.com` | `Password123!` | Cart, wishlist, 3 orders (delivered, shipped, cancelled) |
| `jane.smith@example.com` | `Password123!` | Wishlist, 3 orders (pending, processing, delivered) |
| `test.user@example.com` | `Password123!` | 1 confirmed order |
| `inactive.user@example.com` | `Password123!` | Deactivated account (login returns 403) |

### Test Coupons
| Code | Type | Value | Min Order | Notes |
|------|------|-------|-----------|-------|
| `WELCOME10` | 10% off | — | $25 | Active |
| `SAVE20` | 20% off | — | $100 | Active |
| `FLAT15` | $15 off | — | $50 | Active |
| `FREESHIP` | $9.99 off | — | $30 | Covers shipping |
| `EXPIRED` | 50% off | — | $0 | Expired (for negative testing) |

### Test Payment Cards
| Card Number | Result |
|-------------|--------|
| `4111111111111111` | Payment succeeds |
| `4000000000000002` | Payment declined |

## Features

### Customer Features
- User registration with validation
- Login / logout
- Forgot password / reset password flow
- User profile management
- Product catalog with search, filtering, sorting, pagination
- Product detail pages
- Wishlist management
- Shopping cart with quantity updates
- Coupon code application
- Multi-step checkout (Shipping → Payment → Review)
- Mock payment processing
- Order confirmation
- Order history and order details

### Admin Features
- Admin login (role-based access)
- Dashboard with statistics
- Product CRUD (Create, Read, Update, Delete/Deactivate)
- User management (activate/deactivate)
- Order management with status updates

## API Documentation

Base URL: `http://localhost:3000/api`

All authenticated endpoints require header: `Authorization: Bearer <token>`

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | No | Register new customer |
| POST | `/auth/login` | No | Login and receive JWT |
| POST | `/auth/logout` | Yes | Logout |
| POST | `/auth/forgot-password` | No | Request password reset |
| POST | `/auth/reset-password` | No | Reset password with token |
| GET | `/auth/me` | Yes | Get current user |

**Register Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "555-0100"
}
```

**Login Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

### Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/users/profile` | Yes | Get user profile |
| PUT | `/users/profile` | Yes | Update profile |
| PUT | `/users/change-password` | Yes | Change password |

### Products

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/products` | Optional | List products (paginated) |
| GET | `/products/filters` | No | Get filter options |
| GET | `/products/:id` | Optional | Get product by ID |
| GET | `/products/slug/:slug` | Optional | Get product by slug |

**Query Parameters for `/products`:**
- `page` (default: 1)
- `limit` (default: 12, max: 50)
- `search` — text search
- `category` — filter by category
- `brand` — filter by brand
- `minPrice` / `maxPrice` — price range
- `inStock` — `true` for in-stock only
- `sort` — `name`, `price`, `rating`, `created_at`
- `order` — `asc` or `desc`

### Cart

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/cart` | Yes | Get cart items |
| POST | `/cart` | Yes | Add item to cart |
| PUT | `/cart/:id` | Yes | Update item quantity |
| DELETE | `/cart/:id` | Yes | Remove item |
| DELETE | `/cart` | Yes | Clear cart |

### Wishlist

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/wishlist` | Yes | Get wishlist |
| POST | `/wishlist` | Yes | Add to wishlist |
| DELETE | `/wishlist/:productId` | Yes | Remove from wishlist |

### Orders

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/orders` | Yes | List user orders |
| GET | `/orders/:id` | Yes | Get order details |
| POST | `/orders` | Yes | Place order |

### Coupons

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/coupons/validate` | No | Validate coupon code |

### Admin (requires admin role)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/dashboard` | Dashboard statistics |
| GET | `/admin/products` | List all products |
| POST | `/admin/products` | Create product |
| PUT | `/admin/products/:id` | Update product |
| DELETE | `/admin/products/:id` | Deactivate product |
| GET | `/admin/users` | List customers |
| PUT | `/admin/users/:id` | Activate/deactivate user |
| GET | `/admin/orders` | List all orders |
| GET | `/admin/orders/:id` | Get order details |
| PUT | `/admin/orders/:id/status` | Update order status |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | API health status |

## HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Success |
| 201 | Created |
| 400 | Validation error / bad request |
| 401 | Authentication required / invalid credentials |
| 402 | Payment declined |
| 403 | Forbidden (deactivated account, non-admin) |
| 404 | Resource not found |
| 409 | Conflict (duplicate email, SKU, etc.) |
| 500 | Internal server error |

## Database Schema

### Tables

**users** — Customer and admin accounts
- `id`, `email` (unique), `password_hash`, `first_name`, `last_name`
- `phone`, `address`, `city`, `state`, `zip`, `country`
- `role` (`customer` | `admin`), `is_active`, `reset_token`, `reset_token_expires`

**products** — Product catalog
- `id`, `name`, `slug` (unique), `description`, `price`, `compare_price`
- `category`, `brand`, `sku` (unique), `stock`, `image_url`
- `rating`, `review_count`, `is_active`

**cart_items** — Shopping cart
- `id`, `user_id` (FK), `product_id` (FK), `quantity`
- Unique constraint on `(user_id, product_id)`

**wishlist** — User wishlists
- `id`, `user_id` (FK), `product_id` (FK)
- Unique constraint on `(user_id, product_id)`

**coupons** — Discount coupons
- `id`, `code` (unique), `type` (`percentage` | `fixed`), `value`
- `min_order`, `max_uses`, `used_count`, `expires_at`, `is_active`

**orders** — Order records
- `id`, `user_id` (FK), `order_number` (unique), `status`
- `subtotal`, `discount`, `shipping`, `tax`, `total`, `coupon_code`
- Shipping address fields, `payment_method`, `payment_status`

**order_items** — Order line items
- `id`, `order_id` (FK), `product_id` (FK)
- `product_name`, `product_sku`, `quantity`, `unit_price`, `total_price`

### Order Status Flow
```
pending → confirmed → processing → shipped → delivered
                ↓         ↓
            cancelled  cancelled
```

## QA Testing Guide

### data-testid Attributes

Key UI elements include stable `data-testid` attributes for automation:

| Page | Key Test IDs |
|------|-------------|
| Login | `login-form`, `login-email`, `login-password`, `login-submit` |
| Register | `register-form`, `register-email`, `register-password` |
| Products | `products-grid`, `product-card`, `filter-search`, `sort-select` |
| Product Detail | `add-to-cart-btn`, `wishlist-btn`, `qty-input` |
| Cart | `cart-item`, `checkout-btn`, `cart-remove-btn` |
| Checkout | `shipping-form`, `payment-form`, `place-order-btn`, `coupon-input` |
| Orders | `orders-table`, `order-row`, `view-order-btn` |
| Admin | `stats-cards`, `admin-products-table`, `update-status-btn` |

### Suggested Test Scenarios

**Positive Tests:**
- Register → Login → Browse → Add to Cart → Checkout → Order Confirmation
- Apply valid coupon at checkout
- Add/remove wishlist items
- Update profile information
- Admin: Create product, update order status

**Negative Tests:**
- Login with wrong password (401)
- Register with existing email (409)
- Register with weak password (400)
- Add out-of-stock product to cart (400)
- Apply expired coupon (400)
- Payment with declined card (402)
- Access admin routes as customer (403)
- Access protected routes without token (401)

**Boundary Tests:**
- Cart quantity: 0, 1, 99, 100
- Pagination: first page, last page, beyond total
- Price filters: min=0, max=very high
- Empty cart checkout attempt
- Empty search results

## Project Structure

```
nova-ecommerce/
├── package.json
├── .env / .env.example
├── README.md
├── database/              # SQLite database (auto-created)
├── server/
│   ├── index.js           # Express app entry point
│   ├── config/
│   │   └── env.js         # Environment configuration
│   ├── db/
│   │   ├── database.js    # DB connection & init
│   │   ├── schema.sql     # Database schema
│   │   └── seed.js        # Seed data script
│   ├── middleware/
│   │   └── auth.js        # Auth, validation, error handling
│   └── routes/
│       ├── auth.js
│       ├── users.js
│       ├── products.js
│       ├── cart.js
│       ├── wishlist.js
│       ├── orders.js
│       ├── coupons.js
│       └── admin.js
└── public/
    ├── index.html
    ├── login.html / register.html / ...
    ├── admin/
    │   ├── login.html
    │   ├── dashboard.html
    │   ├── products.html
    │   ├── orders.html
    │   └── users.html
    ├── css/
    │   ├── variables.css
    │   ├── base.css
    │   ├── components.css
    │   └── pages.css
    └── js/
        ├── api.js         # API client
        ├── auth.js        # Auth helpers & navbar
        └── utils.js       # Utilities & UI helpers
```

## License

MIT — Built for QA automation portfolio and educational purposes.
