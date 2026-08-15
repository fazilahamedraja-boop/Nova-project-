const express = require('express');
const { body } = require('express-validator');
const db = require('../db/database');
const { AppError, authenticate, validate } = require('../middleware/auth');

const router = express.Router();

function sanitizeUser(user) {
  const { password_hash, reset_token, reset_token_expires, ...safe } = user;
  return safe;
}

// GET /api/users/profile
router.get('/profile', authenticate, (req, res, next) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    res.json({ success: true, data: { user: sanitizeUser(user) } });
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/profile
router.put('/profile', authenticate, [
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
  body('phone').optional().trim(),
  body('address').optional().trim(),
  body('city').optional().trim(),
  body('state').optional().trim(),
  body('zip').optional().trim(),
  body('country').optional().trim(),
], validate, (req, res, next) => {
  try {
    const { firstName, lastName, phone, address, city, state, zip, country } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    db.prepare(`
      UPDATE users SET
        first_name = ?, last_name = ?, phone = ?, address = ?,
        city = ?, state = ?, zip = ?, country = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      firstName ?? user.first_name,
      lastName ?? user.last_name,
      phone ?? user.phone,
      address ?? user.address,
      city ?? user.city,
      state ?? user.state,
      zip ?? user.zip,
      country ?? user.country,
      req.user.id
    );

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    res.json({ success: true, message: 'Profile updated', data: { user: sanitizeUser(updated) } });
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/change-password
router.put('/change-password', authenticate, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number'),
], validate, (req, res, next) => {
  try {
    const bcrypt = require('bcryptjs');
    const { currentPassword, newPassword } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
      return next(new AppError('Current password is incorrect', 400));
    }

    const passwordHash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?')
      .run(passwordHash, req.user.id);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
