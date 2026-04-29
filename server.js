'use strict';
const express = require('express');
const path = require('path');
const app = express();
app.use(express.json());
// Pug view engine setup
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

// In-memory state
/** @type {{subject:string, type:string, duration:number}[]} */
const homework = [
  { name: 'math',   type: 'worksheet', duration: 30},
  { name: 'history', type: 'essay', duration: 120},
  { name: 'science', type: 'lab-report', duration: 60}
];
function normalizeTitle(title) {
  return String(title || '').toLowerCase().trim();
}

function findIndexByTitle(title) {
  const normalized = normalizeTitle(title);
  return homework.findIndex(h =>  h.name === normalized);
}

app.get('/', (req, res) => {
  const homework = [
    { name: 'math', type: 'worksheet', duration: 30 },
    { name: 'history', type: 'essay', duration: 120 },
    { name: 'science', type: 'lab-report', duration: 60 }
  ];
  res.status(200).render('products', { products: homework });
});


app.head('/', (req, res) => {
  res.set('X-Homework-Count', String(homework.length));
  res.sendStatus(200);
});

app.get('/:title', (req, res) => {
  const idx = findIndexByTitle(req.params.title);
  if (idx === -1) {
    return res.status(404).json({ error: 'not found' });
  }
  res.status(200).json(homework[idx]);
});

function isValidHomework(item) {
    return item.name && 
           typeof item.name === 'string' &&
           item.name.trim() !== '' &&
           item.type && 
           typeof item.type === 'string' &&
           item.type.trim() !== '' &&
           item.duration && 
           typeof item.duration === 'number' &&
           item.duration > 0;
}

app.post('/add', (req, res) => {
    const newHomework = req.body;
    
    if (!newHomework.name || !newHomework.type || newHomework.duration === undefined) {
        return res.status(400).json({ 
            error: 'Missing required fields. Need: name (string), type (string), duration (number)' 
        });
    }
    
    if (!isValidHomework(newHomework)) {
        return res.status(400).json({ 
            error: 'Invalid data. name and type must be non-empty strings, duration must be a positive number' 
        });
    }
    
    const normalizedName = normalizeTitle(newHomework.name);
    const exists = homework.some(item => normalizeTitle(item.name) === normalizedName);
    
    if (exists) {
        return res.status(409).json({ 
            error: `Homework '${newHomework.name}' already exists` 
        });
    }
    
    const homeworkToAdd = {
        name: normalizedName,
        type: newHomework.type.toLowerCase().trim(),
        duration: newHomework.duration
    };
    
    homework.push(homeworkToAdd);
    res.status(201).json(homeworkToAdd);
});

app.delete('/:title', (req, res) => {
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

// ========== VIEW ROUTES ==========

app.get('/home', (req, res) => {
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
    const product = homework.find(item => normalizeTitle(item.name) === normalizedIdentifier);
    
    if (!product) {
        return res.render('404', { 
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
    res.redirect('/home');
});

app.get('/profile', (req, res) => {
    res.render('profile', { title: 'My Profile' });
});

app.get('/cart', (req, res) => {
    res.render('cart', { title: 'Shopping Cart' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});