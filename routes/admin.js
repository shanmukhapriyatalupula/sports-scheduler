const express = require('express');
const router = express.Router();
const db = require('../db/db');  // Database connection
const bcrypt = require('bcryptjs');
const session = require('express-session');

// Configure express-session
router.use(
    session({
        secret: 'a76544206680d1d0eb5d90eb9b8d016a430a6f60af8fcb5372ebc3f967d0a26a', // Replace with a strong secret key
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false }, // Use secure: true for HTTPS
    })
);

// Middleware to check authentication
function isAuthenticated(req, res, next) {
    if (req.session && req.session.adminId) {
        return next();
    } else {
        res.redirect('/auth/admin-login-page');
    }
}

// Admin Dashboard - Show all sports and success message if needed
router.get('/admin-dashboard', isAuthenticated, async (req, res) => {
    try {
        const sportsResult = await db.query('SELECT * FROM sports');
        const successMessage = req.query.update === 'success' ? 'Sport updated successfully!' : null;

        res.render('admin-dashboard', {
            sports: sportsResult.rows,
            username: req.session.username,
            successMessage: successMessage, // Pass the success message
        });
    } catch (err) {
        console.error('Error fetching sports:', err);
        res.status(500).send('Error fetching sports');
    }
});

// Add Sport - Show the form to add a new sport
router.get('/admin-dashboard/add-sport', isAuthenticated, (req, res) => {
    res.render('add-sport');
});

// Add Sport - Handle form submission to add a new sport
router.post('/admin-dashboard/add-sport', isAuthenticated, async (req, res) => {
    const { name, place, date, timings, description } = req.body;
    try {
        await db.query(
            'INSERT INTO sports (name, place, date, timings, description) VALUES ($1, $2, $3, $4, $5)', 
            [name, place, date, timings, description]
        );
        res.redirect('/auth/admin-dashboard?update=success');
    } catch (err) {
        console.error('Error adding sport:', err);
        res.status(500).send('Error adding sport');
    }
});

// Update Sport - Show the form to update a sport
router.get('/admin-dashboard/update-sport/:sportId', isAuthenticated, async (req, res) => {
    const { sportId } = req.params; // Get the sport ID from the query parameters
    try {
        const sportResult = await db.query('SELECT * FROM sports WHERE sport_id = $1', [sportId]);
        if (sportResult.rows.length === 0) {
            return res.status(404).send('Sport not found');
        }
        res.render('update-sport', { sport: sportResult.rows[0] }); // Pass the sport data to the template
    } catch (err) {
        console.error('Error fetching sport:', err);
        res.status(500).send('Error fetching sport');
    }
});
// Update Sport - Handle form submission to update a sport
router.post('/admin-dashboard/update-sport', isAuthenticated, async (req, res) => {
    const { sportId, name, place, date, timings, description } = req.body;
    try {
        await db.query(
            'UPDATE sports SET name = $1, place = $2, date = $3, timings = $4, description = $5 WHERE sport_id = $6', 
            [name, place, date, timings, description, sportId]
        );
        res.redirect('/auth/admin-dashboard?update=success');
    } catch (err) {
        console.error('Error updating sport:', err);
        res.status(500).send('Error updating sport');
    }
});
router.get('/auth/admin-dashboard/delete-sport/:sportId', async (req, res) => {
    const { sportId } = req.params;
    try {
        const sportResult = await db.query('SELECT * FROM sports WHERE sport_id = $1', [sportId]);
        if (sportResult.rows.length === 0) {
            return res.status(404).send('Sport not found');
        }
        res.render('delete-sport', { sport: sportResult.rows[0] });
    } catch (err) {
        console.error('Error fetching sport for deletion:', err);
        res.status(500).send('Error fetching sport for deletion');
    }
});

// Admin Signup
router.post('/signup', async (req, res) => {
    const { username, password } = req.body;

    try {
        const userCheck = await db.query('SELECT * FROM admins WHERE username = $1', [username]);

        if (userCheck.rows.length > 0) {
            return res.status(400).send('Username already exists. Please choose a different one.');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query('INSERT INTO admins (username, password) VALUES ($1, $2)', [username, hashedPassword]);
        res.redirect('/auth/admin-login-page');
    } catch (err) {
        console.error('Error during admin signup:', err);
        res.status(500).send('Error during admin signup');
    }
});

// Admin Login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await db.query('SELECT * FROM admins WHERE username = $1', [username]);

        if (result.rows.length === 0) {
            return res.status(400).send('Admin not found');
        }

        const admin = result.rows[0];
        const isMatch = await bcrypt.compare(password, admin.password);

        if (!isMatch) {
            return res.status(400).send('Incorrect password');
        }

        req.session.adminId = admin.id;
        req.session.username = admin.username;
        res.redirect('/auth/admin-dashboard');
    } catch (err) {
        console.error('Error during admin login:', err);
        res.status(500).send('Error during admin login');
    }
});

// Admin Logout
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error during logout:', err);
            return res.status(500).send('Error during logout');
        }
        res.redirect('/auth/admin-login-page');
    });
});

module.exports = router;
