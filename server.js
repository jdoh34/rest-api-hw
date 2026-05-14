'use strict';

const express = require('express');
const path = require('path');
const session = require('express-session');
const { db, db_setup } = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3000;

db_setup();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'gator-assignment-aid-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

function normalizeTitle(title) {
  return String(title || '').toLowerCase().trim();
}

function getCart(req) {
  if (!req.session.cart) req.session.cart = [];
  return req.session.cart;
}

function getAllProducts(callback) {
  db.all('SELECT * FROM products ORDER BY id', [], callback);
}

function getProductByName(name, callback) {
  db.get(
    'SELECT * FROM products WHERE LOWER(name) = LOWER(?)',
    [name],
    callback
  );
}

// ===== ROUTES =====

app.get('/', (req, res) => {
  res.render('home', { title: 'Home' });
});

app.get('/home', (req, res) => {
  res.render('home', { title: 'Home' });
});

app.get('/products', (req, res) => {
  getAllProducts((err, products) => {
    if (err) return res.status(500).send('Database error');
    res.render('products', { title: 'All Products', products });
  });
});

app.get('/products/:identifier', (req, res) => {
  getProductByName(req.params.identifier, (err, product) => {
    if (err) return res.status(500).send('Database error');

    if (!product) {
      return res.status(404).render('404', {
        title: 'Not Found',
        identifier: req.params.identifier
      });
    }

    res.render('product-detail', {
      title: product.name,
      product
    });
  });
});

app.get('/login', (req, res) => {
  res.render('login', { title: 'Login', error: null });
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;

  db.get(
    'SELECT * FROM users WHERE email = ? AND password = ?',
    [email, password],
    (err, user) => {
      if (err) return res.status(500).send('Database error');

      if (!user) {
        return res.status(401).render('login', {
          title: 'Login',
          error: 'Invalid email or password.'
        });
      }

      req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        year: user.year
      };

      res.redirect('/profile');
    }
  );
});

app.get('/signup', (req, res) => {
  res.render('signup', { title: 'Sign Up', error: null });
});

app.post('/signup', (req, res) => {
  const { name, email, year, password } = req.body;

  db.run(
    'INSERT INTO users (name, email, year, password) VALUES (?, ?, ?, ?)',
    [name, email, year, password],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(409).render('signup', {
            title: 'Sign Up',
            error: 'That email is already registered.'
          });
        }
        return res.status(500).send('Database error');
      }

      req.session.user = {
        id: this.lastID,
        name,
        email,
        year
      };

      res.redirect('/profile');
    }
  );
});

app.get('/profile', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  res.render('profile', {
    title: 'My Profile',
    user: req.session.user
  });
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// ===== CART =====

app.get('/cart', (req, res) => {
  const cart = getCart(req);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  res.render('cart', {
    title: 'Shopping Cart',
    cartItems: cart,
    total: total.toFixed(2)
  });
});

app.post('/cart/add', (req, res) => {
  const { name, price } = req.body;
  const cart = getCart(req);

  if (!name || !price) {
    return res.status(400).send('Missing product info');
  }

  const existing = cart.find(
    item => normalizeTitle(item.name) === normalizeTitle(name)
  );

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      name: String(name),
      price: parseFloat(price),
      quantity: 1
    });
  }

  res.redirect('/cart');
});

app.post('/cart/remove', (req, res) => {
  const { name } = req.body;
  const cart = getCart(req);

  req.session.cart = cart.filter(
    item => normalizeTitle(item.name) !== normalizeTitle(name)
  );

  res.redirect('/cart');
});

app.get('/checkout', (req, res) => {
  const cart = getCart(req);

  if (cart.length === 0) {
    return res.redirect('/cart');
  }

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  res.render('checkout', {
    title: 'Confirm Checkout',
    cartItems: cart,
    total: total.toFixed(2)
  });
});

app.post('/checkout/confirm', (req, res) => {
  const cart = getCart(req);

  if (cart.length === 0) {
    return res.redirect('/cart');
  }

  req.session.lastOrder = [...cart];
  req.session.cart = [];

  res.redirect('/checkout/success');
});

app.get('/checkout/success', (req, res) => {
  const lastOrder = req.session.lastOrder || [];

  if (lastOrder.length === 0) {
    return res.redirect('/products');
  }

  const total = lastOrder.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  res.render('checkout-success', {
    title: 'Order Confirmed',
    orderItems: lastOrder,
    total: total.toFixed(2)
  });
});

// ===== API =====

app.get('/api/homework', (req, res) => {
  getAllProducts((err, products) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(products);
  });
});

app.get('/api/homework/:title', (req, res) => {
  getProductByName(req.params.title, (err, product) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!product) return res.status(404).json({ error: 'not found' });

    res.json(product);
  });
});

app.post('/add', (req, res) => {
  const item = req.body;

  if (
    !item.name ||
    !item.category ||
    !item.type ||
    !item.courseLevel ||
    !item.format ||
    !item.professorStyle ||
    item.price === undefined
  ) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const insertProduct = `
    INSERT INTO products
    (name, category, type, courseLevel, format, professorStyle, price)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    String(item.name).trim(),
    String(item.category).toLowerCase().trim(),
    String(item.type).toLowerCase().trim(),
    String(item.courseLevel).toLowerCase().trim(),
    String(item.format).toLowerCase().trim(),
    String(item.professorStyle).toLowerCase().trim(),
    Number(item.price)
  ];

  db.run(insertProduct, values, function (err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(409).json({ error: 'Already exists' });
      }

      return res.status(500).json({ error: 'Database error' });
    }

    res.status(201).json({
      id: this.lastID,
      name: values[0],
      category: values[1],
      type: values[2],
      courseLevel: values[3],
      format: values[4],
      professorStyle: values[5],
      price: values[6]
    });
  });
});

app.delete('/api/homework/:title', (req, res) => {
  db.run(
    'DELETE FROM products WHERE LOWER(name) = LOWER(?)',
    [req.params.title],
    function (err) {
      if (err) return res.status(500).json({ error: 'Database error' });

      if (this.changes === 0) {
        return res.status(404).json({
          error: `Homework '${req.params.title}' not found`
        });
      }

      res.status(204).send();
    }
  );
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});