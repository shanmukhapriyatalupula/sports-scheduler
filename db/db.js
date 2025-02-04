require('dotenv').config(); // Load .env variables

const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,          // Loaded from .env
    host: process.env.DB_HOST,          // Loaded from .env
    database: process.env.DB_NAME,      // Loaded from .env
    password: process.env.DB_PASSWORD,  // Loaded from .env
    port: process.env.DB_PORT,          // Loaded from .env
});

pool.connect((err) => {
    if (err) {
        console.error('Error connecting to PostgreSQL:', err.stack);
    } else {
        console.log('Connected to PostgreSQL database:', process.env.DB_NAME);
    }
});

module.exports = pool;
