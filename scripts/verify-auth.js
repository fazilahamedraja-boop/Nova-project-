/**
 * Verifies customer/admin authorization and unauthenticated access.
 * Run: npm run verify:auth (server must be running)
 */
const http = require('http');

const BASE = process.env.API_BASE || 'http://localhost:3000';

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) options.headers.Authorization = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function login(email, password) {
  const res = await request('POST', '/api/auth/login', { email, password });
  if (res.status !== 200) throw new Error(`Login failed for ${email}: ${res.status}`);
  return res.body.data.token;
}

async function run() {
  console.log('Verifying authorization...\n');
  const results = [];

  async function check(name, fn, expectedStatus) {
    try {
      const res = await fn();
      const pass = res.status === expectedStatus;
      results.push({ name, pass, status: res.status, expected: expectedStatus });
      console.log(`${pass ? 'PASS' : 'FAIL'} ${name} (got ${res.status}, expected ${expectedStatus})`);
      return res;
    } catch (err) {
      results.push({ name, pass: false, error: err.message });
      console.log(`FAIL ${name} (${err.message})`);
      return null;
    }
  }

  // Unauthenticated access
  await check('Unauthenticated GET /api/cart', () => request('GET', '/api/cart'), 401);
  await check('Unauthenticated GET /api/orders', () => request('GET', '/api/orders'), 401);
  await check('Unauthenticated GET /api/admin/dashboard', () => request('GET', '/api/admin/dashboard'), 401);
  await check('Unauthenticated GET /api/users/profile', () => request('GET', '/api/users/profile'), 401);

  // Public endpoints should work without auth
  await check('Unauthenticated GET /api/products', () => request('GET', '/api/products'), 200);
  await check('Unauthenticated GET /api/health', () => request('GET', '/api/health'), 200);

  const customerToken = await login('john.doe@example.com', 'Password123!');
  const adminToken = await login('admin@nova.com', 'Admin123!');

  // Customer access
  await check('Customer GET /api/cart', () => request('GET', '/api/cart', null, customerToken), 200);
  await check('Customer GET /api/admin/dashboard', () => request('GET', '/api/admin/dashboard', null, customerToken), 403);
  await check('Customer GET /api/admin/products', () => request('GET', '/api/admin/products', null, customerToken), 403);

  // Admin access
  await check('Admin GET /api/admin/dashboard', () => request('GET', '/api/admin/dashboard', null, adminToken), 200);
  await check('Admin GET /api/admin/products', () => request('GET', '/api/admin/products', null, adminToken), 200);

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length > 0) {
    process.exit(1);
  }
  console.log('All authorization checks passed.');
}

run().catch((err) => {
  console.error('Auth verification failed:', err.message);
  console.error('Make sure the server is running: npm start');
  process.exit(1);
});
