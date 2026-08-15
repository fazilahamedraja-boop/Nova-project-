const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { body } = require('express-validator');
const db = require('../db/database');
const config = require('../config/env');
const { AppError, authenticate, validate } = require('../middleware/auth');

const router = express.Router();

const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

function generateToken(userId) {
  return jwt.sign({ userId }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

function sanitizeUser(user) {
  const { password_hash, reset_token, reset_token_expires, ...safe } = user;
  return safe;
}

// POST /api/auth/register
router.post('/register', registerValidation, validate, (req, res, next) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return next(new AppError('Email already registered', 409));
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const result = db.prepare(`
      INSERT INTO users (email, password_hash, first_name, last_name, phone)
      VALUES (?, ?, ?, ?, ?)
    `).run(email, passwordHash, firstName, lastName, phone || null);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: { user: sanitizeUser(user), token },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', loginValidation, validate, (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return next(new AppError('Invalid email or password', 401));
    }

    if (!user.is_active) {
      return next(new AppError('Account is deactivated. Contact support.', 403));
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      return next(new AppError('Invalid email or password', 401));
    }

    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Login successful',
      data: { user: sanitizeUser(user), token },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
], validate, (req, res, next) => {
  try {
    const { email } = req.body;
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);

    // Always return success to prevent email enumeration
    if (user) {
      const resetToken = uuidv4();
      const expires = new Date(Date.now() + config.resetTokenExpiresHours * 60 * 60 * 1000).toISOString();
      db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ?, updated_at = datetime("now") WHERE id = ?')
        .run(resetToken, expires, user.id);
    }

    res.json({
      success: true,
      message: 'If an account exists with that email, a reset link has been sent.',
      ...(config.nodeEnv === 'development' && user ? {
        data: { resetToken: db.prepare('SELECT reset_token FROM users WHERE id = ?').get(user.id).reset_token },
      } : {}),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number'),
], validate, (req, res, next) => {
  try {
    const { token, password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE reset_token = ?').get(token);
    if (!user) {
      return next(new AppError('Invalid or expired reset token', 400));
    }

    if (new Date(user.reset_token_expires) < new Date()) {
      return next(new AppError('Reset token has expired', 400));
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    db.prepare(`
      UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL, updated_at = datetime('now')
      WHERE id = ?
    `).run(passwordHash, user.id);

    res.json({ success: true, message: 'Password reset successful' });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res, next) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    res.json({ success: true, data: { user: sanitizeUser(user) } });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;
