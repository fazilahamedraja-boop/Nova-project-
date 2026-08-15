const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const config = require('../config/env');

const forceReseed = process.argv.includes('--force');

if (forceReseed && fs.existsSync(config.dbPath)) {
  fs.unlinkSync(config.dbPath);
  const wal = `${config.dbPath}-wal`;
  const shm = `${config.dbPath}-shm`;
  if (fs.existsSync(wal)) fs.unlinkSync(wal);
  if (fs.existsSync(shm)) fs.unlinkSync(shm);
  console.log('Existing database removed for fresh seed.');
  delete require.cache[require.resolve('./database')];
}

const db = require('./database');
const catalogProducts = require('./product-catalog');

const products = catalogProducts.map((p) => ({
  ...p,
  image_url: `/images/products/${p.slug}.svg`,
}));

const coupons = [
  { code: 'WELCOME10', type: 'percentage', value: 10, min_order: 25, max_uses: 1000, expires_at: '2027-12-31' },
  { code: 'SAVE20', type: 'percentage', value: 20, min_order: 100, max_uses: 500, expires_at: '2027-06-30' },
  { code: 'FLAT15', type: 'fixed', value: 15, min_order: 50, max_uses: 200, expires_at: '2027-03-31' },
  { code: 'FREESHIP', type: 'fixed', value: 9.99, min_order: 30, max_uses: null, expires_at: null },
  { code: 'EXPIRED', type: 'percentage', value: 50, min_order: 0, max_uses: 10, expires_at: '2020-01-01' },
];

const sampleOrders = [
  {
    user_id: 2, order_number: 'NOVA-20260101-0001', status: 'delivered',
    subtotal: 179.98, discount: 18.0, shipping: 0, tax: 12.96, total: 174.94,
    coupon_code: 'WELCOME10', payment_method: 'credit_card', payment_status: 'paid',
    shipTo: { first: 'John', last: 'Doe', address: '123 Main St', city: 'New York', state: 'NY', zip: '10001' },
    items: [
      { product_id: 1, name: 'Nova Wireless Headphones', sku: 'NOVA-HP-001', qty: 1, price: 149.99 },
      { product_id: 3, name: 'Organic Cotton T-Shirt', sku: 'NOVA-TS-003', qty: 1, price: 29.99 },
    ],
  },
  {
    user_id: 3, order_number: 'NOVA-20260115-0002', status: 'pending',
    subtotal: 249.99, discount: 0, shipping: 9.99, tax: 20.0, total: 279.98,
    coupon_code: null, payment_method: 'credit_card', payment_status: 'pending',
    shipTo: { first: 'Jane', last: 'Smith', address: '456 Oak Ave', city: 'Los Angeles', state: 'CA', zip: '90001' },
    items: [
      { product_id: 2, name: 'Smart Fitness Watch Pro', sku: 'NOVA-WT-002', qty: 1, price: 249.99 },
    ],
  },
  {
    user_id: 2, order_number: 'NOVA-20260201-0003', status: 'shipped',
    subtotal: 119.99, discount: 0, shipping: 9.99, tax: 9.6, total: 139.58,
    coupon_code: null, payment_method: 'debit_card', payment_status: 'paid',
    shipTo: { first: 'John', last: 'Doe', address: '123 Main St', city: 'New York', state: 'NY', zip: '10001' },
    items: [
      { product_id: 8, name: 'Running Shoes Elite', sku: 'NOVA-RS-008', qty: 1, price: 119.99 },
    ],
  },
  {
    user_id: 3, order_number: 'NOVA-20260210-0004', status: 'processing',
    subtotal: 164.97, discount: 15, shipping: 0, tax: 11.99, total: 161.96,
    coupon_code: 'FLAT15', payment_method: 'paypal', payment_status: 'paid',
    shipTo: { first: 'Jane', last: 'Smith', address: '456 Oak Ave', city: 'Los Angeles', state: 'CA', zip: '90001' },
    items: [
      { product_id: 9, name: 'Leather Crossbody Bag', sku: 'NOVA-BG-009', qty: 1, price: 89.99 },
      { product_id: 10, name: 'Polarized Sunglasses', sku: 'NOVA-SG-010', qty: 1, price: 59.99 },
      { product_id: 20, name: 'Protein Shaker Bottle', sku: 'NOVA-PS-020', qty: 1, price: 14.99 },
    ],
  },
  {
    user_id: 2, order_number: 'NOVA-20260220-0005', status: 'cancelled',
    subtotal: 89.99, discount: 0, shipping: 9.99, tax: 7.2, total: 107.18,
    coupon_code: null, payment_method: 'credit_card', payment_status: 'refunded',
    shipTo: { first: 'John', last: 'Doe', address: '123 Main St', city: 'New York', state: 'NY', zip: '10001' },
    items: [
      { product_id: 21, name: 'Mechanical Keyboard RGB', sku: 'NOVA-KB-021', qty: 1, price: 89.99 },
    ],
  },
  {
    user_id: 4, order_number: 'NOVA-20260301-0006', status: 'confirmed',
    subtotal: 49.99, discount: 0, shipping: 9.99, tax: 4.0, total: 63.98,
    coupon_code: null, payment_method: 'credit_card', payment_status: 'paid',
    shipTo: { first: 'Test', last: 'User', address: '789 Pine Rd', city: 'Chicago', state: 'IL', zip: '60601' },
    items: [
      { product_id: 7, name: 'Yoga Mat Premium', sku: 'NOVA-YM-007', qty: 1, price: 49.99 },
    ],
  },
  {
    user_id: 3, order_number: 'NOVA-20260305-0007', status: 'delivered',
    subtotal: 99.99, discount: 20, shipping: 0, tax: 6.4, total: 86.39,
    coupon_code: 'SAVE20', payment_method: 'credit_card', payment_status: 'paid',
    shipTo: { first: 'Jane', last: 'Smith', address: '456 Oak Ave', city: 'Los Angeles', state: 'CA', zip: '90001' },
    items: [
      { product_id: 28, name: 'Portable SSD 1TB', sku: 'NOVA-SSD-028', qty: 1, price: 99.99 },
    ],
  },
];

