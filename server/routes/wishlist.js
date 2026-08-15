const express = require('express');
const { body } = require('express-validator');
const db = require('../db/database');
const { AppError, authenticate, validate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// GET /api/wishlist
router.get('/', (req, res, next) => {
  try {
    const items = db.prepare(`
      SELECT w.id, w.product_id, w.created_at,
        p.name, p.slug, p.price, p.compare_price, p.image_url, p.stock, p.rating, p.category
      FROM wishlist w
      JOIN products p ON p.id = w.product_id
      WHERE w.user_id = ? AND p.is_active = 1
      ORDER BY w.created_at DESC
    `).all(req.user.id);

    res.json({ success: true, data: { items, count: items.length } });
  } catch (err) {
    next(err);
  }
});

// POST /api/wishlist
router.post('/', [
  body('productId').isInt({ min: 1 }).withMessage('Valid product ID is required'),
], validate, (req, res, next) => {
  try {
    const { productId } = req.body;

    const product = db.prepare('SELECT id FROM products WHERE id = ? AND is_active = 1').get(productId);
    if (!product) {
      return next(new AppError('Product not found', 404));
    }

    const existing = db.prepare('SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?').get(req.user.id, productId);
    if (existing) {
      return next(new AppError('Product already in wishlist', 409));
    }

    db.prepare('INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)').run(req.user.id, productId);
    res.status(201).json({ success: true, message: 'Added to wishlist' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/wishlist/:productId
router.delete('/:productId', (req, res, next) => {
  try {
    const result = db.prepare('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?')
      .run(req.user.id, req.params.productId);

    if (result.changes === 0) {
      return next(new AppError('Item not found in wishlist', 404));
    }
    res.json({ success: true, message: 'Removed from wishlist' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
