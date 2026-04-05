"""
Farm2Home – Flask Backend API
Run: python app.py
API Base: http://localhost:5000/api
"""

from flask import Flask, request, jsonify, session
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_jwt_extended import (
    JWTManager, create_access_token, jwt_required,
    get_jwt_identity, get_jwt
)
from datetime import datetime, timedelta, timezone
from functools import wraps
import os, re, uuid

# ===== APP SETUP =====
app = Flask(__name__)

from datetime import timedelta

app.config.update(
    SECRET_KEY=os.environ.get('SECRET_KEY', 'farm2home_super_secret_key_2025'),
    SQLALCHEMY_DATABASE_URI="sqlite:///site.db",
    SQLALCHEMY_TRACK_MODIFICATIONS=False,
    JWT_SECRET_KEY=os.environ.get('JWT_SECRET', 'farm2home_jwt_secret_2025'),
    JWT_ACCESS_TOKEN_EXPIRES=timedelta(days=7),
    JSON_SORT_KEYS=False
)

db      = SQLAlchemy(app)
bcrypt  = Bcrypt(app)
jwt     = JWTManager(app)
CORS(app, origins=['http://localhost:3000', 'http://127.0.0.1:5500', '*'],
     supports_credentials=True)

# ===================================================================
# MODELS
# ===================================================================

class User(db.Model):
    __tablename__ = 'users'
    id         = db.Column(db.Integer, primary_key=True)
    name       = db.Column(db.String(120), nullable=False)
    email      = db.Column(db.String(200), unique=True, nullable=False)
    phone      = db.Column(db.String(20))
    password   = db.Column(db.String(256), nullable=False)
    role       = db.Column(db.String(20), default='customer')   # customer | farmer | admin
    is_active  = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Farmer fields (only if role=='farmer')
    village    = db.Column(db.String(150))
    district   = db.Column(db.String(100))
    state      = db.Column(db.String(100))
    bio        = db.Column(db.Text)

    orders     = db.relationship('Order',   back_populates='user', lazy='dynamic')
    cart_items = db.relationship('CartItem',back_populates='user', lazy='dynamic', cascade='all, delete-orphan')
    wishlist   = db.relationship('Wishlist',back_populates='user', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id':         self.id,
            'name':       self.name,
            'email':      self.email,
            'phone':      self.phone,
            'role':       self.role,
            'village':    self.village,
            'district':   self.district,
            'state':      self.state,
            'created_at': self.created_at.isoformat()
        }


class Product(db.Model):
    __tablename__ = 'products'
    id          = db.Column(db.Integer, primary_key=True)
    name        = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    category    = db.Column(db.String(50), nullable=False)   # vegetables|fruits|grains|dairy|spices
    price       = db.Column(db.Numeric(10, 2), nullable=False)
    old_price   = db.Column(db.Numeric(10, 2))
    unit        = db.Column(db.String(30), default='kg')
    stock_qty   = db.Column(db.Integer, default=100)
    emoji       = db.Column(db.String(10))
    badge       = db.Column(db.String(30))
    is_organic  = db.Column(db.Boolean, default=False)
    is_active   = db.Column(db.Boolean, default=True)
    rating      = db.Column(db.Numeric(2, 1), default=4.0)
    review_count= db.Column(db.Integer, default=0)
    farmer_id   = db.Column(db.Integer, db.ForeignKey('users.id'))
    farmer      = db.relationship('User', foreign_keys=[farmer_id])
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':          self.id,
            'name':        self.name,
            'description': self.description,
            'category':    self.category,
            'price':       float(self.price),
            'old_price':   float(self.old_price) if self.old_price else None,
            'unit':        self.unit,
            'stock_qty':   self.stock_qty,
            'emoji':       self.emoji,
            'badge':       self.badge,
            'is_organic':  self.is_organic,
            'rating':      float(self.rating),
            'reviews':     self.review_count,
            'farmer':      self.farmer.name if self.farmer else 'Farm2Home',
            'farmer_id':   self.farmer_id,
        }


class CartItem(db.Model):
    __tablename__ = 'cart_items'
    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    qty        = db.Column(db.Integer, default=1)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user    = db.relationship('User',    back_populates='cart_items')
    product = db.relationship('Product', lazy='joined')

    def to_dict(self):
        return {
            'id':      self.id,
            'product': self.product.to_dict(),
            'qty':     self.qty,
            'subtotal':float(self.product.price) * self.qty
        }


