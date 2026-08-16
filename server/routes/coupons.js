const express = require('express');
const db = require('../db/database');
const { AppError } = require('../middleware/auth');

const router = express.Router();

// POST /api/coupons/validate
router.post('/validate', (req, res, next) => {
  try {
    const { code, subtotal } = req.body;

    if (!code || typeof code !== 'string') {
      return next(new AppError('Coupon code is required', 400));
    }
    if (subtotal === undefined || subtotal < 0) {
      return next(new AppError('Valid subtotal is required', 400));
    }

    const coupon = db.prepare('SELECT * FROM coupons WHERE code = ? COLLATE NOCASE').get(code.trim().toUpperCase());

    if (!coupon) {
      return next(new AppError('Invalid coupon code', 404));
    }
    if (!coupon.is_active) {
      return next(new AppError('This coupon is no longer active', 400));
    }
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return next(new AppError('This coupon has expired', 400));
    }
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      return next(new AppError('This coupon has reached its usage limit', 400));
    }
    if (subtotal < coupon.min_order) {
      return next(new AppError(`Minimum order of $${coupon.min_order.toFixed(2)} required for this coupon`, 400));
    }

    let discount = 0;
    if (coupon.type === 'percentage') {
      discount = Math.round(subtotal * (coupon.value / 100) * 100) / 100;
    } else {
      discount = Math.min(coupon.value, subtotal);
    }

    res.json({
      success: true,
      data: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        discount,
        message: `Coupon applied! You save $${discount.toFixed(2)}`,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
