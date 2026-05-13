const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database("homework.db", (err) => {
    if (err) {
        return console.error("Error opening database:", err.message);
    }
    console.log("Connected to the homework database.");
});

function db_setup() {

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

        const insertProduct = `
        INSERT OR IGNORE INTO products
        (name, category, type, courseLevel, format, professorStyle, price)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const products = [
            ['Critical Reading Response', 'humanities', 'reading response', 'lower-division', 'essay', 'analysis heavy', 15],
            ['Research Summary', 'social sciences', 'summary paper', 'upper-division', 'written report', 'source based', 20],
            ['Lab Write-Up', 'natural sciences', 'lab report', 'lower-division', 'report', 'structured', 25],
            ['Problem Set', 'mathematics', 'worksheet', 'lower-division', 'problem solving', 'show your work', 18],
            ['Case Study Reflection', 'business', 'reflection', 'upper-division', 'short essay', 'application based', 22],
            ['Design Draft', 'creative arts', 'project draft', 'upper-division', 'portfolio piece', 'project based', 30],
            ['Web Development Project', 'computer science', 'coding project', 'upper-division', 'source code', 'project based', 45],
            ['Psychology Case Study', 'social sciences', 'case study', 'upper-division', 'written report', 'research based', 28],
            ['Marketing Campaign Plan', 'business', 'strategic plan', 'upper-division', 'written report', 'application based', 32],
            ['Research Poster', 'natural sciences', 'poster project', 'upper-division', 'poster', 'visual presentation', 40],
            ['Infographic Poster', 'social sciences', 'poster project', 'lower-division', 'poster', 'visual communication', 28],
            ['Philosophy Argumentative Essay', 'humanities', 'argumentative essay', 'upper-division', 'essay', 'thesis driven', 25]
        ];

        products.forEach(product => {
            db.run(insertProduct, product);
        });
    });
}

module.exports = { db, db_setup };