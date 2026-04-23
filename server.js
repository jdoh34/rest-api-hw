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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});