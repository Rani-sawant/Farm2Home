/* =====================================================
   FARM2HOME – Frontend JavaScript
   API Base URL: auto-detected (local dev or Render prod)
   =====================================================

   HOW TO SET YOUR RENDER BACKEND URL:
   Replace the RENDER_BACKEND_URL value below with your
   actual Render Web Service URL after deploying, e.g.:
     'https://farm2home-backend.onrender.com/api'
   ===================================================== */

const RENDER_BACKEND_URL = '';   // ← paste your Render backend URL here

const API = RENDER_BACKEND_URL
  || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5000/api'
        : window.location.origin + '/api');

// ===== STATE =====
let cart = JSON.parse(localStorage.getItem('f2h_cart') || '[]');
let wishlist = JSON.parse(localStorage.getItem('f2h_wishlist') || '[]');
let currentUser = JSON.parse(localStorage.getItem('f2h_user') || 'null');
let allProducts = [];
let displayedCount = 8;
let currentFilter = 'all';

// ===== PRODUCT DATA (Fallback/Demo) =====
const PRODUCTS = [
  { id:1, name:'Fresh Tomatoes', category:'vegetables', price:45, unit:'kg', emoji:'🍅', farmer:'Ramu Patil', rating:4.5, reviews:128, badge:'Fresh', old_price:60, stock:true },
  { id:2, name:'Organic Spinach', category:'vegetables', price:30, unit:'bunch', emoji:'🥬', farmer:'Anita Shinde', rating:4.7, reviews:89, badge:'Organic', old_price:40, stock:true },
  { id:3, name:'Baby Potatoes', category:'vegetables', price:35, unit:'kg', emoji:'🥔', farmer:'Vijay Kumar', rating:4.3, reviews:67, badge:null, old_price:45, stock:true },
  { id:4, name:'Fresh Carrots', category:'vegetables', price:40, unit:'kg', emoji:'🥕', farmer:'Lakshmi Devi', rating:4.6, reviews:102, badge:'Popular', old_price:55, stock:true },
  { id:5, name:'Alphonso Mango', category:'fruits', price:280, unit:'dozen', emoji:'🥭', farmer:'Gopal Rao', rating:5.0, reviews:256, badge:'Premium', old_price:350, stock:true },
  { id:6, name:'Sweet Bananas', category:'fruits', price:60, unit:'dozen', emoji:'🍌', farmer:'Suresh Naik', rating:4.4, reviews:145, badge:null, old_price:80, stock:true },
  { id:7, name:'Pomegranates', category:'fruits', price:120, unit:'kg', emoji:'🍎', farmer:'Rekha Joshi', rating:4.8, reviews:78, badge:'Seasonal', old_price:160, stock:true },
  { id:8, name:'Guavas', category:'fruits', price:55, unit:'kg', emoji:'🍐', farmer:'Mohan Desai', rating:4.2, reviews:54, badge:null, old_price:70, stock:true },
  { id:9, name:'Basmati Rice', category:'grains', price:95, unit:'kg', emoji:'🌾', farmer:'Harish Yadav', rating:4.9, reviews:312, badge:'Premium', old_price:120, stock:true },
  { id:10, name:'Organic Wheat', category:'grains', price:38, unit:'kg', emoji:'🌽', farmer:'Parvati Nair', rating:4.6, reviews:189, badge:'Organic', old_price:50, stock:true },
  { id:11, name:'Toor Dal', category:'grains', price:130, unit:'kg', emoji:'🫘', farmer:'Dinesh Gaikwad', rating:4.5, reviews:143, badge:null, old_price:160, stock:true },
  { id:12, name:'Moong Dal', category:'grains', price:110, unit:'kg', emoji:'🟢', farmer:'Sushma Pawar', rating:4.4, reviews:97, badge:null, old_price:135, stock:true },
  { id:13, name:'Farm Fresh Milk', category:'dairy', price:55, unit:'litre', emoji:'🥛', farmer:'Balram Singh', rating:4.8, reviews:234, badge:'Daily', old_price:65, stock:true },
  { id:14, name:'Pure Desi Ghee', category:'dairy', price:650, unit:'kg', emoji:'🧈', farmer:'Kamla Rani', rating:4.9, reviews:167, badge:'Premium', old_price:800, stock:true },
  { id:15, name:'Fresh Paneer', category:'dairy', price:280, unit:'kg', emoji:'🧀', farmer:'Ramesh Dairy', rating:4.7, reviews:198, badge:'Fresh', old_price:340, stock:true },
  { id:16, name:'Curd/Yoghurt', category:'dairy', price:45, unit:'500g', emoji:'🍶', farmer:'Sudha Farms', rating:4.5, reviews:88, badge:null, old_price:55, stock:true },
  { id:17, name:'Red Chilli Powder', category:'spices', price:180, unit:'kg', emoji:'🌶️', farmer:'Krishnaveni', rating:4.8, reviews:321, badge:'Hot', old_price:230, stock:true },
  { id:18, name:'Turmeric Powder', category:'spices', price:220, unit:'kg', emoji:'🟡', farmer:'Savita Kumari', rating:4.9, reviews:278, badge:'Pure', old_price:280, stock:true },
  { id:19, name:'Coriander Seeds', category:'spices', price:95, unit:'kg', emoji:'🌿', farmer:'Meena Bai', rating:4.6, reviews:115, badge:'Fresh', old_price:125, stock:true },
  { id:20, name:'Black Pepper', category:'spices', price:680, unit:'kg', emoji:'⚫', farmer:'Thomas Varghese', rating:4.7, reviews:189, badge:'Premium', old_price:850, stock:true },
];

