const express = require('express');
const path = require('path');
const cors = require('cors');
const config = require('./config/env');
const { errorHandler } = require('./middleware/auth');

// Initialize database
require('./db/database');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const wishlistRoutes = require('./routes/wishlist');
const orderRoutes = require('./routes/orders');
const couponRoutes = require('./routes/coupons');
const adminRoutes = require('./routes/admin');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'NOVA API is running', timestamp: new Date().toISOString() });
});

// Serve static frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

// SPA fallback - serve index for non-API routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API endpoint not found' });
  }
  const filePath = path.join(__dirname, '..', 'public', req.path.endsWith('.html') ? req.path : `${req.path}.html`);
  res.sendFile(filePath, (err) => {
    if (err) {
      res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
    }
  });
});

app.use(errorHandler);

const PORT = config.port;
app.listen(PORT, () => {
  console.log(`\n  NOVA E-Commerce Server`);
  console.log(`  ======================`);
  console.log(`  Running on http://localhost:${PORT}`);
  console.log(`  API:       http://localhost:${PORT}/api/health`);
  console.log(`  Admin:     http://localhost:${PORT}/admin/login.html`);
  console.log(`  Environment: ${config.nodeEnv}\n`);
});

module.exports = app;
