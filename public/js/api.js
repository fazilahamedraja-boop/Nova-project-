const API_BASE = '/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('nova_token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('nova_token', token);
    } else {
      localStorage.removeItem('nova_token');
    }
  }

  getToken() {
    return this.token || localStorage.getItem('nova_token');
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = { 'Content-Type': 'application/json', ...options.headers };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = { ...options, headers };

    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.message || 'Request failed');
      error.status = response.status;
      error.errors = data.errors;
      throw error;
    }

    return data;
  }

  get(endpoint) { return this.request(endpoint); }
  post(endpoint, body) { return this.request(endpoint, { method: 'POST', body }); }
  put(endpoint, body) { return this.request(endpoint, { method: 'PUT', body }); }
  delete(endpoint) { return this.request(endpoint, { method: 'DELETE' }); }
}

const api = new ApiClient();

// Auth
const auth = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

// Users
const users = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  changePassword: (data) => api.put('/users/change-password', data),
};

// Products
const products = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/products?${query}`);
  },
  get: (id) => api.get(`/products/${id}`),
  getBySlug: (slug) => api.get(`/products/slug/${slug}`),
  filters: () => api.get('/products/filters'),
};

// Cart
const cart = {
  get: () => api.get('/cart'),
  add: (productId, quantity = 1) => api.post('/cart', { productId, quantity }),
  update: (id, quantity) => api.put(`/cart/${id}`, { quantity }),
  remove: (id) => api.delete(`/cart/${id}`),
  clear: () => api.delete('/cart'),
};

// Wishlist
const wishlist = {
  get: () => api.get('/wishlist'),
  add: (productId) => api.post('/wishlist', { productId }),
  remove: (productId) => api.delete(`/wishlist/${productId}`),
};

// Orders
const orders = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/orders?${query}`);
  },
  get: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
};

// Coupons
const coupons = {
  validate: (code, subtotal) => api.post('/coupons/validate', { code, subtotal }),
};

// Admin
const admin = {
  dashboard: () => api.get('/admin/dashboard'),
  products: {
    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return api.get(`/admin/products?${query}`);
    },
    create: (data) => api.post('/admin/products', data),
    update: (id, data) => api.put(`/admin/products/${id}`, data),
    delete: (id) => api.delete(`/admin/products/${id}`),
  },
  users: {
    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return api.get(`/admin/users?${query}`);
    },
    update: (id, data) => api.put(`/admin/users/${id}`, data),
  },
  orders: {
    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return api.get(`/admin/orders?${query}`);
    },
    get: (id) => api.get(`/admin/orders/${id}`),
    updateStatus: (id, status) => api.put(`/admin/orders/${id}/status`, { status }),
  },
};