const FARMERS = [
  { name:'Ramu Patil', location:'Nashik, Maharashtra', specialty:'Vegetables', emoji:'👨‍🌾', rating:'4.8', years:12 },
  { name:'Anita Shinde', location:'Kolhapur, Maharashtra', specialty:'Leafy Greens', emoji:'👩‍🌾', rating:'4.9', years:8 },
  { name:'Gopal Rao', location:'Ratnagiri, Maharashtra', specialty:'Alphonso Mango', emoji:'👨‍🌾', rating:'5.0', years:20 },
  { name:'Harish Yadav', location:'Muzaffarnagar, UP', specialty:'Basmati Rice', emoji:'👨‍🌾', rating:'4.7', years:15 },
  { name:'Balram Singh', location:'Anand, Gujarat', specialty:'Dairy Products', emoji:'👨‍🌾', rating:'4.8', years:18 },
  { name:'Krishnaveni', location:'Guntur, Andhra Pradesh', specialty:'Spices & Chilli', emoji:'👩‍🌾', rating:'4.9', years:10 },
  { name:'Parvati Nair', location:'Palakkad, Kerala', specialty:'Organic Grains', emoji:'👩‍🌾', rating:'4.6', years:7 },
  { name:'Thomas Varghese', location:'Wayanad, Kerala', specialty:'Black Pepper', emoji:'👨‍🌾', rating:'4.7', years:14 },
];

const REVIEWS = [
  { name:'Priya Mehta', city:'Mumbai', emoji:'👩', rating:5, text:'Absolutely amazing quality! The tomatoes and spinach were so fresh. You can literally taste the difference from supermarket produce. Will definitely order again!' },
  { name:'Rajesh Kumar', city:'Pune', emoji:'👨', rating:5, text:'Farm2Home has changed how my family eats. The Alphonso mangoes were absolutely divine! My kids love everything we order. Great prices too.' },
  { name:'Sunita Sharma', city:'Delhi', emoji:'👩', rating:4, text:'Quick delivery and excellent packaging. The organic wheat flour has made our rotis taste so much better. Supporting farmers feels wonderful too.' },
  { name:'Amit Verma', city:'Bangalore', emoji:'👨', rating:5, text:'Best ghee I\'ve ever tasted! Pure, fragrant, and exactly like what my grandmother used to buy from the local dairy. Worth every rupee!' },
  { name:'Kavitha Reddy', city:'Hyderabad', emoji:'👩', rating:5, text:'The spices are unbelievably fresh and aromatic. My curries now taste restaurant quality. Farm2Home is a blessing for home cooks!' },
  { name:'Suresh Patel', city:'Ahmedabad', emoji:'👨', rating:4, text:'Consistent quality week after week. The vegetables are always crisp and the dairy products are delivered fresh daily. Excellent service!' },
];

