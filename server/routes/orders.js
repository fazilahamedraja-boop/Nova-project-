const express = require('express');
const { body } = require('express-validator');
const db = require('../db/database');
const config = require('../config/env');
const { AppError, authenticate, validate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

function generateOrderNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = db.prepare('SELECT COUNT(*) as c FROM orders').get().c + 1;
  return `NOVA-${date}-${String(count).padStart(4, '0')}`;
}

function calculateShipping(subtotal) {
  return subtotal >= config.freeShippingThreshold ? 0 : config.shippingFlatRate;
}

// GET /api/orders
router.get('/', (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    let where = 'WHERE user_id = ?';
    const params = [req.user.id];

    if (status) {
      where += ' AND status = ?';
      params.push(status);
    }

    const total = db.prepare(`SELECT COUNT(*) as total FROM orders ${where}`).get(...params).total;

    const orders = db.prepare(`
      SELECT id, order_number, status, total, payment_status, created_at,
        (SELECT COUNT(*) FROM order_items WHERE order_id = orders.id) as item_count
      FROM orders ${where}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limitNum, offset);

    res.json({
      success: true,
      data: {
        orders,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:id
router.get('/:id', (req, res, next) => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!order) {
      return next(new AppError('Order not found', 404));
    }

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    res.json({ success: true, data: { order, items } });
  } catch (err) {
    next(err);
  }
});

// POST /api/orders
router.post('/', [
  body('shippingFirstName').trim().notEmpty().withMessage('First name is required'),
  body('shippingLastName').trim().notEmpty().withMessage('Last name is required'),
  body('shippingAddress').trim().notEmpty().withMessage('Address is required'),
  body('shippingCity').trim().notEmpty().withMessage('City is required'),
  body('shippingState').trim().notEmpty().withMessage('State is required'),
  body('shippingZip').trim().notEmpty().withMessage('ZIP code is required'),
  body('paymentMethod').isIn(['credit_card', 'debit_card', 'paypal']).withMessage('Valid payment method is required'),
  body('cardNumber').optional().trim(),
  body('couponCode').optional().trim(),
], validate, (req, res, next) => {
  const transaction = db.transaction(() => {
    const {
      shippingFirstName, shippingLastName, shippingAddress, shippingCity,
      shippingState, shippingZip, shippingCountry = 'US',
      paymentMethod, cardNumber, couponCode,
    } = req.body;

    const cartItems = db.prepare(`
      SELECT ci.quantity, p.id as product_id, p.name, p.sku, p.price, p.stock
      FROM cart_items ci
      JOIN products p ON p.id = ci.product_id
      WHERE ci.user_id = ? AND p.is_active = 1
    `).all(req.user.id);

    if (cartItems.length === 0) {
      throw new AppError('Cart is empty', 400);
    }

    for (const item of cartItems) {
      if (item.quantity > item.stock) {
        throw new AppError(`Insufficient stock for ${item.name}. Only ${item.stock} available.`, 400);
      }
    }

    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    let discount = 0;
    let appliedCoupon = null;

    if (couponCode) {
      const coupon = db.prepare('SELECT * FROM coupons WHERE code = ? COLLATE NOCASE').get(couponCode.trim().toUpperCase());
      if (!coupon) throw new AppError('Invalid coupon code', 400);
      if (!coupon.is_active) throw new AppError('Coupon is no longer active', 400);
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) throw new AppError('Coupon has expired', 400);
      if (coupon.max_uses && coupon.used_count >= coupon.max_uses) throw new AppError('Coupon usage limit reached', 400);
      if (subtotal < coupon.min_order) throw new AppError(`Minimum order of $${coupon.min_order.toFixed(2)} required`, 400);

      if (coupon.type === 'percentage') {
        discount = Math.round(subtotal * (coupon.value / 100) * 100) / 100;
      } else {
        discount = Math.min(coupon.value, subtotal);
      }
      appliedCoupon = coupon;
    }

    const afterDiscount = subtotal - discount;
    const shipping = calculateShipping(afterDiscount);
    const tax = Math.round(afterDiscount * config.taxRate * 100) / 100;
    const total = Math.round((afterDiscount + shipping + tax) * 100) / 100;

    // Mock payment validation
    if (paymentMethod === 'credit_card' || paymentMethod === 'debit_card') {
      if (!cardNumber) throw new AppError('Card number is required', 400);
      const cleanCard = cardNumber.replace(/\s/g, '');
      if (!/^\d{16}$/.test(cleanCard)) throw new AppError('Card number must be 16 digits', 400);
      if (cleanCard === '4000000000000002') throw new AppError('Payment declined. Please try a different card.', 402);
    }

    const orderNumber = generateOrderNumber();
    const orderResult = db.prepare(`
      INSERT INTO orders (user_id, order_number, status, subtotal, discount, shipping, tax, total, coupon_code,
        shipping_first_name, shipping_last_name, shipping_address, shipping_city, shipping_state, shipping_zip,
        shipping_country, payment_method, payment_status)
      VALUES (?, ?, 'confirmed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid')
    `).run(
      req.user.id, orderNumber, subtotal, discount, shipping, tax, total,
      appliedCoupon?.code || null,
      shippingFirstName, shippingLastName, shippingAddress, shippingCity, shippingState, shippingZip, shippingCountry,
      paymentMethod
    );

    const orderId = orderResult.lastInsertRowid;
    const insertItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, total_price)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of cartItems) {
      insertItem.run(orderId, item.product_id, item.name, item.sku, item.quantity, item.price, item.price * item.quantity);
      db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(item.quantity, item.product_id);
    }

    if (appliedCoupon) {
      db.prepare('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?').run(appliedCoupon.id);
    }

    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);

    return { orderId, orderNumber, total };
  });

  try {
    const result = transaction();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(result.orderId);
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(result.orderId);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: { order, items },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
