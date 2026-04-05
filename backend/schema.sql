-- =====================================================
-- Farm2Home – PostgreSQL Database Schema
-- Run: psql -U postgres -d farm2home -f schema.sql
-- =====================================================

-- Create database (run separately as postgres superuser)
-- CREATE DATABASE farm2home;
-- \c farm2home

-- ===== EXTENSIONS =====
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ===== DROP EXISTING TABLES (for clean reset) =====
DROP TABLE IF EXISTS contact_messages      CASCADE;
DROP TABLE IF EXISTS newsletter_subscribers CASCADE;
DROP TABLE IF EXISTS payments              CASCADE;
DROP TABLE IF EXISTS order_items           CASCADE;
DROP TABLE IF EXISTS orders                CASCADE;
DROP TABLE IF EXISTS wishlist              CASCADE;
DROP TABLE IF EXISTS cart_items            CASCADE;
DROP TABLE IF EXISTS products              CASCADE;
DROP TABLE IF EXISTS users                 CASCADE;

-- ===== USERS TABLE =====
CREATE TABLE users (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(120)  NOT NULL,
    email       CITEXT        NOT NULL UNIQUE,
    phone       VARCHAR(20),
    password    VARCHAR(256)  NOT NULL,
    role        VARCHAR(20)   NOT NULL DEFAULT 'customer'
                              CHECK (role IN ('customer','farmer','admin')),
    is_active   BOOLEAN       NOT NULL DEFAULT TRUE,

    -- Farmer-specific fields
    village     VARCHAR(150),
    district    VARCHAR(100),
    state       VARCHAR(100),
    bio         TEXT,

    created_at  TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role  ON users(role);

-- ===== PRODUCTS TABLE =====
CREATE TABLE products (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(200)    NOT NULL,
    description  TEXT,
    category     VARCHAR(50)     NOT NULL
                 CHECK (category IN ('vegetables','fruits','grains','dairy','spices')),
    price        NUMERIC(10,2)   NOT NULL CHECK (price > 0),
    old_price    NUMERIC(10,2),
    unit         VARCHAR(30)     NOT NULL DEFAULT 'kg',
    stock_qty    INTEGER         NOT NULL DEFAULT 100 CHECK (stock_qty >= 0),
    emoji        VARCHAR(10),
    badge        VARCHAR(30),
    is_organic   BOOLEAN         NOT NULL DEFAULT FALSE,
    is_active    BOOLEAN         NOT NULL DEFAULT TRUE,
    rating       NUMERIC(2,1)    NOT NULL DEFAULT 4.0
                 CHECK (rating BETWEEN 0 AND 5),
    review_count INTEGER         NOT NULL DEFAULT 0,
    farmer_id    INTEGER         REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_category  ON products(category);
CREATE INDEX idx_products_farmer    ON products(farmer_id);
CREATE INDEX idx_products_active    ON products(is_active);
CREATE INDEX idx_products_name_trgm ON products USING gin(to_tsvector('english', name));

-- ===== CART ITEMS TABLE =====
CREATE TABLE cart_items (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id  INTEGER  NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    qty         INTEGER  NOT NULL DEFAULT 1 CHECK (qty > 0),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, product_id)
);

CREATE INDEX idx_cart_user ON cart_items(user_id);

-- ===== WISHLIST TABLE =====
CREATE TABLE wishlist (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id  INTEGER  NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, product_id)
);

CREATE INDEX idx_wishlist_user ON wishlist(user_id);

