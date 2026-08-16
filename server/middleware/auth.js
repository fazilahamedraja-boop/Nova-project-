const jwt = require('jsonwebtoken');
const config = require('../config/env');
const db = require('../db/database');

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

function errorHandler(err, req, res, next) {
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors || undefined,
    });
  }

  if (err.name === 'ValidationError' || err.array) {
    const errors = err.array ? err.array() : [{ msg: err.message }];
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.map((e) => ({ field: e.path || e.param, message: e.msg })),
    });
  }

  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: config.nodeEnv === 'development' ? err.message : 'Internal server error',
  });
}

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', 401));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = db.prepare('SELECT id, email, first_name, last_name, role, is_active FROM users WHERE id = ?').get(decoded.userId);

    if (!user) {
      return next(new AppError('User not found', 401));
    }
    if (!user.is_active) {
      return next(new AppError('Account is deactivated', 403));
    }

    req.user = user;
    next();
  } catch {
    return next(new AppError('Invalid or expired token', 401));
  }
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = db.prepare('SELECT id, email, first_name, last_name, role, is_active FROM users WHERE id = ?').get(decoded.userId);
    if (user && user.is_active) {
      req.user = user;
    }
  } catch {
    // ignore invalid token for optional auth
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return next(new AppError('Admin access required', 403));
  }
  next();
}

function validate(req, res, next) {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const err = new AppError('Validation failed', 400);
    err.errors = errors.array().map((e) => ({ field: e.path, message: e.msg }));
    return next(err);
  }
  next();
}

module.exports = { AppError, errorHandler, authenticate, optionalAuth, requireAdmin, validate };