class Wishlist(db.Model):
    __tablename__ = 'wishlist'
    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user    = db.relationship('User',    back_populates='wishlist')
    product = db.relationship('Product', lazy='joined')

    __table_args__ = (db.UniqueConstraint('user_id', 'product_id'),)

    def to_dict(self):
        return {'id': self.id, 'product': self.product.to_dict()}


class Order(db.Model):
    __tablename__ = 'orders'
    id               = db.Column(db.String(20), primary_key=True)
    user_id          = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    total_amount     = db.Column(db.Numeric(12, 2), nullable=False)
    delivery_charge  = db.Column(db.Numeric(8, 2), default=0)
    payment_method   = db.Column(db.String(30))
    payment_status   = db.Column(db.String(20), default='pending')  # pending|success|failed
    status           = db.Column(db.String(20), default='pending')  # pending|processing|shipped|delivered|cancelled
    delivery_name    = db.Column(db.String(120))
    delivery_phone   = db.Column(db.String(20))
    delivery_address = db.Column(db.Text)
    delivery_city    = db.Column(db.String(100))
    delivery_pincode = db.Column(db.String(10))
    notes            = db.Column(db.Text)
    created_at       = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at       = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user  = db.relationship('User',      back_populates='orders')
    items = db.relationship('OrderItem', back_populates='order', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id':               self.id,
            'total_amount':     float(self.total_amount),
            'delivery_charge':  float(self.delivery_charge),
            'payment_method':   self.payment_method,
            'payment_status':   self.payment_status,
            'status':           self.status,
            'delivery_address': self.delivery_address,
            'delivery_city':    self.delivery_city,
            'delivery_pincode': self.delivery_pincode,
            'created_at':       self.created_at.isoformat(),
            'items':            [i.to_dict() for i in self.items],
        }


class OrderItem(db.Model):
    __tablename__ = 'order_items'
    id         = db.Column(db.Integer, primary_key=True)
    order_id   = db.Column(db.String(20), db.ForeignKey('orders.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'))
    name       = db.Column(db.String(200))
    price      = db.Column(db.Numeric(10, 2))
    qty        = db.Column(db.Integer)
    emoji      = db.Column(db.String(10))

    order   = db.relationship('Order',   back_populates='items')
    product = db.relationship('Product', lazy='joined')

    def to_dict(self):
        return {
            'product_id': self.product_id,
            'name':       self.name,
            'price':      float(self.price),
            'qty':        self.qty,
            'subtotal':   float(self.price) * self.qty,
            'emoji':      self.emoji
        }


class Payment(db.Model):
    __tablename__ = 'payments'
    id             = db.Column(db.Integer, primary_key=True)
    order_id       = db.Column(db.String(20), db.ForeignKey('orders.id'))
    user_id        = db.Column(db.Integer, db.ForeignKey('users.id'))
    amount         = db.Column(db.Numeric(12, 2))
    method         = db.Column(db.String(30))
    status         = db.Column(db.String(20), default='pending')
    transaction_id = db.Column(db.String(100), unique=True)
    gateway_response = db.Column(db.Text)
    created_at     = db.Column(db.DateTime, default=datetime.utcnow)


class NewsletterSubscriber(db.Model):
    __tablename__ = 'newsletter_subscribers'
    id         = db.Column(db.Integer, primary_key=True)
    email      = db.Column(db.String(200), unique=True, nullable=False)
    subscribed = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class ContactMessage(db.Model):
    __tablename__ = 'contact_messages'
    id         = db.Column(db.Integer, primary_key=True)
    name       = db.Column(db.String(120))
    email      = db.Column(db.String(200))
    subject    = db.Column(db.String(300))
    message    = db.Column(db.Text)
    is_read    = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# ===================================================================
# HELPERS
# ===================================================================

def validate_email(email):
    return re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', email)

def generate_order_id():
    return 'F2H' + datetime.utcnow().strftime('%Y%m%d') + str(uuid.uuid4())[:4].upper()

def error(msg, code=400):
    return jsonify({'error': msg}), code

