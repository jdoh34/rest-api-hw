'use strict';

const express = require('express');
const path = require('path');
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Pug view engine setup
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

// In-memory state
const homework = [
  {
    name: 'Critical Reading Response',
    category: 'humanities',
    type: 'reading-response',
    university: 'San Francisco State University',
    courseLevel: 'lower-division',
    format: 'essay',
    professorStyle: 'analysis-heavy',
    price: 15
  },
  {
    name: 'Research Summary',
    category: 'social-sciences',
    type: 'summary-paper',
    university: 'San Francisco State University',
    courseLevel: 'upper-division',
    format: 'written-report',
    professorStyle: 'source-based',
    price: 20
  },
  {
    name: 'Lab Write-Up',
    category: 'natural-sciences',
    type: 'lab-report',
    university: 'San Francisco State University',
    courseLevel: 'lower-division',
    format: 'report',
    professorStyle: 'structured',
    price: 25
  },
  {
    name: 'Problem Set',
    category: 'mathematics',
    type: 'worksheet',
    university: 'San Francisco State University',
    courseLevel: 'lower-division',
    format: 'problem-solving',
    professorStyle: 'show-your-work',
    price: 18
  },
  {
    name: 'Case Study Reflection',
    category: 'business',
    type: 'reflection',
    university: 'San Francisco State University',
    courseLevel: 'upper-division',
    format: 'short-essay',
    professorStyle: 'application-based',
    price: 22
  },
  {
    name: 'Design Draft',
    category: 'creative-arts',
    type: 'project-draft',
    university: 'San Francisco State University',
    courseLevel: 'upper-division',
    format: 'portfolio-piece',
    professorStyle: 'project-based',
    price: 30
  }
];

function normalizeTitle(title) {
  return String(title || '').toLowerCase().trim();
}

function findIndexByTitle(title) {
  const normalized = normalizeTitle(title);
  return homework.findIndex(h => normalizeTitle(h.name) === normalized);
}

function isValidHomework(item) {
  return (
    item.name &&
    typeof item.name === 'string' &&
    item.name.trim() !== '' &&
    item.category &&
    typeof item.category === 'string' &&
    item.category.trim() !== '' &&
    item.type &&
    typeof item.type === 'string' &&
    item.type.trim() !== '' &&
    item.university &&
    item.university === 'San Francisco State University' &&
    item.courseLevel &&
    typeof item.courseLevel === 'string' &&
    item.courseLevel.trim() !== '' &&
    item.format &&
    typeof item.format === 'string' &&
    item.format.trim() !== '' &&
    item.professorStyle &&
    typeof item.professorStyle === 'string' &&
    item.professorStyle.trim() !== '' &&
    item.price !== undefined &&
    typeof item.price === 'number' &&
    item.price > 0
  );
}

// ========== VIEW ROUTES ==========

app.get('/', (req, res) => {
  res.render('home', { title: 'Home' });
});

app.get('/products', (req, res) => {
  res.render('products', {
    title: 'All Products',
    products: homework
  });
});

app.get('/products/:identifier', (req, res) => {
  const identifier = req.params.identifier;
  const normalizedIdentifier = normalizeTitle(identifier);

  const product = homework.find(
    item => normalizeTitle(item.name) === normalizedIdentifier
  );

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

app.get('/cart', (req, res) => {
  res.render('cart', { title: 'Shopping Cart' });
});

app.get('/home', (req, res) => {
  res.render('home', { title: 'Home' });
});

// ========== API ROUTES ==========

app.head('/', (req, res) => {
  res.set('X-Homework-Count', String(homework.length));
  res.sendStatus(200);
});

app.get('/api/homework', (req, res) => {
  res.status(200).json(homework);
});

app.get('/api/homework/:title', (req, res) => {
  const idx = findIndexByTitle(req.params.title);

  if (idx === -1) {
    return res.status(404).json({ error: 'not found' });
  }

  res.status(200).json(homework[idx]);
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

  if (!isValidHomework(homeworkToAdd)) {
    return res.status(400).json({
      error: 'Invalid data. university must be San Francisco State University, text fields must be non-empty, and price must be a positive number'
    });
  }

  const normalizedName = normalizeTitle(homeworkToAdd.name);
  const exists = homework.some(item => normalizeTitle(item.name) === normalizedName);

  if (exists) {
    return res.status(409).json({
      error: `Homework '${homeworkToAdd.name}' already exists`
    });
  }

  homework.push(homeworkToAdd);
  res.status(201).json(homeworkToAdd);
});

app.delete('/api/homework/:title', (req, res) => {
  const title = req.params.title;
  const index = findIndexByTitle(title);

  if (index === -1) {
    return res.status(404).json({
      error: `Homework '${title}' not found`
    });
  }

  homework.splice(index, 1);
  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
// ========== DATABASE SETUP ==========
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./ecommerce.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    price REAL NOT NULL CHECK(price > 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
    brand TEXT NOT NULL,
    size REAL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK(quantity >= 1),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE(user_id, product_id)
  )`);
});

db.run(`INSERT OR IGNORE INTO products (name, price, stock, brand, size) VALUES 
  ('air-max-90', 129.99, 10, 'nike', 10.0),
  ('ultraboost-22', 179.99, 5, 'adidas', 9.5),
  ('classic-leather', 89.99, 15, 'reebok', 11.0)
`);