function seed() {
  console.log('Seeding NOVA database...');

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0 && !forceReseed) {
    console.log('Database already seeded. Use "npm run seed:reset" to reseed.');
    return;
  }

  if (forceReseed && userCount > 0) {
    db.exec('DELETE FROM order_items; DELETE FROM orders; DELETE FROM cart_items; DELETE FROM wishlist; DELETE FROM coupons; DELETE FROM products; DELETE FROM users;');
  }

  const passwordHash = bcrypt.hashSync('Password123!', 10);
  const adminHash = bcrypt.hashSync('Admin123!', 10);

  const insertUser = db.prepare(`
    INSERT INTO users (email, password_hash, first_name, last_name, phone, address, city, state, zip, country, role, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertUser.run('admin@nova.com', adminHash, 'Admin', 'User', '555-0100', '100 Admin Blvd', 'San Francisco', 'CA', '94102', 'US', 'admin', 1);
  insertUser.run('john.doe@example.com', passwordHash, 'John', 'Doe', '555-0101', '123 Main St', 'New York', 'NY', '10001', 'US', 'customer', 1);
  insertUser.run('jane.smith@example.com', passwordHash, 'Jane', 'Smith', '555-0102', '456 Oak Ave', 'Los Angeles', 'CA', '90001', 'US', 'customer', 1);
  insertUser.run('test.user@example.com', passwordHash, 'Test', 'User', '555-0103', '789 Pine Rd', 'Chicago', 'IL', '60601', 'US', 'customer', 1);
  insertUser.run('inactive.user@example.com', passwordHash, 'Inactive', 'User', '555-0104', '999 Closed St', 'Boston', 'MA', '02101', 'US', 'customer', 0);

  const insertProduct = db.prepare(`
    INSERT INTO products (name, slug, description, price, compare_price, category, brand, sku, stock, image_url, rating, review_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const p of products) {
    insertProduct.run(p.name, p.slug, p.description, p.price, p.compare_price, p.category, p.brand, p.sku, p.stock, p.image_url, p.rating, p.review_count);
  }

  const insertCoupon = db.prepare(`
    INSERT INTO coupons (code, type, value, min_order, max_uses, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const c of coupons) {
    insertCoupon.run(c.code, c.type, c.value, c.min_order, c.max_uses, c.expires_at);
  }

  // Cart items for John
  db.prepare('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)').run(2, 1, 1);
  db.prepare('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)').run(2, 3, 2);

  // Wishlist for John and Jane
  db.prepare('INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)').run(2, 2);
  db.prepare('INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)').run(2, 7);
  db.prepare('INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)').run(3, 28);

  const insertOrder = db.prepare(`
    INSERT INTO orders (user_id, order_number, status, subtotal, discount, shipping, tax, total, coupon_code,
      shipping_first_name, shipping_last_name, shipping_address, shipping_city, shipping_state, shipping_zip,
      payment_method, payment_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertOrderItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, total_price)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const order of sampleOrders) {
    const result = insertOrder.run(
      order.user_id, order.order_number, order.status,
      order.subtotal, order.discount, order.shipping, order.tax, order.total,
      order.coupon_code,
      order.shipTo.first, order.shipTo.last, order.shipTo.address,
      order.shipTo.city, order.shipTo.state, order.shipTo.zip,
      order.payment_method, order.payment_status
    );

    for (const item of order.items) {
      insertOrderItem.run(
        result.lastInsertRowid, item.product_id, item.name, item.sku,
        item.qty, item.price, item.price * item.qty
      );
    }
  }

  const outOfStock = products.filter((p) => p.stock === 0).length;
  const discounted = products.filter((p) => p.compare_price && p.compare_price > p.price).length;
  const lowStock = products.filter((p) => p.stock > 0 && p.stock < 10).length;

  console.log('Database seeded successfully!');
  console.log('');
  console.log(`Products: ${products.length} total`);
  console.log(`  - Out of stock: ${outOfStock}`);
  console.log(`  - Discounted:   ${discounted}`);
  console.log(`  - Low stock:    ${lowStock}`);
  console.log(`Orders: ${sampleOrders.length} across statuses: pending, confirmed, processing, shipped, delivered, cancelled`);
  console.log('');
  console.log('Test Credentials:');
  console.log('  Admin:    admin@nova.com / Admin123!');
  console.log('  Customer: john.doe@example.com / Password123!');
  console.log('  Customer: jane.smith@example.com / Password123!');
  console.log('  Customer: test.user@example.com / Password123!');
  console.log('  Inactive: inactive.user@example.com / Password123!');
  console.log('');
  console.log('Test Coupons: WELCOME10, SAVE20, FLAT15, FREESHIP, EXPIRED');
}

seed();