const FAQS = [
  { q: 'How fresh are the products?', a: 'All products are harvested and packed within 24 hours of your order. We work directly with farmers to ensure maximum freshness and zero middlemen.' },
  { q: 'What are the delivery charges?', a: 'Delivery is FREE on orders above ₹499. For orders below ₹499, we charge a nominal fee of ₹40. Same-day delivery available in select cities.' },
  { q: 'Can I return or replace products?', a: 'Yes! If you receive damaged or substandard products, we\'ll replace them for free or issue a full refund within 24 hours. Just raise a complaint through our app or website.' },
  { q: 'How do farmers join Farm2Home?', a: 'Farmers can register on our platform, get verified by our team, and start listing their products within 3–5 business days. We provide training and support to help them succeed.' },
  { q: 'Are the products certified organic?', a: 'Products marked as "Organic" are certified by APEDA or state organic certification bodies. All other products are naturally grown using traditional farming methods.' },
  { q: 'What payment methods are accepted?', a: 'We accept UPI (all apps), Net Banking, Credit/Debit Cards (Visa, Mastercard, RuPay), and Cash on Delivery. All payments are secured with 256-bit encryption.' },
];

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  updateBadges();
  renderProducts();
  renderFarmers();
  renderReviews();
  renderFAQs();
  setupNav();
  setupSearch();
  setupPaymentToggle();
  setupIntersectionObserver();
  updateAuthUI();

  // Load more
  document.getElementById('loadMoreBtn').addEventListener('click', loadMore);
});

// ===== NAVBAR =====
function setupNav() {
  const navbar = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  const backToTop = document.getElementById('backToTop');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 60) {
      navbar.classList.add('scrolled');
      backToTop.classList.add('visible');
    } else {
      navbar.classList.remove('scrolled');
      backToTop.classList.remove('visible');
    }

    // Highlight active nav link
    const sections = document.querySelectorAll('section[id]');
    sections.forEach(s => {
      const sTop = s.offsetTop - 80;
      if (window.scrollY >= sTop) {
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        const link = document.querySelector(`.nav-link[href="#${s.id}"]`);
        if (link) link.classList.add('active');
      }
    });
  });

  hamburger.addEventListener('click', () => navLinks.classList.toggle('open'));

  document.querySelectorAll('.nav-link').forEach(l => {
    l.addEventListener('click', () => navLinks.classList.remove('open'));
  });

  // Search toggle
  document.getElementById('searchToggle').addEventListener('click', () => {
    document.getElementById('searchBar').classList.toggle('active');
  });

  // Cart & Wishlist buttons
  document.getElementById('cartBtn').addEventListener('click', openCart);
  document.getElementById('wishlistBtn').addEventListener('click', openWishlist);
  document.getElementById('loginBtn').addEventListener('click', () => {
    if (currentUser) showUserMenu();
    else openModal('loginModal');
  });
}

// ===== SEARCH =====
function setupSearch() {
  const input = document.getElementById('searchInput');
  const results = document.getElementById('searchResults');
  let debounceTimer;

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const q = input.value.trim().toLowerCase();
      if (q.length < 2) { results.classList.remove('active'); return; }

      // Try API first, fallback to local
      fetchSearch(q).then(items => renderSearchResults(items, results));
    }, 300);
  });

  document.getElementById('searchBtn').addEventListener('click', () => {
    const q = input.value.trim().toLowerCase();
    if (q) fetchSearch(q).then(items => renderSearchResults(items, results));
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container') && !e.target.closest('.search-results')) {
      results.classList.remove('active');
    }
  });
}

async function fetchSearch(q) {
  try {
    const res = await fetch(`${API}/products/search?q=${encodeURIComponent(q)}`);
    if (res.ok) return await res.json();
  } catch {}
  return PRODUCTS.filter(p => p.name.toLowerCase().includes(q) || p.category.includes(q)).slice(0, 6);
}

