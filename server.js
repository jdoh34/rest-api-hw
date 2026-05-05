'use strict';

const express = require('express');
const path = require('path');
const app = express();

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database("homework.db", (err) => {
  if (err) {
    return console.error("Error opening database:", err.message);
  }
  console.log("Connected to the homework database.");
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      year TEXT,
      password TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      type TEXT NOT NULL,
      university TEXT NOT NULL,
      courseLevel TEXT NOT NULL,
      format TEXT NOT NULL,
      professorStyle TEXT NOT NULL,
      price REAL NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  // Seed initial products (only inserts if not already there)
  const insertProduct = `
    INSERT OR IGNORE INTO products
    (name, category, type, university, courseLevel, format, professorStyle, price)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const products = [
    ['Critical Reading Response', 'humanities', 'reading-response', 'San Francisco State University', 'lower-division', 'essay', 'analysis-heavy', 15],
    ['Research Summary', 'social-sciences', 'summary-paper', 'San Francisco State University', 'upper-division', 'written-report', 'source-based', 20],
    ['Lab Write-Up', 'natural-sciences', 'lab-report', 'San Francisco State University', 'lower-division', 'report', 'structured', 25],
    ['Problem Set', 'mathematics', 'worksheet', 'San Francisco State University', 'lower-division', 'problem-solving', 'show-your-work', 18],
    ['Case Study Reflection', 'business', 'reflection', 'San Francisco State University', 'upper-division', 'short-essay', 'application-based', 22],
    ['Design Draft', 'creative-arts', 'project-draft', 'San Francisco State University', 'upper-division', 'portfolio-piece', 'project-based', 30]
  ];

  products.forEach(product => {
    db.run(insertProduct, product);
  });
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Pug view engine setup
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

// ========== VIEW ROUTES ==========

app.get('/', (req, res) => {
  res.render('home', { title: 'Home' });
});

app.get('/products', (req, res) => {
  db.all('SELECT * FROM products', [], (err, products) => {
    if (err) {
      return res.status(500).send('Database error');
    }

    res.render('products', {
      title: 'All Products',
      products: products
    });
  });
});

app.get('/products/:identifier', (req, res) => {
  const identifier = req.params.identifier;

  db.get(
    'SELECT * FROM products WHERE LOWER(name) = LOWER(?)',
    [identifier],
    (err, product) => {
      if (err) {
        return res.status(500).send('Database error');
      }

      if (!product) {
        return res.status(404).render('404', {
          title: 'Not Found',
          identifier: identifier
        });
      }

      res.render('product-detail', {
        title: product.name,
        product: product
      });
    }
  );
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
  const { name, email, year, password } = req.body;

  db.run(
    'INSERT INTO users (name, email, year, password) VALUES (?, ?, ?, ?)',
    [name, email, year, password],
    function (err) {
      if (err) {
        return res.status(400).send('Could not create user. Email may already exist.');
      }

      res.redirect('/products?discount=applied');
    }
  );
});

app.get('/profile', (req, res) => {
  res.render('profile', { title: 'My Profile' });
});

app.get('/cart', (req, res) => {
  const query = `
    SELECT 
      cart_items.id,
      products.name,
      products.type,
      products.price,
      cart_items.quantity,
      products.price * cart_items.quantity AS subtotal
    FROM cart_items
    JOIN products ON cart_items.product_id = products.id
  `;

  db.all(query, [], (err, cartItems) => {
    if (err) {
      return res.status(500).send('Database error');
    }

    const total = cartItems.reduce((sum, item) => {
      return sum + item.subtotal;
    }, 0);

    res.render('cart', {
      title: 'Shopping Cart',
      cartItems: cartItems,
      total: total
    });
  });
});

app.post('/cart/add/:productId', (req, res) => {
  const productId = req.params.productId;

  db.run(
    'INSERT INTO cart_items (product_id, quantity) VALUES (?, ?)',
    [productId, 1],
    function (err) {
      if (err) {
        return res.status(500).send('Could not add item to cart');
      }

      res.redirect('/cart');
    }
  );
});

// ========== API ROUTES ==========

app.head('/', (req, res) => {
  db.get('SELECT COUNT(*) as count FROM products', [], (err, row) => {
    if (err) {
      return res.sendStatus(500);
    }

    res.set('X-Homework-Count', String(row.count));
    res.sendStatus(200);
  });
});

app.get('/api/homework', (req, res) => {
  db.all('SELECT * FROM products', [], (err, products) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.status(200).json(products);
  });
});

app.get('/api/homework/:title', (req, res) => {
  db.get(
    'SELECT * FROM products WHERE LOWER(name) = LOWER(?)',
    [req.params.title],
    (err, product) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!product) {
        return res.status(404).json({ error: 'not found' });
      }

      res.status(200).json(product);
    }
  );
});
app.post('/add', (req, res) => {
  const newHomework = req.body;

  if (
    !newHomework.name ||
    !newHomework.category ||
    !newHomework.type ||
    !newHomework.courseLevel ||
    !newHomework.format ||
    !newHomework.professorStyle ||
    newHomework.price === undefined
  ) {
    return res.status(400).json({
      error: 'Missing required fields. Need: name, category, type, courseLevel, format, professorStyle, price'
    });
  }

  const homeworkToAdd = {
    name: String(newHomework.name).trim(),
    category: String(newHomework.category).toLowerCase().trim(),
    type: String(newHomework.type).toLowerCase().trim(),
    university: 'San Francisco State University',
    courseLevel: String(newHomework.courseLevel).toLowerCase().trim(),
    format: String(newHomework.format).toLowerCase().trim(),
    professorStyle: String(newHomework.professorStyle).toLowerCase().trim(),
    price: Number(newHomework.price)
  };

  if (
    !homeworkToAdd.name ||
    !homeworkToAdd.category ||
    !homeworkToAdd.type ||
    !homeworkToAdd.courseLevel ||
    !homeworkToAdd.format ||
    !homeworkToAdd.professorStyle ||
    !homeworkToAdd.price ||
    homeworkToAdd.price <= 0
  ) {
    return res.status(400).json({
      error: 'Invalid data. Text fields must be non-empty, and price must be a positive number.'
    });
  }

  db.run(
    `
    INSERT INTO products
    (name, category, type, university, courseLevel, format, professorStyle, price)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      homeworkToAdd.name,
      homeworkToAdd.category,
      homeworkToAdd.type,
      homeworkToAdd.university,
      homeworkToAdd.courseLevel,
      homeworkToAdd.format,
      homeworkToAdd.professorStyle,
      homeworkToAdd.price
    ],
    function (err) {
      if (err) {
        return res.status(409).json({
          error: `Homework '${homeworkToAdd.name}' already exists or database error`
        });
      }

      res.status(201).json({
        id: this.lastID,
        ...homeworkToAdd
      });
    }
  );
});

app.delete('/api/homework/:title', (req, res) => {
  const title = req.params.title.trim();

  db.run(
    'DELETE FROM products WHERE LOWER(name) = LOWER(?)',
    [title],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (this.changes === 0) {
        return res.status(404).json({
          error: `Homework '${title}' not found`
        });
      }

      res.status(204).send();
    }
  );
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});