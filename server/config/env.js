require('dotenv').config();
const path = require('path');

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'fallback-dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  dbPath: path.resolve(process.env.DB_PATH || './database/nova.db'),
  resetTokenExpiresHours: parseInt(process.env.RESET_TOKEN_EXPIRES_HOURS, 10) || 1,
  taxRate: parseFloat(process.env.TAX_RATE) || 0.08,
  shippingFlatRate: parseFloat(process.env.SHIPPING_FLAT_RATE) || 9.99,
  freeShippingThreshold: parseFloat(process.env.FREE_SHIPPING_THRESHOLD) || 75.0,
};