function renderSearchResults(items, container) {
  if (!items.length) { container.classList.remove('active'); return; }
  container.innerHTML = items.map(p => `
    <div class="search-result-item" onclick="scrollToProduct(${p.id})">
      <span class="sr-emoji">${p.emoji || '🌿'}</span>
      <div class="sr-info">
        <h4>${p.name}</h4>
        <p>₹${p.price}/${p.unit} — ${p.category}</p>
      </div>
    </div>
  `).join('');
  container.classList.add('active');
}

function scrollToProduct(id) {
  document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
  document.getElementById('searchBar').classList.remove('active');
  document.getElementById('searchResults').classList.remove('active');
}

// ===== PRODUCTS =====
function renderProducts(filter = 'all', count = 8) {
  const grid = document.getElementById('productsGrid');
  const filtered = filter === 'all' ? PRODUCTS : PRODUCTS.filter(p => p.category === filter);
  const visible = filtered.slice(0, count);

  grid.innerHTML = visible.map(p => productCard(p)).join('');
  allProducts = filtered;
  displayedCount = count;

  document.getElementById('loadMoreBtn').style.display = filtered.length > count ? 'inline-flex' : 'none';
}

function productCard(p) {
  const inCart = cart.some(c => c.id === p.id);
  const inWish = wishlist.some(w => w.id === p.id);
  const stars = '★'.repeat(Math.floor(p.rating)) + (p.rating % 1 >= 0.5 ? '½' : '');

  return `
    <div class="product-card fade-in" id="product-${p.id}">
      <div class="product-img">
        <span>${p.emoji}</span>
        ${p.badge ? `<span class="product-badge">${p.badge}</span>` : ''}
        <div class="product-actions">
          <button class="action-btn ${inWish ? 'wished' : ''}" onclick="toggleWishlist(${p.id})" title="Wishlist">
            <i class="${inWish ? 'fas' : 'far'} fa-heart"></i>
          </button>
          <button class="action-btn" onclick="quickView(${p.id})" title="Quick View">
            <i class="fas fa-eye"></i>
          </button>
        </div>
      </div>
      <div class="product-info">
        <div class="product-category">${p.category}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-farmer">by ${p.farmer}</div>
        <div class="product-rating">
          <span class="stars">${'★'.repeat(Math.floor(p.rating))}${ p.rating % 1 >= 0.5 ? '☆' : ''}</span>
          <span class="rating-num">${p.rating} (${p.reviews})</span>
        </div>
        <div class="product-footer">
          <div>
            <span class="product-price">₹${p.price}<span class="unit">/${p.unit}</span></span>
            ${p.old_price ? `<span class="price-old">₹${p.old_price}</span>` : ''}
          </div>
          <button class="add-cart-btn ${inCart ? 'added' : ''}" id="cart-btn-${p.id}" onclick="addToCart(${p.id})">
            <i class="fas fa-${inCart ? 'check' : 'cart-plus'}"></i>
            ${inCart ? 'Added' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  `;
}

function filterProducts(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderProducts(filter, 8);
  setTimeout(() => {
    document.querySelectorAll('.fade-in').forEach(el => el.classList.add('visible'));
  }, 50);
}

function filterByCategory(cat) {
  document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
  const btn = document.querySelector(`[data-filter="${cat}"]`);
  if (btn) filterProducts(cat, btn);
}

function loadMore() {
  displayedCount += 4;
  renderProducts(currentFilter, displayedCount);
  setTimeout(() => {
    document.querySelectorAll('.fade-in').forEach(el => el.classList.add('visible'));
  }, 50);
}

// ===== CART =====
function addToCart(id) {
  const product = PRODUCTS.find(p => p.id === id);
  if (!product) return;

  const existing = cart.find(c => c.id === id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...product, qty: 1 });
  }

  saveCart();
  updateBadges();

  // Update button
  const btn = document.getElementById(`cart-btn-${id}`);
  if (btn) {
    btn.classList.add('added');
    btn.innerHTML = '<i class="fas fa-check"></i> Added';
  }

  showToast(`${product.name} added to cart! 🛒`, 'success');

  // Try API
  apiCall('POST', '/cart', { product_id: id, qty: 1 });
}

