function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('data-testid', `toast-${type}`);
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('nova_user'));
  } catch {
    return null;
  }
}

function setCurrentUser(user) {
  if (user) {
    localStorage.setItem('nova_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('nova_user');
  }
}

async function handleLogin(email, password) {
  const res = await auth.login({ email, password });
  api.setToken(res.data.token);
  setCurrentUser(res.data.user);
  return res.data.user;
}

async function handleLogout() {
  try { await auth.logout(); } catch { /* ignore */ }
  api.setToken(null);
  setCurrentUser(null);
  window.location.href = '/';
}

async function refreshUser() {
  try {
    const res = await auth.me();
    setCurrentUser(res.data.user);
    return res.data.user;
  } catch {
    api.setToken(null);
    setCurrentUser(null);
    return null;
  }
}

function renderNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  const user = getCurrentUser();
  const isAdmin = window.location.pathname.includes('/admin/');

  if (isAdmin) {
    navbar.innerHTML = `
      <nav class="navbar" data-testid="admin-navbar">
        <div class="container">
          <a href="/admin/dashboard.html" class="navbar-brand" data-testid="navbar-brand">NOVA <span>Admin</span></a>
          <div class="navbar-actions">
            ${user ? `<span class="text-muted" style="font-size:0.875rem" data-testid="admin-user-name">${user.first_name}</span>
            <button class="btn btn-secondary btn-sm" onclick="handleLogout()" data-testid="logout-btn">Logout</button>` : ''}
          </div>
        </div>
      </nav>`;
    return;
  }

  navbar.innerHTML = `
    <nav class="navbar" data-testid="navbar" id="main-navbar">
      <div class="container">
        <a href="/" class="navbar-brand" data-testid="navbar-brand" id="navbar-brand">NOVA</a>
        <ul class="navbar-nav" id="navbar-nav" data-testid="navbar-nav">
          <li><a href="/" data-testid="nav-home" id="nav-home">Home</a></li>
          <li><a href="/products.html" data-testid="nav-products" id="nav-products">Products</a></li>
        </ul>
        <div class="navbar-actions" id="navbar-actions" data-testid="navbar-actions">
          ${user ? `
            <a href="/wishlist.html" class="btn-icon nav-icon-btn" data-testid="nav-wishlist" id="nav-wishlist" title="Wishlist">♡</a>
            <a href="/cart.html" class="btn-icon nav-icon-btn" data-testid="nav-cart" id="nav-cart" title="Cart">🛒</a>
            <a href="/orders.html" class="btn btn-secondary btn-sm" data-testid="nav-orders" id="nav-orders">Orders</a>
            <a href="/profile.html" class="btn btn-secondary btn-sm" data-testid="nav-profile" id="nav-profile">${user.first_name}</a>
            <button class="btn btn-secondary btn-sm" onclick="handleLogout()" data-testid="logout-btn" id="logout-btn">Logout</button>
          ` : `
            <a href="/login.html" class="btn btn-secondary btn-sm" data-testid="nav-login" id="nav-login">Login</a>
            <a href="/register.html" class="btn btn-primary btn-sm" data-testid="nav-register" id="nav-register">Register</a>
          `}
        </div>
      </div>
    </nav>`;

  const currentPath = window.location.pathname;
  navbar.querySelectorAll('.navbar-nav a').forEach(link => {
    if (link.getAttribute('href') === currentPath || (currentPath === '/index.html' && link.getAttribute('href') === '/')) {
      link.classList.add('active');
    }
  });
}

function renderFooter() {
  const footer = document.getElementById('footer');
  if (!footer) return;

  footer.innerHTML = `
    <footer class="footer" data-testid="footer">
      <div class="container">
        <div class="footer-grid">
          <div>
            <div class="footer-brand">NOVA</div>
            <p style="font-size:0.875rem">Your destination for quality products. Built as a QA automation portfolio project.</p>
          </div>
          <div>
            <h4 style="color:#fff;margin-bottom:0.75rem;font-size:0.875rem">Shop</h4>
            <p><a href="/products.html">All Products</a></p>
            <p><a href="/products.html?category=Electronics">Electronics</a></p>
            <p><a href="/products.html?category=Clothing">Clothing</a></p>
          </div>
          <div>
            <h4 style="color:#fff;margin-bottom:0.75rem;font-size:0.875rem">Account</h4>
            <p><a href="/login.html">Login</a></p>
            <p><a href="/register.html">Register</a></p>
            <p><a href="/orders.html">Order History</a></p>
          </div>
          <div>
            <h4 style="color:#fff;margin-bottom:0.75rem;font-size:0.875rem">Support</h4>
            <p><a href="mailto:support@nova.com">support@nova.com</a></p>
            <p>Mon-Fri 9am-5pm EST</p>
          </div>
        </div>
        <div class="footer-bottom">
          &copy; ${new Date().getFullYear()} NOVA E-Commerce. QA Portfolio Project.
        </div>
      </div>
    </footer>`;
}

document.addEventListener('DOMContentLoaded', () => {
  renderNavbar();
  renderFooter();
});
