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
  res.render('login', { title: 'Login' });
});

app.post('/login', (req, res) => {
  res.redirect('/');
});

app.get('/signup', (req, res) => {
  res.render('signup', { title: 'Sign Up' });
});

app.post('/signup', (req, res) => {
  res.redirect('/products?discount=applied');
});

app.get('/profile', (req, res) => {
  res.render('profile', { title: 'My Profile' });
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

app.post('/cart/checkout', (req, res) => {
  const cart = getCart(req);

  req.session.lastOrder = [...cart];
  req.session.cart = [];

  res.redirect('/cart?confirmed=true');
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