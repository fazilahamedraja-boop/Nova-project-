const express = require('express');
const { body } = require('express-validator');
const db = require('../db/database');
const { AppError, authenticate, validate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// GET /api/cart
router.get('/', (req, res, next) => {
  try {
    const items = db.prepare(`
      SELECT ci.id, ci.quantity, ci.product_id, ci.created_at,
        p.name, p.slug, p.price, p.image_url, p.stock, p.sku
      FROM cart_items ci
      JOIN products p ON p.id = ci.product_id
      WHERE ci.user_id = ? AND p.is_active = 1
      ORDER BY ci.created_at DESC
    `).all(req.user.id);

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    res.json({
      success: true,
      data: { items, subtotal: Math.round(subtotal * 100) / 100, itemCount },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/cart
router.post('/', [
  body('productId').isInt({ min: 1 }).withMessage('Valid product ID is required'),
  body('quantity').optional().isInt({ min: 1, max: 99 }).withMessage('Quantity must be between 1 and 99'),
], validate, (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;

    const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(productId);
    if (!product) {
      return next(new AppError('Product not found', 404));
    }
    if (product.stock < quantity) {
      return next(new AppError(`Only ${product.stock} items available in stock`, 400));
    }

    const existing = db.prepare('SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?').get(req.user.id, productId);

    if (existing) {
      const newQty = existing.quantity + quantity;
      if (newQty > product.stock) {
        return next(new AppError(`Cannot add more than ${product.stock} items`, 400));
      }
      if (newQty > 99) {
        return next(new AppError('Maximum quantity per item is 99', 400));
      }
      db.prepare('UPDATE cart_items SET quantity = ?, updated_at = datetime("now") WHERE id = ?').run(newQty, existing.id);
    } else {
      db.prepare('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)').run(req.user.id, productId, quantity);
    }

    res.status(201).json({ success: true, message: 'Item added to cart' });
  } catch (err) {
    next(err);
  }
});

// PUT /api/cart/:id
router.put('/:id', [
  body('quantity').isInt({ min: 1, max: 99 }).withMessage('Quantity must be between 1 and 99'),
], validate, (req, res, next) => {
  try {
    const { quantity } = req.body;
    const cartItem = db.prepare('SELECT * FROM cart_items WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);

    if (!cartItem) {
      return next(new AppError('Cart item not found', 404));
    }

    const product = db.prepare('SELECT stock FROM products WHERE id = ?').get(cartItem.product_id);
    if (quantity > product.stock) {
      return next(new AppError(`Only ${product.stock} items available in stock`, 400));
    }

    db.prepare('UPDATE cart_items SET quantity = ?, updated_at = datetime("now") WHERE id = ?').run(quantity, cartItem.id);
    res.json({ success: true, message: 'Cart updated' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/cart/:id
router.delete('/:id', (req, res, next) => {
  try {
    const result = db.prepare('DELETE FROM cart_items WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    if (result.changes === 0) {
      return next(new AppError('Cart item not found', 404));
    }
    res.json({ success: true, message: 'Item removed from cart' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/cart
router.delete('/', (req, res, next) => {
  try {
    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);
    res.json({ success: true, message: 'Cart cleared' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
