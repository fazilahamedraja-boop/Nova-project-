const express = require('express');
const db = require('../db/database');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

const VALID_SORT_FIELDS = ['name', 'price', 'rating', 'created_at'];
const VALID_SORT_ORDERS = ['asc', 'desc'];

// GET /api/products
router.get('/', optionalAuth, (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 12,
      search = '',
      category = '',
      brand = '',
      minPrice = '',
      maxPrice = '',
      sort = 'created_at',
      order = 'desc',
      inStock,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
    const offset = (pageNum - 1) * limitNum;

    const sortField = VALID_SORT_FIELDS.includes(sort) ? sort : 'created_at';
    const sortOrder = VALID_SORT_ORDERS.includes(order?.toLowerCase()) ? order.toLowerCase() : 'desc';

    let where = 'WHERE is_active = 1';
    const params = [];

    if (search) {
      where += ' AND (name LIKE ? OR description LIKE ? OR brand LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }
    if (category) {
      where += ' AND category = ?';
      params.push(category);
    }
    if (brand) {
      where += ' AND brand = ?';
      params.push(brand);
    }
    if (minPrice !== '') {
      where += ' AND price >= ?';
      params.push(parseFloat(minPrice));
    }
    if (maxPrice !== '') {
      where += ' AND price <= ?';
      params.push(parseFloat(maxPrice));
    }
    if (inStock === 'true') {
      where += ' AND stock > 0';
    }

    const countRow = db.prepare(`SELECT COUNT(*) as total FROM products ${where}`).get(...params);
    const total = countRow.total;

    const products = db.prepare(`
      SELECT * FROM products ${where}
      ORDER BY ${sortField} ${sortOrder}
      LIMIT ? OFFSET ?
    `).all(...params, limitNum, offset);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/filters
router.get('/filters', (req, res, next) => {
  try {
    const categories = db.prepare('SELECT DISTINCT category FROM products WHERE is_active = 1 ORDER BY category').all().map(r => r.category);
    const brands = db.prepare('SELECT DISTINCT brand FROM products WHERE is_active = 1 ORDER BY brand').all().map(r => r.brand);
    const priceRange = db.prepare('SELECT MIN(price) as min, MAX(price) as max FROM products WHERE is_active = 1').get();

    res.json({
      success: true,
      data: { categories, brands, priceRange },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id
router.get('/:id', optionalAuth, (req, res, next) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    let inWishlist = false;
    if (req.user) {
      const wish = db.prepare('SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?').get(req.user.id, product.id);
      inWishlist = !!wish;
    }

    res.json({ success: true, data: { product, inWishlist } });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/slug/:slug
router.get('/slug/:slug', optionalAuth, (req, res, next) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE slug = ? AND is_active = 1').get(req.params.slug);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    let inWishlist = false;
    if (req.user) {
      const wish = db.prepare('SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?').get(req.user.id, product.id);
      inWishlist = !!wish;
    }

    res.json({ success: true, data: { product, inWishlist } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