-- ===== ORDERS TABLE =====
CREATE TABLE orders (
    id               VARCHAR(20)     PRIMARY KEY,
    user_id          INTEGER         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_amount     NUMERIC(12,2)   NOT NULL CHECK (total_amount >= 0),
    delivery_charge  NUMERIC(8,2)    NOT NULL DEFAULT 0,
    payment_method   VARCHAR(30)
                     CHECK (payment_method IN ('upi','netbanking','credit_card','debit_card','cod')),
    payment_status   VARCHAR(20)     NOT NULL DEFAULT 'pending'
                     CHECK (payment_status IN ('pending','success','failed','refunded')),
    status           VARCHAR(20)     NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','processing','shipped','delivered','cancelled')),

    -- Delivery address (snapshot at time of order)
    delivery_name    VARCHAR(120),
    delivery_phone   VARCHAR(20),
    delivery_address TEXT,
    delivery_city    VARCHAR(100),
    delivery_pincode VARCHAR(10),

    notes            TEXT,
    created_at       TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_user      ON orders(user_id);
CREATE INDEX idx_orders_status    ON orders(status);
CREATE INDEX idx_orders_payment   ON orders(payment_status);
CREATE INDEX idx_orders_created   ON orders(created_at DESC);

-- ===== ORDER ITEMS TABLE =====
CREATE TABLE order_items (
    id          SERIAL PRIMARY KEY,
    order_id    VARCHAR(20)   NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id  INTEGER       REFERENCES products(id) ON DELETE SET NULL,

    -- Snapshot data (preserve even if product changes)
    name        VARCHAR(200)  NOT NULL,
    price       NUMERIC(10,2) NOT NULL,
    qty         INTEGER       NOT NULL CHECK (qty > 0),
    emoji       VARCHAR(10)   DEFAULT '🌿'
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ===== PAYMENTS TABLE =====
CREATE TABLE payments (
    id                SERIAL PRIMARY KEY,
    order_id          VARCHAR(20)     REFERENCES orders(id) ON DELETE CASCADE,
    user_id           INTEGER         REFERENCES users(id) ON DELETE SET NULL,
    amount            NUMERIC(12,2)   NOT NULL,
    method            VARCHAR(30)     NOT NULL,
    status            VARCHAR(20)     NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','success','failed','refunded')),
    transaction_id    VARCHAR(100)    UNIQUE,
    gateway_response  JSONB,
    created_at        TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_order  ON payments(order_id);
CREATE INDEX idx_payments_user   ON payments(user_id);
CREATE INDEX idx_payments_txn    ON payments(transaction_id);

-- ===== NEWSLETTER TABLE =====
CREATE TABLE newsletter_subscribers (
    id          SERIAL PRIMARY KEY,
    email       CITEXT      NOT NULL UNIQUE,
    subscribed  BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- ===== CONTACT MESSAGES TABLE =====
CREATE TABLE contact_messages (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(120),
    email       CITEXT,
    subject     VARCHAR(300),
    message     TEXT,
    is_read     BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- ===================================================================
-- TRIGGERS: Auto-update updated_at
-- ===================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at    BEFORE UPDATE ON users    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_cart_updated_at     BEFORE UPDATE ON cart_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_orders_updated_at   BEFORE UPDATE ON orders   FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===================================================================
-- SEED DATA
-- ===================================================================

-- Admin user (password: admin123)
INSERT INTO users (name, email, phone, password, role) VALUES
('Farm2Home Admin', 'admin@farm2home.in', '9000000000',
 '$2b$12$KIXnFNQHxZgUcWJFzBhHzOmDW1qS/3R4A7YbGMkXJsxQ9pWkBnP0y', 'admin');

-- Farmer accounts (password: farmer123)
INSERT INTO users (name, email, phone, password, role, village, district, state) VALUES
('Ramu Patil',        'ramu@farm.in',     '9876543210', '$2b$12$KIXnFNQHxZgUcWJFzBhHzOmDW1qS/3R4A7YbGMkXJsxQ9pWkBnP0y', 'farmer', 'Yeola',         'Nashik',        'Maharashtra'),
('Anita Shinde',      'anita@farm.in',    '9876543211', '$2b$12$KIXnFNQHxZgUcWJFzBhHzOmDW1qS/3R4A7YbGMkXJsxQ9pWkBnP0y', 'farmer', 'Shirol',        'Kolhapur',      'Maharashtra'),
('Gopal Rao',         'gopal@farm.in',    '9876543212', '$2b$12$KIXnFNQHxZgUcWJFzBhHzOmDW1qS/3R4A7YbGMkXJsxQ9pWkBnP0y', 'farmer', 'Rajapur',       'Ratnagiri',     'Maharashtra'),
('Harish Yadav',      'harish@farm.in',   '9876543213', '$2b$12$KIXnFNQHxZgUcWJFzBhHzOmDW1qS/3R4A7YbGMkXJsxQ9pWkBnP0y', 'farmer', 'Muzaffarnagar', 'Muzaffarnagar', 'Uttar Pradesh'),
('Balram Singh',      'balram@farm.in',   '9876543214', '$2b$12$KIXnFNQHxZgUcWJFzBhHzOmDW1qS/3R4A7YbGMkXJsxQ9pWkBnP0y', 'farmer', 'Anand',         'Anand',         'Gujarat'),
('Krishnaveni Reddy', 'krish@farm.in',    '9876543215', '$2b$12$KIXnFNQHxZgUcWJFzBhHzOmDW1qS/3R4A7YbGMkXJsxQ9pWkBnP0y', 'farmer', 'Guntur',        'Guntur',        'Andhra Pradesh'),
('Parvati Nair',      'parvati@farm.in',  '9876543216', '$2b$12$KIXnFNQHxZgUcWJFzBhHzOmDW1qS/3R4A7YbGMkXJsxQ9pWkBnP0y', 'farmer', 'Palakkad',      'Palakkad',      'Kerala'),
('Thomas Varghese',   'thomas@farm.in',   '9876543217', '$2b$12$KIXnFNQHxZgUcWJFzBhHzOmDW1qS/3R4A7YbGMkXJsxQ9pWkBnP0y', 'farmer', 'Kalpetta',      'Wayanad',       'Kerala');

-- Customer account (password: customer123)
INSERT INTO users (name, email, phone, password, role) VALUES
('Priya Mehta', 'priya@test.com', '9123456789',
 '$2b$12$KIXnFNQHxZgUcWJFzBhHzOmDW1qS/3R4A7YbGMkXJsxQ9pWkBnP0y', 'customer');

-- Sample products
INSERT INTO products (name, description, category, price, old_price, unit, emoji, badge, is_organic, rating, review_count, farmer_id) VALUES
('Fresh Tomatoes',      'Farm-fresh hybrid tomatoes, picked at peak ripeness',        'vegetables', 45,  60,  'kg',     '🍅', 'Fresh',    FALSE, 4.5, 128, 2),
('Organic Spinach',     'Tender organic spinach, grown without pesticides',           'vegetables', 30,  40,  'bunch',  '🥬', 'Organic',  TRUE,  4.7, 89,  3),
('Baby Potatoes',       'Small, creamy baby potatoes from the highlands',             'vegetables', 35,  45,  'kg',     '🥔', NULL,       FALSE, 4.3, 67,  2),
('Fresh Carrots',       'Crunchy, sweet carrots perfect for salads and cooking',      'vegetables', 40,  55,  'kg',     '🥕', 'Popular',  FALSE, 4.6, 102, 3),
('Alphonso Mango',      'The king of mangoes – Ratnagiri Alphonso, GI certified',    'fruits',     280, 350, 'dozen',  '🥭', 'Premium',  FALSE, 5.0, 256, 4),
('Sweet Bananas',       'Naturally ripened, sweet and nutritious bananas',            'fruits',     60,  80,  'dozen',  '🍌', NULL,       FALSE, 4.4, 145, 2),
('Pomegranates',        'Ruby-red, juicy pomegranates from Solapur',                 'fruits',     120, 160, 'kg',     '🍎', 'Seasonal', FALSE, 4.8, 78,  3),
('Fresh Guavas',        'Vitamin C-rich guavas, freshly harvested',                  'fruits',     55,  70,  'kg',     '🍐', NULL,       FALSE, 4.2, 54,  2),
('Basmati Rice',        'Long-grain aged basmati – the gold of Muzaffarnagar',       'grains',     95,  120, 'kg',     '🌾', 'Premium',  FALSE, 4.9, 312, 5),
('Organic Wheat',       'Stone-ground whole wheat, organically grown',               'grains',     38,  50,  'kg',     '🌽', 'Organic',  TRUE,  4.6, 189, 8),
('Toor Dal',            'Premium pigeon peas, perfect for dal and sambar',           'grains',     130, 160, 'kg',     '🫘', NULL,       FALSE, 4.5, 143, 5),
('Moong Dal',           'Split green gram, a protein powerhouse',                    'grains',     110, 135, 'kg',     '🟢', NULL,       FALSE, 4.4, 97,  8),
('Farm Fresh Milk',     'Pure, unprocessed cow milk delivered daily from the farm',  'dairy',      55,  65,  'litre',  '🥛', 'Daily',    FALSE, 4.8, 234, 6),
('Pure Desi Ghee',      'Traditional bilona-churned A2 cow ghee – pure gold',        'dairy',      650, 800, 'kg',     '🧈', 'Premium',  FALSE, 4.9, 167, 6),
('Fresh Paneer',        'Soft, creamy farm-made cottage cheese',                     'dairy',      280, 340, 'kg',     '🧀', 'Fresh',    FALSE, 4.7, 198, 6),
('Curd / Yoghurt',      'Thick, tangy natural curd set in traditional clay pots',    'dairy',      45,  55,  '500g',   '🍶', NULL,       FALSE, 4.5, 88,  6),
('Red Chilli Powder',   'Guntur sannam chilli – the hottest & most aromatic',        'spices',     180, 230, 'kg',     '🌶️', 'Hot',    FALSE, 4.8, 321, 7),
('Turmeric Powder',     'Pure Lakadong turmeric – highest curcumin content',         'spices',     220, 280, 'kg',     '🟡', 'Pure',     TRUE,  4.9, 278, 8),
('Coriander Seeds',     'Sun-dried coriander with full aroma intact',                'spices',     95,  125, 'kg',     '🌿', 'Fresh',    FALSE, 4.6, 115, 7),
('Black Pepper',        'Wayanad black pepper – the king of spices',                 'spices',     680, 850, 'kg',     '⚫', 'Premium',  FALSE, 4.7, 189, 9);

-- ===================================================================
-- USEFUL VIEWS
-- ===================================================================

CREATE OR REPLACE VIEW v_order_summary AS
SELECT
    o.id           AS order_id,
    u.name         AS customer_name,
    u.email        AS customer_email,
    o.total_amount,
    o.payment_method,
    o.payment_status,
    o.status,
    o.delivery_city,
    o.created_at,
    COUNT(oi.id)   AS item_count
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.id, u.name, u.email;

CREATE OR REPLACE VIEW v_product_summary AS
SELECT
    p.id, p.name, p.category, p.price, p.stock_qty,
    p.rating, p.review_count, p.is_active,
    u.name AS farmer_name, u.state AS farmer_state
FROM products p
LEFT JOIN users u ON p.farmer_id = u.id;

-- ===================================================================
-- VERIFY INSTALL
-- ===================================================================
SELECT 'Farm2Home DB schema installed successfully! 🌿' AS status;
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;