function openCart() {
  const container = document.getElementById('cartItems');
  const footer = document.getElementById('cartFooter');

  if (!cart.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🛒</div>
        <h3>Your cart is empty</h3>
        <p>Add some fresh produce to get started!</p>
      </div>`;
    footer.innerHTML = '';
  } else {
    container.innerHTML = cart.map(item => `
      <div class="cart-item">
        <div class="cart-item-emoji">${item.emoji}</div>
        <div class="cart-item-info">
          <h4>${item.name}</h4>
          <div class="price">₹${item.price * item.qty}</div>
          <div class="qty-controls">
            <button class="qty-btn" onclick="updateQty(${item.id}, -1)">−</button>
            <span class="qty-num">${item.qty}</span>
            <button class="qty-btn" onclick="updateQty(${item.id}, 1)">+</button>
          </div>
        </div>
        <button class="remove-btn" onclick="removeFromCart(${item.id})">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `).join('');

    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const savings = cart.reduce((s, i) => s + ((i.old_price || i.price) - i.price) * i.qty, 0);

    footer.innerHTML = `
      <div class="cart-total">
        <span>Total (${cart.length} items)</span>
        <span>₹${total.toLocaleString('en-IN')}</span>
      </div>
      ${savings > 0 ? `<p style="color:var(--green);font-size:0.85rem;margin-bottom:0.75rem">You save ₹${savings.toLocaleString('en-IN')}!</p>` : ''}
      <button class="btn-primary full" onclick="openCheckout()">
        Proceed to Checkout <i class="fas fa-arrow-right"></i>
      </button>
    `;
  }
  openModal('cartModal');
}

function updateQty(id, delta) {
  const item = cart.find(c => c.id === id);
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  saveCart();
  openCart();
}

function removeFromCart(id) {
  cart = cart.filter(c => c.id !== id);
  saveCart();
  updateBadges();
  openCart();
  showToast('Item removed from cart');
  apiCall('DELETE', `/cart/${id}`);
}

function saveCart() {
  localStorage.setItem('f2h_cart', JSON.stringify(cart));
  updateBadges();
}

// ===== WISHLIST =====
function toggleWishlist(id) {
  const product = PRODUCTS.find(p => p.id === id);
  if (!product) return;

  const idx = wishlist.findIndex(w => w.id === id);
  if (idx > -1) {
    wishlist.splice(idx, 1);
    showToast(`${product.name} removed from wishlist`);
  } else {
    wishlist.push({ ...product });
    showToast(`${product.name} added to wishlist! ❤️`, 'success');
  }

  localStorage.setItem('f2h_wishlist', JSON.stringify(wishlist));
  updateBadges();
  renderProducts(currentFilter, displayedCount);
  setTimeout(() => document.querySelectorAll('.fade-in').forEach(el => el.classList.add('visible')), 50);
  apiCall('POST', '/wishlist', { product_id: id });
}

function openWishlist() {
  const container = document.getElementById('wishlistItems');
  if (!wishlist.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">❤️</div>
        <h3>Your wishlist is empty</h3>
        <p>Save your favourite products here!</p>
      </div>`;
  } else {
    container.innerHTML = wishlist.map(item => `
      <div class="cart-item">
        <div class="cart-item-emoji">${item.emoji}</div>
        <div class="cart-item-info">
          <h4>${item.name}</h4>
          <div class="price">₹${item.price}/${item.unit}</div>
        </div>
        <div style="display:flex;gap:0.5rem">
          <button class="add-cart-btn" onclick="addToCart(${item.id});closeModal('wishlistModal')">
            <i class="fas fa-cart-plus"></i> Add to Cart
          </button>
          <button class="remove-btn" onclick="toggleWishlist(${item.id});openWishlist()">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `).join('');
  }
  openModal('wishlistModal');
}

