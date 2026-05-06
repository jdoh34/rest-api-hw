'use strict';

const express = require('express');
const path = require('path');
const app = express();

const {db, db_setup} = require('./database/db')

const sqlite3 = require('sqlite3').verbose();


db_setup()

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
  db.all('SELECT * FROM products', [], (err, nina) => {
    if (err) {
      return res.status(500).send('Database error');
    }
    console.log(nina)
    res.render('products', {
      title: 'All Products',
      products: nina
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