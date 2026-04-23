'use strict';
const express = require('express');
const app = express();
app.use(express.json());

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
  res.status(200).json(homework);
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});