// ===== CHECKOUT =====
function openCheckout() {
  if (!currentUser) {
    closeModal('cartModal');
    showToast('Please login to checkout', 'error');
    setTimeout(() => openModal('loginModal'), 300);
    return;
  }
  if (!cart.length) { showToast('Your cart is empty', 'error'); return; }

  // Pre-fill user info
  document.getElementById('chkName').value = currentUser.name || '';
  document.getElementById('chkPhone').value = currentUser.phone || '';

  // Render summary
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const delivery = total >= 499 ? 0 : 40;
  document.getElementById('checkoutSummary').innerHTML = `
    ${cart.map(i => `
      <div class="checkout-summary-item">
        <span>${i.emoji} ${i.name} × ${i.qty}</span>
        <span>₹${i.price * i.qty}</span>
      </div>
    `).join('')}
    <div class="checkout-summary-item">
      <span>Delivery</span>
      <span>${delivery === 0 ? '<span style="color:var(--green)">FREE</span>' : `₹${delivery}`}</span>
    </div>
    <div class="checkout-total">
      <span>Grand Total</span>
      <span>₹${(total + delivery).toLocaleString('en-IN')}</span>
    </div>
  `;

  closeModal('cartModal');
  openModal('checkoutModal');
}

async function placeOrder() {
  const name = document.getElementById('chkName').value.trim();
  const phone = document.getElementById('chkPhone').value.trim();
  const address = document.getElementById('chkAddress').value.trim();
  const city = document.getElementById('chkCity').value.trim();
  const pincode = document.getElementById('chkPincode').value.trim();
  const payment = document.querySelector('input[name="payment"]:checked').value;

  if (!name || !phone || !address || !city || !pincode) {
    showToast('Please fill all delivery details', 'error'); return;
  }
  if (pincode.length !== 6) {
    showToast('Invalid pincode', 'error'); return;
  }

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const delivery = total >= 499 ? 0 : 40;
  const orderId = 'F2H' + Date.now().toString().slice(-8);

  const orderData = {
    order_id: orderId,
    user_id: currentUser?.id,
    items: cart,
    delivery_address: { name, phone, address, city, pincode },
    payment_method: payment,
    total: total + delivery,
    status: 'pending'
  };

  try {
    const res = await apiCall('POST', '/orders', orderData);
    processSuccess(orderId, payment);
  } catch {
    processSuccess(orderId, payment); // Simulate success for demo
  }
}

function processSuccess(orderId, payment) {
  // Simulate payment processing
  closeModal('checkoutModal');

  const msg = payment === 'cod'
    ? 'Pay ₹' + cart.reduce((s,i) => s+i.price*i.qty, 0) + ' on delivery 💵'
    : 'Payment processed successfully ✅';

  document.getElementById('successMsg').textContent = msg;
  document.getElementById('orderIdDisplay').textContent = `Order ID: ${orderId}`;

  // Save to order history
  const orders = JSON.parse(localStorage.getItem('f2h_orders') || '[]');
  orders.unshift({
    id: orderId,
    items: [...cart],
    total: cart.reduce((s,i) => s+i.price*i.qty, 0),
    payment,
    date: new Date().toLocaleDateString('en-IN'),
    status: 'pending'
  });
  localStorage.setItem('f2h_orders', JSON.stringify(orders));

  cart = [];
  saveCart();
  renderProducts(currentFilter, displayedCount);

  openModal('successModal');
}

// ===== FARMERS =====
function renderFarmers() {
  const grid = document.getElementById('farmersGrid');
  grid.innerHTML = FARMERS.map(f => `
    <div class="farmer-card fade-in">
      <div class="farmer-avatar">${f.emoji}</div>
      <h3>${f.name}</h3>
      <div class="farmer-loc">📍 ${f.location}</div>
      <div class="farmer-spec">${f.specialty}</div>
      <div class="farmer-rating">${'★'.repeat(Math.floor(parseFloat(f.rating)))} ${f.rating}</div>
      <p style="font-size:0.75rem;color:var(--text-light);margin-top:0.4rem">${f.years} years of farming</p>
    </div>
  `).join('');
}

// ===== REVIEWS =====
function renderReviews() {
  const slider = document.getElementById('reviewsSlider');
  slider.innerHTML = REVIEWS.map(r => `
    <div class="review-card fade-in">
      <div class="review-stars">${'★'.repeat(r.rating)}</div>
      <p class="review-text">${r.text}</p>
      <div class="reviewer">
        <div class="reviewer-avatar">${r.emoji}</div>
        <div>
          <div class="reviewer-name">${r.name}</div>
          <div class="reviewer-city">📍 ${r.city}</div>
        </div>
      </div>
    </div>
  `).join('');
}

