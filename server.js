'use strict';

const express = require('express');
const path = require('path');
const session = require('express-session');
const app = express();

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

const PORT = process.env.PORT || 3000;

const homework = [
  {
    name: 'Critical Reading Response',
    category: 'Humanities',
    type: 'Reading Response',
    courseLevel: 'Lower Division',
    format: 'Essay',
    professorStyle: 'Analysis Heavy',
    price: 15
  },
  {
    name: 'Research Summary',
    category: 'Social Sciences',
    type: 'Summary Paper',
    courseLevel: 'Upper Division',
    format: 'Written Report',
    professorStyle: 'Source Based',
    price: 20
  },
  {
    name: 'Lab Write-Up',
    category: 'Natural Sciences',
    type: 'Lab Report',
    courseLevel: 'Lower Division',
    format: 'Report',
    professorStyle: 'Structured',
    price: 25
  },
  {
    name: 'Problem Set',
    category: 'Mathematics',
    type: 'Worksheet',
    courseLevel: 'Lower Division',
    format: 'Problem Solving',
    professorStyle: 'Show Your Work',
    price: 18
  },
  {
    name: 'Case Study Reflection',
    category: 'Business',
    type: 'Reflection',
    courseLevel: 'Upper Division',
    format: 'Short Essay',
    professorStyle: 'Application Based',
    price: 22
  },
  {
    name: 'Design Draft',
    category: 'Creative Arts',
    type: 'Project Draft',
    courseLevel: 'Upper Division',
    format: 'Portfolio Piece',
    professorStyle: 'Project Based',
    price: 30
  },
  {
    name: 'Web Development Project',
    category: 'Computer Science',
    type: 'Coding Project',
    courseLevel: 'Upper Division',
    format: 'Source Code',
    professorStyle: 'Project Based',
    price: 45
  },
  {
    name: 'Psychology Case Study',
    category: 'Social Sciences',
    type: 'Case Study',
    courseLevel: 'Upper Division',
    format: 'Written Report',
    professorStyle: 'Research Based',
    price: 28
  },
  {
    name: 'Marketing Campaign Plan',
    category: 'Business',
    type: 'Strategic Plan',
    courseLevel: 'Upper Division',
    format: 'Written Report',
    professorStyle: 'Application Based',
    price: 32
  },
  {
    name: 'Research Poster',
    category: 'Natural Sciences',
    type: 'Poster Project',
    courseLevel: 'Upper Division',
    format: 'Poster',
    professorStyle: 'Visual Presentation',
    price: 40
  },
  {
    name: 'Infographic Poster',
    category: 'Social Sciences',
    type: 'Poster Project',
    courseLevel: 'Lower Division',
    format: 'Poster',
    professorStyle: 'Visual Communication',
    price: 28
  },
  {
    name: 'Philosophy Argumentative Essay',
    category: 'Humanities',
    type: 'Argumentative Essay',
    courseLevel: 'Upper Division',
    format: 'Essay',
    professorStyle: 'Thesis Driven',
    price: 25
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
    item.name && typeof item.name === 'string' && item.name.trim() !== '' &&
    item.category && typeof item.category === 'string' && item.category.trim() !== '' &&
    item.type && typeof item.type === 'string' && item.type.trim() !== '' &&
    item.university && item.university === 'San Francisco State University' &&
    item.courseLevel && typeof item.courseLevel === 'string' && item.courseLevel.trim() !== '' &&
    item.format && typeof item.format === 'string' && item.format.trim() !== '' &&
    item.professorStyle && typeof item.professorStyle === 'string' && item.professorStyle.trim() !== '' &&
    item.price !== undefined && typeof item.price === 'number' && item.price > 0
  );
}

function getCart(req) {
  if (!req.session.cart) req.session.cart = [];
  return req.session.cart;
}

// ========== VIEW ROUTES ==========

app.get('/', (req, res) => {
  res.render('home', { title: 'Home' });
});

app.get('/products', (req, res) => {
  res.render('products', { title: 'All Products', products: homework });
});

app.get('/products/:identifier', (req, res) => {
  const identifier = req.params.identifier;
  const product = homework.find(
    item => normalizeTitle(item.name) === normalizeTitle(identifier)
  );
  if (!product) {
    return res.status(404).render('404', { title: 'Not Found', identifier });
  }
  res.render('product-detail', { title: product.name, product });
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

app.get('/home', (req, res) => {
  res.render('home', { title: 'Home' });
});

// ========== CART ROUTES ==========

app.get('/cart', (req, res) => {
  const cart = getCart(req);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const confirmed = req.query.confirmed === 'true';
  const lastOrder = req.session.lastOrder || null;
  if (confirmed) req.session.lastOrder = null;
  res.render('cart', {
    title: 'Shopping Cart',
    cartItems: cart,
    total: total.toFixed(2),
    confirmed,
    lastOrder
  });
});

app.post('/cart/add', (req, res) => {
  const { name, price } = req.body;
  const cart = getCart(req);
  if (!name || !price) return res.status(400).send('Missing product info');
  const existing = cart.find(item => normalizeTitle(item.name) === normalizeTitle(name));
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ name: String(name), price: parseFloat(price), quantity: 1 });
  }
  res.redirect('/cart');
});

app.post('/cart/remove', (req, res) => {
  const { name } = req.body;
  const cart = getCart(req);
  req.session.cart = cart.filter(item => normalizeTitle(item.name) !== normalizeTitle(name));
  res.redirect('/cart');
});

app.post('/cart/checkout', (req, res) => {
  const cart = getCart(req);
  req.session.lastOrder = [...cart];
  req.session.cart = [];
  res.redirect('/cart?confirmed=true');
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
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  res.status(200).json(homework[idx]);
});

app.post('/add', (req, res) => {
  const newHomework = req.body;
  if (!newHomework.name || !newHomework.category || !newHomework.type ||
      !newHomework.courseLevel || !newHomework.format || !newHomework.professorStyle ||
      newHomework.price === undefined) {
    return res.status(400).json({ error: 'Missing required fields.' });
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
    return res.status(400).json({ error: 'Invalid data.' });
  }
  const exists = homework.some(item => normalizeTitle(item.name) === normalizeTitle(homeworkToAdd.name));
  if (exists) {
    return res.status(409).json({ error: `Homework '${homeworkToAdd.name}' already exists` });
  }
  homework.push(homeworkToAdd);
  res.status(201).json(homeworkToAdd);
});

app.delete('/api/homework/:title', (req, res) => {
  const index = findIndexByTitle(req.params.title);
  if (index === -1) {
    return res.status(404).json({ error: `Homework '${req.params.title}' not found` });
  }
  homework.splice(index, 1);
  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
