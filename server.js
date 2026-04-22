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