// ===== FAQS =====
function renderFAQs() {
  const list = document.getElementById('faqList');
  list.innerHTML = FAQS.map((faq, i) => `
    <div class="faq-item" id="faq-${i}">
      <div class="faq-q" onclick="toggleFAQ(${i})">
        <span>${faq.q}</span>
        <i class="fas fa-chevron-down"></i>
      </div>
      <div class="faq-a">${faq.a}</div>
    </div>
  `).join('');
}

function toggleFAQ(i) {
  const item = document.getElementById(`faq-${i}`);
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(el => el.classList.remove('open'));
  if (!isOpen) item.classList.add('open');
}

// ===== AUTH =====
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) { showToast('Please fill all fields', 'error'); return; }

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
      currentUser = data.user;
      localStorage.setItem('f2h_user', JSON.stringify(currentUser));
      localStorage.setItem('f2h_token', data.token);
      updateAuthUI();
      closeModal('loginModal');
      showToast(`Welcome back, ${currentUser.name}! 🌿`, 'success');
    } else {
      showToast(data.error || 'Invalid credentials', 'error');
    }
  } catch {
    // Demo login
    currentUser = { id: 1, name: email.split('@')[0], email, role: 'customer' };
    localStorage.setItem('f2h_user', JSON.stringify(currentUser));
    updateAuthUI();
    closeModal('loginModal');
    showToast(`Welcome, ${currentUser.name}! 🌿`, 'success');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const phone = document.getElementById('regPhone').value.trim();
  const role = document.getElementById('regRole').value;
  const password = document.getElementById('regPassword').value;

  if (!name || !email || !phone || !password) { showToast('All fields required', 'error'); return; }
  if (password.length < 6) { showToast('Password must be 6+ characters', 'error'); return; }

  try {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, role, password })
    });
    const data = await res.json();
    if (res.ok) {
      currentUser = data.user;
      localStorage.setItem('f2h_user', JSON.stringify(currentUser));
      updateAuthUI();
      closeModal('loginModal');
      showToast(`Welcome to Farm2Home, ${name}! 🌱`, 'success');
    } else {
      showToast(data.error || 'Registration failed', 'error');
    }
  } catch {
    // Demo register
    currentUser = { id: Date.now(), name, email, phone, role };
    localStorage.setItem('f2h_user', JSON.stringify(currentUser));
    updateAuthUI();
    closeModal('loginModal');
    showToast(`Account created! Welcome, ${name}! 🌱`, 'success');
  }
}

function updateAuthUI() {
  const btn = document.getElementById('loginBtn');
  if (currentUser) {
    btn.textContent = `👤 ${currentUser.name.split(' ')[0]}`;
    btn.onclick = showUserMenu;
  } else {
    btn.textContent = 'Login';
    btn.onclick = () => openModal('loginModal');
  }
}

function showUserMenu() {
  const menu = ['My Orders', 'My Profile', 'Logout'];
  // Simple dropdown simulation
  const existing = document.getElementById('userDropdown');
  if (existing) { existing.remove(); return; }

  const dropdown = document.createElement('div');
  dropdown.id = 'userDropdown';
  dropdown.style.cssText = `
    position:fixed;top:72px;right:5%;background:#fff;border:1px solid var(--border);
    border-radius:var(--radius);padding:0.5rem;box-shadow:var(--shadow-lg);z-index:2000;min-width:160px;
  `;
  dropdown.innerHTML = `
    <div style="padding:8px 12px;font-weight:700;color:var(--green-dark);border-bottom:1px solid var(--border);margin-bottom:4px">
      👋 ${currentUser.name}
    </div>
    <div onclick="openOrders()" style="padding:8px 12px;cursor:pointer;border-radius:6px;transition:background 0.2s" onmouseover="this.style.background='var(--green-bg)'" onmouseout="this.style.background='none'">📋 My Orders</div>
    <div onclick="logout()" style="padding:8px 12px;cursor:pointer;border-radius:6px;color:#e63946;transition:background 0.2s" onmouseover="this.style.background='#fee'" onmouseout="this.style.background='none'">🚪 Logout</div>
  `;
  document.body.appendChild(dropdown);
  setTimeout(() => document.addEventListener('click', () => dropdown.remove(), { once: true }), 100);
}