def success(data, code=200):
    return jsonify(data), code

# ===================================================================
# ROUTES – HEALTH
# ===================================================================

@app.route('/')
def index():
    return jsonify({'message': 'Farm2Home API is running 🌿', 'version': '1.0.0'})

@app.route('/api/health')
def health():
    return jsonify({'status': 'ok', 'timestamp': datetime.utcnow().isoformat()})

# ===================================================================
# AUTH ROUTES
# ===================================================================

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data:
        return error('No data provided')

    required = ['name', 'email', 'password']
    for field in required:
        if not data.get(field):
            return error(f'{field} is required')

    if not validate_email(data['email']):
        return error('Invalid email address')

    if len(data['password']) < 6:
        return error('Password must be at least 6 characters')

    if User.query.filter_by(email=data['email'].lower()).first():
        return error('Email already registered')

    role = data.get('role', 'customer')
    if role not in ('customer', 'farmer', 'admin'):
        role = 'customer'

    user = User(
        name     = data['name'].strip(),
        email    = data['email'].lower().strip(),
        phone    = data.get('phone', ''),
        password = bcrypt.generate_password_hash(data['password']).decode('utf-8'),
        role     = role,
        village  = data.get('village'),
        district = data.get('district'),
        state    = data.get('state'),
    )
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=user.id, additional_claims={'role': user.role})
    return success({'message': 'Registration successful', 'user': user.to_dict(), 'token': token}, 201)


@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return error('Email and password required')

    user = User.query.filter_by(email=data['email'].lower().strip()).first()

    if not user or not bcrypt.check_password_hash(user.password, data['password']):
        return error('Invalid email or password', 401)

    if not user.is_active:
        return error('Account is deactivated', 403)

    token = create_access_token(identity=user.id, additional_claims={'role': user.role})
    return success({'message': 'Login successful', 'user': user.to_dict(), 'token': token})


@app.route('/api/auth/logout', methods=['POST'])
@jwt_required()
def logout():
    return success({'message': 'Logged out successfully'})


@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def me():
    user = User.query.get(get_jwt_identity())
    if not user:
        return error('User not found', 404)
    return success(user.to_dict())


@app.route('/api/auth/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user = User.query.get(get_jwt_identity())
    data = request.get_json()
    for field in ('name', 'phone', 'village', 'district', 'state', 'bio'):
        if field in data:
            setattr(user, field, data[field])
    db.session.commit()
    return success(user.to_dict())

# ===================================================================
# PRODUCT ROUTES
# ===================================================================

@app.route('/api/products', methods=['GET'])
def get_products():
    page     = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 12, type=int)
    category = request.args.get('category')
    sort     = request.args.get('sort', 'created_at')
    order_dir= request.args.get('order', 'desc')

    query = Product.query.filter_by(is_active=True)
    if category:
        query = query.filter_by(category=category)

    if sort == 'price_asc':
        query = query.order_by(Product.price.asc())
    elif sort == 'price_desc':
        query = query.order_by(Product.price.desc())
    elif sort == 'rating':
        query = query.order_by(Product.rating.desc())
    else:
        query = query.order_by(Product.created_at.desc())

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    return success({
        'products':  [p.to_dict() for p in pagination.items],
        'total':     pagination.total,
        'pages':     pagination.pages,
        'page':      page,
        'per_page':  per_page,
    })


@app.route('/api/products/search', methods=['GET'])
def search_products():
    q = request.args.get('q', '').strip()
    if len(q) < 2:
        return success({'products': []})

    products = Product.query.filter(
        Product.is_active == True,
        (Product.name.ilike(f'%{q}%') |
         Product.category.ilike(f'%{q}%') |
         Product.description.ilike(f'%{q}%'))
    ).limit(10).all()

    return success([p.to_dict() for p in products])


