const express = require('express');
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const db = require('../db/database');
const { AppError, authenticate, requireAdmin, validate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, requireAdmin);

function sanitizeUser(user) {
  const { password_hash, reset_token, reset_token_expires, ...safe } = user;
  return safe;
}

// GET /api/admin/dashboard
router.get('/dashboard', (req, res, next) => {
  try {
    const stats = {
      totalUsers: db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'customer'").get().c,
      totalProducts: db.prepare('SELECT COUNT(*) as c FROM products').get().c,
      totalOrders: db.prepare('SELECT COUNT(*) as c FROM orders').get().c,
      totalRevenue: db.prepare("SELECT COALESCE(SUM(total), 0) as s FROM orders WHERE payment_status = 'paid'").get().s,
      pendingOrders: db.prepare("SELECT COUNT(*) as c FROM orders WHERE status = 'pending'").get().c,
      lowStockProducts: db.prepare('SELECT COUNT(*) as c FROM products WHERE stock < 10 AND is_active = 1').get().c,
    };

    const recentOrders = db.prepare(`
      SELECT o.id, o.order_number, o.status, o.total, o.created_at,
        u.first_name || ' ' || u.last_name as customer_name, u.email
      FROM orders o JOIN users u ON u.id = o.user_id
      ORDER BY o.created_at DESC LIMIT 5
    `).all();

    const topProducts = db.prepare(`
      SELECT p.name, p.sku, SUM(oi.quantity) as total_sold, SUM(oi.total_price) as revenue
      FROM order_items oi JOIN products p ON p.id = oi.product_id
      GROUP BY p.id ORDER BY total_sold DESC LIMIT 5
    `).all();

    res.json({ success: true, data: { stats, recentOrders, topProducts } });
  } catch (err) {
    next(err);
  }
});

// --- Products CRUD ---

// GET /api/admin/products
router.get('/products', (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    let where = 'WHERE 1=1';
    const params = [];
    if (search) {
      where += ' AND (name LIKE ? OR sku LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const total = db.prepare(`SELECT COUNT(*) as total FROM products ${where}`).get(...params).total;
    const products = db.prepare(`SELECT * FROM products ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, limitNum, offset);

    res.json({ success: true, data: { products, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } } });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/products
router.post('/products', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('price').isFloat({ min: 0 }).withMessage('Valid price is required'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('brand').trim().notEmpty().withMessage('Brand is required'),
  body('sku').trim().notEmpty().withMessage('SKU is required'),
  body('stock').isInt({ min: 0 }).withMessage('Valid stock is required'),
], validate, (req, res, next) => {
  try {
    const { name, description, price, comparePrice, category, brand, sku, stock, imageUrl } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const existing = db.prepare('SELECT id FROM products WHERE sku = ? OR slug = ?').get(sku, slug);
    if (existing) return next(new AppError('Product with this SKU or slug already exists', 409));

    const result = db.prepare(`
      INSERT INTO products (name, slug, description, price, compare_price, category, brand, sku, stock, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, slug, description, price, comparePrice || null, category, brand, sku, stock, imageUrl || null);

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, message: 'Product created', data: { product } });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/products/:id
router.put('/products/:id', [
  body('name').optional().trim().notEmpty(),
  body('price').optional().isFloat({ min: 0 }),
  body('stock').optional().isInt({ min: 0 }),
], validate, (req, res, next) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) return next(new AppError('Product not found', 404));

    const fields = ['name', 'description', 'price', 'compare_price', 'category', 'brand', 'sku', 'stock', 'image_url', 'is_active'];
    const mapping = { comparePrice: 'compare_price', imageUrl: 'image_url', isActive: 'is_active' };

    const updates = [];
    const values = [];
    for (const [key, val] of Object.entries(req.body)) {
      const col = mapping[key] || key;
      if (fields.includes(col) && val !== undefined) {
        updates.push(`${col} = ?`);
        values.push(val);
      }
    }

    if (updates.length === 0) return next(new AppError('No valid fields to update', 400));

    updates.push("updated_at = datetime('now')");
    values.push(req.params.id);

    db.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    res.json({ success: true, message: 'Product updated', data: { product: updated } });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/products/:id
router.delete('/products/:id', (req, res, next) => {
  try {
    const product = db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id);
    if (!product) return next(new AppError('Product not found', 404));

    db.prepare('UPDATE products SET is_active = 0, updated_at = datetime("now") WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Product deactivated' });
  } catch (err) {
    next(err);
  }
});

// --- User Management ---

// GET /api/admin/users
router.get('/users', (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    let where = "WHERE role = 'customer'";
    const params = [];
    if (search) {
      where += ' AND (email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const total = db.prepare(`SELECT COUNT(*) as total FROM users ${where}`).get(...params).total;
    const users = db.prepare(`SELECT id, email, first_name, last_name, phone, role, is_active, created_at FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, limitNum, offset);

    res.json({ success: true, data: { users, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } } });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/users/:id
router.put('/users/:id', (req, res, next) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ? AND role = ?').get(req.params.id, 'customer');
    if (!user) return next(new AppError('User not found', 404));

    if (req.body.isActive !== undefined) {
      db.prepare('UPDATE users SET is_active = ?, updated_at = datetime("now") WHERE id = ?').run(req.body.isActive ? 1 : 0, req.params.id);
    }

    const updated = db.prepare('SELECT id, email, first_name, last_name, role, is_active, created_at FROM users WHERE id = ?').get(req.params.id);
    res.json({ success: true, message: 'User updated', data: { user: updated } });
  } catch (err) {
    next(err);
  }
});

// --- Order Management ---

// GET /api/admin/orders
router.get('/orders', (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search = '' } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    let where = 'WHERE 1=1';
    const params = [];
    if (status) { where += ' AND o.status = ?'; params.push(status); }
    if (search) { where += ' AND (o.order_number LIKE ? OR u.email LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

    const total = db.prepare(`SELECT COUNT(*) as total FROM orders o JOIN users u ON u.id = o.user_id ${where}`).get(...params).total;
    const orders = db.prepare(`
      SELECT o.id, o.order_number, o.status, o.total, o.payment_status, o.created_at,
        u.first_name || ' ' || u.last_name as customer_name, u.email
      FROM orders o JOIN users u ON u.id = o.user_id
      ${where} ORDER BY o.created_at DESC LIMIT ? OFFSET ?
    `).all(...params, limitNum, offset);

    res.json({ success: true, data: { orders, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } } });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/orders/:id
router.get('/orders/:id', (req, res, next) => {
  try {
    const order = db.prepare(`
      SELECT o.*, u.first_name || ' ' || u.last_name as customer_name, u.email as customer_email
      FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = ?
    `).get(req.params.id);

    if (!order) return next(new AppError('Order not found', 404));
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    res.json({ success: true, data: { order, items } });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/orders/:id/status
router.put('/orders/:id/status', [
  body('status').isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid status'),
], validate, (req, res, next) => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return next(new AppError('Order not found', 404));

    const validTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered'],
      delivered: [],
      cancelled: [],
    };

    if (!validTransitions[order.status]?.includes(req.body.status)) {
      return next(new AppError(`Cannot change status from ${order.status} to ${req.body.status}`, 400));
    }

    db.prepare("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?").run(req.body.status, req.params.id);
    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    res.json({ success: true, message: 'Order status updated', data: { order: updated } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