function openOrders() {
  const orders = JSON.parse(localStorage.getItem('f2h_orders') || '[]');
  const container = document.getElementById('ordersList');
  if (!orders.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">📦</div><h3>No orders yet</h3><p>Start shopping to see your orders here!</p></div>';
  } else {
    container.innerHTML = orders.map(o => `
      <div class="order-item">
        <div class="order-item-header">
          <span class="order-id">#${o.id}</span>
          <span class="order-status-badge">${o.status.toUpperCase()}</span>
        </div>
        <p style="font-size:0.85rem;color:var(--text-light)">${o.date} • ${o.items.length} item(s) • ₹${o.total}</p>
        <p style="font-size:0.8rem;margin-top:0.25rem">Payment: ${o.payment.replace('_',' ').toUpperCase()}</p>
      </div>
    `).join('');
  }
  openModal('ordersModal');
}

function logout() {
  currentUser = null;
  localStorage.removeItem('f2h_user');
  localStorage.removeItem('f2h_token');
  updateAuthUI();
  showToast('Logged out successfully');
  apiCall('POST', '/auth/logout');
}

// ===== PAYMENT TOGGLE =====
function setupPaymentToggle() {
  document.querySelectorAll('input[name="payment"]').forEach(radio => {
    radio.addEventListener('change', () => {
      document.getElementById('upiFields').style.display = 'none';
      document.getElementById('cardFields').style.display = 'none';
      if (radio.value === 'upi') document.getElementById('upiFields').style.display = 'block';
      if (['credit_card', 'debit_card'].includes(radio.value)) document.getElementById('cardFields').style.display = 'block';
    });
  });
}

// ===== NEWSLETTER =====
async function subscribeNewsletter(e) {
  e.preventDefault();
  const email = document.getElementById('nlEmail').value.trim();
  try {
    await apiCall('POST', '/newsletter', { email });
  } catch {}
  showToast('Subscribed! Thank you 🌿', 'success');
  document.getElementById('nlEmail').value = '';
}

// ===== CONTACT =====
async function submitContact(e) {
  e.preventDefault();
  const data = {
    name: document.getElementById('cName').value,
    email: document.getElementById('cEmail').value,
    subject: document.getElementById('cSubject').value,
    message: document.getElementById('cMessage').value
  };
  try {
    await apiCall('POST', '/contact', data);
  } catch {}
  showToast('Message sent! We\'ll reply within 24 hours 📧', 'success');
  e.target.reset();
}

// ===== UTILS =====
function openModal(id) {
  document.getElementById(id).classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
  document.body.style.overflow = '';
}

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(overlay.id);
  });
});

function switchTab(tab) {
  document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('loginTab').classList.toggle('active', tab === 'login');
  document.getElementById('registerTab').classList.toggle('active', tab === 'register');
}

function togglePass(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.replace('fa-eye', 'fa-eye-slash');
  } else {
    input.type = 'password';
    icon.classList.replace('fa-eye-slash', 'fa-eye');
  }
}

function updateBadges() {
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const wishCount = wishlist.length;
  document.getElementById('cartCount').textContent = cartCount;
  document.getElementById('wishlistCount').textContent = wishCount;
  document.getElementById('cartCount').style.display = cartCount > 0 ? 'flex' : 'none';
  document.getElementById('wishlistCount').style.display = wishCount > 0 ? 'flex' : 'none';
}

function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function quickView(id) {
  const p = PRODUCTS.find(x => x.id === id);
  if (!p) return;
  showToast(`${p.emoji} ${p.name} — ₹${p.price}/${p.unit} by ${p.farmer}`);
}

async function apiCall(method, endpoint, body = null) {
  const token = localStorage.getItem('f2h_token');
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${endpoint}`, opts);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ===== INTERSECTION OBSERVER =====
function setupIntersectionObserver() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

  // Re-observe after dynamic renders
  const mutationObs = new MutationObserver(() => {
    document.querySelectorAll('.fade-in:not([data-observed])').forEach(el => {
      el.setAttribute('data-observed', '1');
      observer.observe(el);
    });
  });
  mutationObs.observe(document.body, { childList: true, subtree: true });
}

// Escape key closes modals
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(m => closeModal(m.id));
  }
});