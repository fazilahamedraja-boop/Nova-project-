function formatPrice(price) {
  return `$${Number(price).toFixed(2)}`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function formatDateTime(dateStr) {
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function getQueryParams() {
  return Object.fromEntries(new URLSearchParams(window.location.search));
}

function setQueryParams(params) {
  const url = new URL(window.location);
  Object.entries(params).forEach(([key, value]) => {
    if (value === '' || value === null || value === undefined) {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, value);
    }
  });
  window.history.replaceState({}, '', url);
}

function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function getStatusBadge(status) {
  const map = {
    pending: 'badge-warning',
    confirmed: 'badge-info',
    processing: 'badge-info',
    shipped: 'badge-info',
    delivered: 'badge-success',
    cancelled: 'badge-danger',
    paid: 'badge-success',
    failed: 'badge-danger',
    refunded: 'badge-warning',
  };
  return `<span class="badge ${map[status] || 'badge-neutral'}" data-testid="status-badge">${status}</span>`;
}

function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  let stars = '';
  for (let i = 0; i < 5; i++) {
    if (i < full) stars += '★';
    else if (i === full && half) stars += '½';
    else stars += '☆';
  }
  return stars;
}

function showLoading(container) {
  container.innerHTML = '<div class="loading-overlay" data-testid="loading-spinner"><div class="spinner"></div><p>Loading...</p></div>';
}

function showEmpty(container, icon, title, message, actionHtml = '') {
  container.innerHTML = `
    <div class="empty-state" data-testid="empty-state">
      <div class="empty-state-icon">${icon}</div>
      <h3>${title}</h3>
      <p>${message}</p>
      ${actionHtml}
    </div>`;
}

function showError(container, message) {
  container.innerHTML = `<div class="alert alert-error" data-testid="error-message">${message}</div>`;
}

function renderPagination(container, pagination, onPageChange) {
  const { page, totalPages } = pagination;
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '<div class="pagination" data-testid="pagination">';
  html += `<button ${page <= 1 ? 'disabled' : ''} data-page="${page - 1}" data-testid="pagination-prev">← Prev</button>`;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
      html += `<button class="${i === page ? 'active' : ''}" data-page="${i}" data-testid="pagination-page-${i}">${i}</button>`;
    } else if (i === page - 3 || i === page + 3) {
      html += '<button disabled>...</button>';
    }
  }

  html += `<button ${page >= totalPages ? 'disabled' : ''} data-page="${page + 1}" data-testid="pagination-next">Next →</button>`;
  html += '</div>';

  container.innerHTML = html;
  container.querySelectorAll('button[data-page]').forEach(btn => {
    btn.addEventListener('click', () => onPageChange(parseInt(btn.dataset.page)));
  });
}

function renderProductCard(product) {
  const discount = product.compare_price && product.compare_price > product.price;
  return `
    <div class="product-card" data-testid="product-card" data-product-id="${product.id}">
      <div class="product-card-image">
        <a href="/product-detail.html?id=${product.id}" data-testid="product-link">
          <img src="${product.image_url || '/images/products/placeholder.svg'}" alt="${product.name}" loading="lazy" data-testid="product-image">
        </a>
        ${discount ? '<span class="product-card-badge" data-testid="sale-badge">Sale</span>' : ''}
        ${product.stock === 0 ? '<span class="product-card-badge" style="background:var(--color-text-muted);left:auto;right:0.75rem" data-testid="out-of-stock-badge">Out of Stock</span>' : ''}
      </div>
      <div class="product-card-body">
        <div class="product-card-category" data-testid="product-category">${product.category}</div>
        <div class="product-card-name">
          <a href="/product-detail.html?id=${product.id}" data-testid="product-name">${product.name}</a>
        </div>
        <div class="product-card-rating" data-testid="product-rating">
          <span>${renderStars(product.rating)}</span> (${product.review_count})
        </div>
        <div class="product-card-price" data-testid="product-price">
          <span class="price-current">${formatPrice(product.price)}</span>
          ${discount ? `<span class="price-compare">${formatPrice(product.compare_price)}</span>` : ''}
        </div>
        <div class="product-card-actions">
          <button class="btn btn-primary btn-sm btn-block" data-action="add-to-cart" data-product-id="${product.id}" data-testid="add-to-cart-btn" id="add-to-cart-${product.id}" ${product.stock === 0 ? 'disabled' : ''}>
            ${product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>`;
}

function validateForm(form) {
  const errors = {};
  form.querySelectorAll('[required]').forEach(field => {
    if (!field.value.trim()) {
      errors[field.name] = `${field.labels?.[0]?.textContent || field.name} is required`;
      field.classList.add('error');
    } else {
      field.classList.remove('error');
    }
  });

  form.querySelectorAll('[data-validate]').forEach(field => {
    const rule = field.dataset.validate;
    if (rule === 'email' && field.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) {
      errors[field.name] = 'Please enter a valid email';
      field.classList.add('error');
    }
    if (rule === 'password' && field.value && field.value.length < 8) {
      errors[field.name] = 'Password must be at least 8 characters';
      field.classList.add('error');
    }
  });

  return errors;
}

function displayFormErrors(form, errors) {
  form.querySelectorAll('.form-error').forEach(el => el.remove());
  Object.entries(errors).forEach(([name, message]) => {
    const field = form.querySelector(`[name="${name}"]`);
    if (field) {
      const errorEl = document.createElement('div');
      errorEl.className = 'form-error';
      errorEl.setAttribute('data-testid', `error-${name}`);
      errorEl.textContent = message;
      field.parentNode.appendChild(errorEl);
    }
  });
}

function requireAuth(redirectTo = '/login.html') {
  if (!api.getToken()) {
    window.location.href = `${redirectTo}?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    return false;
  }
  return true;
}

function requireAdmin() {
  const user = JSON.parse(localStorage.getItem('nova_user') || 'null');
  if (!user || user.role !== 'admin') {
    window.location.href = '/admin/login.html';
    return false;
  }
  return true;
}