@app.route('/api/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    product = Product.query.get_or_404(product_id)
    return success(product.to_dict())


@app.route('/api/products', methods=['POST'])
@jwt_required()
def create_product():
    claims = get_jwt()
    if claims.get('role') not in ('farmer', 'admin'):
        return error('Only farmers can add products', 403)

    data = request.get_json()
    required = ['name', 'category', 'price']
    for f in required:
        if not data.get(f):
            return error(f'{f} is required')

    product = Product(
        name        = data['name'],
        description = data.get('description'),
        category    = data['category'],
        price       = data['price'],
        old_price   = data.get('old_price'),
        unit        = data.get('unit', 'kg'),
        stock_qty   = data.get('stock_qty', 100),
        emoji       = data.get('emoji', '🌿'),
        badge       = data.get('badge'),
        is_organic  = data.get('is_organic', False),
        farmer_id   = get_jwt_identity()
    )
    db.session.add(product)
    db.session.commit()
    return success(product.to_dict(), 201)


@app.route('/api/products/<int:product_id>', methods=['PUT'])
@jwt_required()
def update_product(product_id):
    product = Product.query.get_or_404(product_id)
    data = request.get_json()
    for field in ('name', 'description', 'price', 'old_price', 'unit', 'stock_qty', 'emoji', 'badge', 'is_organic', 'is_active'):
        if field in data:
            setattr(product, field, data[field])
    db.session.commit()
    return success(product.to_dict())


@app.route('/api/categories', methods=['GET'])
def get_categories():
    return success({
        'categories': ['vegetables', 'fruits', 'grains', 'dairy', 'spices']
    })

# ===================================================================
# CART ROUTES
# ===================================================================

@app.route('/api/cart', methods=['GET'])
@jwt_required()
def get_cart():
    user_id = get_jwt_identity()
    items = CartItem.query.filter_by(user_id=user_id).all()
    total = sum(float(i.product.price) * i.qty for i in items)
    return success({'items': [i.to_dict() for i in items], 'total': total, 'count': len(items)})


@app.route('/api/cart', methods=['POST'])
@jwt_required()
def add_to_cart():
    user_id = get_jwt_identity()
    data = request.get_json()

    product_id = data.get('product_id')
    qty        = max(1, int(data.get('qty', 1)))

    product = Product.query.get(product_id)
    if not product or not product.is_active:
        return error('Product not found or unavailable', 404)

    existing = CartItem.query.filter_by(user_id=user_id, product_id=product_id).first()
    if existing:
        existing.qty += qty
    else:
        item = CartItem(user_id=user_id, product_id=product_id, qty=qty)
        db.session.add(item)

    db.session.commit()
    return success({'message': f'{product.name} added to cart', 'qty': qty}, 201)


@app.route('/api/cart/<int:product_id>', methods=['PUT'])
@jwt_required()
def update_cart_item(product_id):
    user_id = get_jwt_identity()
    item = CartItem.query.filter_by(user_id=user_id, product_id=product_id).first()
    if not item:
        return error('Item not in cart', 404)

    data = request.get_json()
    qty = int(data.get('qty', 1))
    if qty <= 0:
        db.session.delete(item)
    else:
        item.qty = qty
    db.session.commit()
    return success({'message': 'Cart updated'})


@app.route('/api/cart/<int:product_id>', methods=['DELETE'])
@jwt_required()
def remove_from_cart(product_id):
    user_id = get_jwt_identity()
    item = CartItem.query.filter_by(user_id=user_id, product_id=product_id).first()
    if item:
        db.session.delete(item)
        db.session.commit()
    return success({'message': 'Removed from cart'})


@app.route('/api/cart/clear', methods=['DELETE'])
@jwt_required()
def clear_cart():
    user_id = get_jwt_identity()
    CartItem.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    return success({'message': 'Cart cleared'})

# ===================================================================
# WISHLIST ROUTES
# ===================================================================

@app.route('/api/wishlist', methods=['GET'])
@jwt_required()
def get_wishlist():
    user_id = get_jwt_identity()
    items = Wishlist.query.filter_by(user_id=user_id).all()
    return success([i.to_dict() for i in items])


@app.route('/api/wishlist', methods=['POST'])
@jwt_required()
def toggle_wishlist():
    user_id    = get_jwt_identity()
    product_id = request.get_json().get('product_id')

    existing = Wishlist.query.filter_by(user_id=user_id, product_id=product_id).first()
    if existing:
        db.session.delete(existing)
        db.session.commit()
        return success({'message': 'Removed from wishlist', 'action': 'removed'})

    item = Wishlist(user_id=user_id, product_id=product_id)
    db.session.add(item)
    db.session.commit()
    return success({'message': 'Added to wishlist', 'action': 'added'}, 201)


@app.route('/api/wishlist/<int:product_id>', methods=['DELETE'])
@jwt_required()
def remove_from_wishlist(product_id):
    user_id = get_jwt_identity()
    item = Wishlist.query.filter_by(user_id=user_id, product_id=product_id).first()
    if item:
        db.session.delete(item)
        db.session.commit()
    return success({'message': 'Removed from wishlist'})

# ===================================================================
# ORDER ROUTES
# ===================================================================

@app.route('/api/orders', methods=['POST'])
@jwt_required()
def place_order():
    user_id = get_jwt_identity()
    data = request.get_json()

    # Validate required fields
    required = ['items', 'payment_method']
    for f in required:
        if not data.get(f):
            return error(f'{f} is required')

    items = data['items']
    if not items:
        return error('Order must have at least one item')

    # Calculate total
    subtotal = sum(float(i['price']) * int(i['qty']) for i in items)
    delivery_charge = 0 if subtotal >= 499 else 40
    total = subtotal + delivery_charge

    order_id = generate_order_id()
    delivery = data.get('delivery_address', {})

    order = Order(
        id               = order_id,
        user_id          = user_id,
        total_amount     = total,
        delivery_charge  = delivery_charge,
        payment_method   = data['payment_method'],
        payment_status   = 'success' if data['payment_method'] != 'cod' else 'pending',
        status           = 'processing' if data['payment_method'] != 'cod' else 'pending',
        delivery_name    = delivery.get('name'),
        delivery_phone   = delivery.get('phone'),
        delivery_address = delivery.get('address'),
        delivery_city    = delivery.get('city'),
        delivery_pincode = delivery.get('pincode'),
    )
    db.session.add(order)

    for item in items:
        order_item = OrderItem(
            order_id   = order_id,
            product_id = item.get('id'),
            name       = item['name'],
            price      = item['price'],
            qty        = item['qty'],
            emoji      = item.get('emoji', '🌿'),
        )
        db.session.add(order_item)

        # Reduce stock
        if item.get('id'):
            product = Product.query.get(item['id'])
            if product:
                product.stock_qty = max(0, product.stock_qty - item['qty'])

    # Record payment
    txn_id = 'TXN' + str(uuid.uuid4()).replace('-', '')[:16].upper()
    payment = Payment(
        order_id       = order_id,
        user_id        = user_id,
        amount         = total,
        method         = data['payment_method'],
        status         = 'success' if data['payment_method'] != 'cod' else 'pending',
        transaction_id = txn_id,
    )
    db.session.add(payment)

    # Clear cart
    CartItem.query.filter_by(user_id=user_id).delete()

    db.session.commit()

    return success({
        'message':        'Order placed successfully!',
        'order_id':       order_id,
        'total':          total,
        'payment_status': order.payment_status,
        'status':         order.status,
        'transaction_id': txn_id,
    }, 201)


@app.route('/api/orders', methods=['GET'])
@jwt_required()
def get_orders():
    user_id = get_jwt_identity()
    orders = Order.query.filter_by(user_id=user_id).order_by(Order.created_at.desc()).all()
    return success([o.to_dict() for o in orders])


@app.route('/api/orders/<order_id>', methods=['GET'])
@jwt_required()
def get_order(order_id):
    user_id = get_jwt_identity()
    order = Order.query.filter_by(id=order_id, user_id=user_id).first()
    if not order:
        return error('Order not found', 404)
    return success(order.to_dict())


@app.route('/api/orders/<order_id>/cancel', methods=['PUT'])
@jwt_required()
def cancel_order(order_id):
    user_id = get_jwt_identity()
    order = Order.query.filter_by(id=order_id, user_id=user_id).first()
    if not order:
        return error('Order not found', 404)
    if order.status not in ('pending', 'processing'):
        return error('Order cannot be cancelled at this stage')
    order.status = 'cancelled'
    db.session.commit()
    return success({'message': 'Order cancelled successfully'})

# ===================================================================
# PAYMENT ROUTES (Simulation)
# ===================================================================

@app.route('/api/payment/verify', methods=['POST'])
@jwt_required()
def verify_payment():
    """Simulate payment gateway verification"""
    data = request.get_json()
    order_id = data.get('order_id')
    txn_id   = data.get('transaction_id')

    payment = Payment.query.filter_by(order_id=order_id, transaction_id=txn_id).first()
    if not payment:
        return error('Payment not found', 404)

    # Simulate payment success (in real app, verify with gateway)
    payment.status = 'success'
    order = Order.query.get(order_id)
    if order:
        order.payment_status = 'success'
        order.status = 'processing'
    db.session.commit()

    return success({'verified': True, 'status': 'success'})


@app.route('/api/payment/methods', methods=['GET'])
def payment_methods():
    return success({
        'methods': [
            {'id': 'upi',        'name': 'UPI',          'icon': '📱'},
            {'id': 'netbanking', 'name': 'Net Banking',  'icon': '🏦'},
            {'id': 'credit_card','name': 'Credit Card',  'icon': '💳'},
            {'id': 'debit_card', 'name': 'Debit Card',   'icon': '💳'},
            {'id': 'cod',        'name': 'Cash on Delivery','icon': '💵'},
        ]
    })

# ===================================================================
# FARMER ROUTES
# ===================================================================

@app.route('/api/farmers', methods=['GET'])
def get_farmers():
    farmers = User.query.filter_by(role='farmer', is_active=True).all()
    return success([f.to_dict() for f in farmers])


@app.route('/api/farmers/<int:farmer_id>/products', methods=['GET'])
def get_farmer_products(farmer_id):
    products = Product.query.filter_by(farmer_id=farmer_id, is_active=True).all()
    return success([p.to_dict() for p in products])

# ===================================================================
# NEWSLETTER & CONTACT
# ===================================================================

@app.route('/api/newsletter', methods=['POST'])
def subscribe_newsletter():
    email = request.get_json().get('email', '').strip()
    if not validate_email(email):
        return error('Invalid email')

    existing = NewsletterSubscriber.query.filter_by(email=email).first()
    if existing:
        if not existing.subscribed:
            existing.subscribed = True
            db.session.commit()
        return success({'message': 'Already subscribed!'})

    sub = NewsletterSubscriber(email=email)
    db.session.add(sub)
    db.session.commit()
    return success({'message': 'Subscribed successfully!'}, 201)


@app.route('/api/contact', methods=['POST'])
def contact():
    data = request.get_json()
    msg = ContactMessage(
        name    = data.get('name'),
        email   = data.get('email'),
        subject = data.get('subject'),
        message = data.get('message'),
    )
    db.session.add(msg)
    db.session.commit()
    return success({'message': 'Message received! We\'ll reply within 24 hours.'}, 201)

# ===================================================================
# ADMIN ROUTES
# ===================================================================

def admin_required(f):
    @wraps(f)
    @jwt_required()
    def decorated(*args, **kwargs):
        claims = get_jwt()
        if claims.get('role') != 'admin':
            return error('Admin access required', 403)
        return f(*args, **kwargs)
    return decorated


@app.route('/api/admin/stats', methods=['GET'])
@admin_required
def admin_stats():
    return success({
        'users':    User.query.count(),
        'products': Product.query.filter_by(is_active=True).count(),
        'orders':   Order.query.count(),
        'revenue':  float(db.session.query(db.func.sum(Order.total_amount))
                        .filter(Order.payment_status=='success').scalar() or 0),
        'farmers':  User.query.filter_by(role='farmer').count(),
    })


@app.route('/api/admin/orders', methods=['GET'])
@admin_required
def admin_orders():
    status = request.args.get('status')
    query = Order.query
    if status:
        query = query.filter_by(status=status)
    orders = query.order_by(Order.created_at.desc()).limit(100).all()
    return success([o.to_dict() for o in orders])


@app.route('/api/admin/orders/<order_id>/status', methods=['PUT'])
@admin_required
def update_order_status(order_id):
    order = Order.query.get_or_404(order_id)
    status = request.get_json().get('status')
    valid = ('pending', 'processing', 'shipped', 'delivered', 'cancelled')
    if status not in valid:
        return error(f'Status must be one of {valid}')
    order.status = status
    db.session.commit()
    return success({'message': 'Order status updated', 'status': status})

# ===================================================================
# ERROR HANDLERS
# ===================================================================

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Resource not found'}), 404

@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({'error': 'Method not allowed'}), 405

@app.errorhandler(500)
def server_error(e):
    return jsonify({'error': 'Internal server error'}), 500

# ===================================================================
# DATABASE INIT & SEED
# ===================================================================

def seed_data():
    """Seed sample data if database is empty"""
    if User.query.count() > 0:
        return

    # Create admin
    admin = User(
        name='Farm2Home Admin',
        email='admin@farm2home.in',
        password=bcrypt.generate_password_hash('admin123').decode('utf-8'),
        role='admin',
        phone='9000000000',
    )
    db.session.add(admin)

    # Create sample farmers
    farmers_data = [
        {'name':'Ramu Patil','email':'ramu@farm.in','phone':'9876543210','village':'Yeola','district':'Nashik','state':'Maharashtra'},
        {'name':'Anita Shinde','email':'anita@farm.in','phone':'9876543211','village':'Kolhapur','district':'Kolhapur','state':'Maharashtra'},
        {'name':'Gopal Rao','email':'gopal@farm.in','phone':'9876543212','village':'Ratnagiri','district':'Ratnagiri','state':'Maharashtra'},
        {'name':'Harish Yadav','email':'harish@farm.in','phone':'9876543213','village':'Muzaffarnagar','district':'Muzaffarnagar','state':'UP'},
    ]

    farmer_objs = []
    for fd in farmers_data:
        farmer = User(
            name=fd['name'], email=fd['email'], phone=fd['phone'],
            password=bcrypt.generate_password_hash('farmer123').decode('utf-8'),
            role='farmer', village=fd['village'], district=fd['district'], state=fd['state']
        )
        db.session.add(farmer)
        farmer_objs.append(farmer)

    db.session.flush()  # Get IDs

    # Sample products
    products_data = [
        {'name':'Fresh Tomatoes','category':'vegetables','price':45,'old_price':60,'unit':'kg','emoji':'🍅','badge':'Fresh','rating':4.5,'review_count':128,'farmer_idx':0},
        {'name':'Organic Spinach','category':'vegetables','price':30,'old_price':40,'unit':'bunch','emoji':'🥬','badge':'Organic','rating':4.7,'review_count':89,'farmer_idx':1},
        {'name':'Alphonso Mango','category':'fruits','price':280,'old_price':350,'unit':'dozen','emoji':'🥭','badge':'Premium','rating':5.0,'review_count':256,'farmer_idx':2},
        {'name':'Basmati Rice','category':'grains','price':95,'old_price':120,'unit':'kg','emoji':'🌾','badge':'Premium','rating':4.9,'review_count':312,'farmer_idx':3},
        {'name':'Farm Fresh Milk','category':'dairy','price':55,'old_price':65,'unit':'litre','emoji':'🥛','badge':'Daily','rating':4.8,'review_count':234,'farmer_idx':0},
        {'name':'Red Chilli Powder','category':'spices','price':180,'old_price':230,'unit':'kg','emoji':'🌶️','badge':'Hot','rating':4.8,'review_count':321,'farmer_idx':1},
        {'name':'Pure Desi Ghee','category':'dairy','price':650,'old_price':800,'unit':'kg','emoji':'🧈','badge':'Premium','rating':4.9,'review_count':167,'farmer_idx':2},
        {'name':'Turmeric Powder','category':'spices','price':220,'old_price':280,'unit':'kg','emoji':'🟡','badge':'Pure','rating':4.9,'review_count':278,'farmer_idx':3},
    ]

    for pd_data in products_data:
        p = Product(
            name=pd_data['name'], category=pd_data['category'],
            price=pd_data['price'], old_price=pd_data['old_price'],
            unit=pd_data['unit'], emoji=pd_data['emoji'],
            badge=pd_data['badge'], rating=pd_data['rating'],
            review_count=pd_data['review_count'],
            farmer_id=farmer_objs[pd_data['farmer_idx']].id,
            stock_qty=200,
        )
        db.session.add(p)

    db.session.commit()
    print("✅ Sample data seeded successfully!")


# ===================================================================
# MAIN
# ===================================================================

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        seed_data()
        print("🌿 Farm2Home backend is running at http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)