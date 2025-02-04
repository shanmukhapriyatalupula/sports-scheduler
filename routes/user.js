const express = require('express');
const router = express.Router();
const db = require('../db/db');
const bcrypt = require('bcryptjs');
const session = require('express-session');

// Configure express-session
router.use(
    session({
        secret: 'a76544206680d1d0eb5d90eb9b8d016a430a6f60af8fcb5372ebc3f967d0a26a', // Replace with a strong secret key
        resave: false,
        saveUninitialized: true,
        cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true }, // Use secure: true in production with HTTPS
    })
);

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    } else {
        res.redirect('/login');
    }
}

// User Dashboard - Show all sports and success message if needed
router.get('/user-dashboard', isAuthenticated, async (req, res) => {
    try {
        const sportsResult = await db.query('SELECT * FROM sports');
        const sessionResult = await db.query(
            `SELECT sessions.session_time, sessions.location, sessions.venue, sessions.status, sports.name AS sport_name 
             FROM sessions 
             JOIN sports ON sessions.sport_id = sports.sport_id 
             WHERE sessions.user_id = $1 
             ORDER BY sessions.session_time DESC LIMIT 1`,
            [req.session.userId]
        );

        res.render('user-dashboard', {
            sports: sportsResult.rows,
            username: req.session.username,
            successMessage: req.query.update === 'success' ? 'Action completed successfully!' : null,
            sessionDetails: sessionResult.rows[0] || null,
        });
    } catch (err) {
        console.error('Error fetching dashboard data:', err);
        res.status(500).send('Error fetching dashboard data');
    }
});

router.post('/user-dashboard/book-session', isAuthenticated, async (req, res) => {
    const { sportId, location, venue, status } = req.body;

    // Validate sportId
    if (!sportId || isNaN(sportId) || sportId <= 0) {
        return res.status(400).send('Invalid sport ID');
    }

    try {
        // Ensure the sport exists
        const sport = await db.query('SELECT * FROM sports WHERE sport_id = $1', [sportId]);
        if (sport.rows.length === 0) {
            return res.status(400).send('Sport not found');
        }

        // Insert the new session
        const newSession = await db.query(
            'INSERT INTO sessions (user_id, sport_id, session_time, location, venue, status) VALUES ($1, $2, NOW(), $3, $4, $5) RETURNING *',
            [req.session.userId, sportId, location, venue, status] // Ensure req.session.userId is correct here
        );

        res.redirect('/api/user/user-dashboard'); // Reload the dashboard to show the booked session
    } catch (err) {
        console.error('Error booking session:', err);
        res.status(500).send('Error booking session');
    }
});



// User Signup
router.post('/signup', async (req, res) => {
    const { username, password, role } = req.body;

    try {
        const userCheck = await db.query('SELECT * FROM users WHERE username = $1', [username]);

        if (userCheck.rows.length > 0) {
            return res.status(400).send('Username already exists. Please choose a different one.');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query('INSERT INTO users (username, password, role) VALUES ($1, $2, $3)', [username, hashedPassword, role]);

        res.redirect('/login');
    } catch (err) {
        console.error('Error during user signup:', err);
        res.status(500).send('Error during user signup');
    }
});

// User Login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);

        if (result.rows.length === 0) {
            return res.status(400).send('User not found');
        }

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).send('Incorrect password');
        }

        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.role = user.role;

        res.redirect('/api/user/user-dashboard');
    } catch (err) {
        console.error('Error during user login:', err);
        res.status(500).send('Error during user login');
    }
});

// User Logout
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error during logout:', err);
            return res.status(500).send('Error during logout');
        }
        res.redirect('/login');
    });
});

// View available sports
router.get('/user-dashboard', isAuthenticated, async (req, res) => {
    try {
        console.log("Fetching sports and session details...");

        const sportsResult = await db.query('SELECT * FROM sports');
        console.log("Sports retrieved:", sportsResult.rows);

        const sessionResult = await db.query(
            `SELECT sports.name AS sport_name, 
                    sessions.venue AS place, 
                    TO_CHAR(sessions.session_time, 'DD-MM-YYYY') AS date,
                    TO_CHAR(sessions.session_time, 'HH24:MI') AS timings,
                    sessions.description AS sport_description
             FROM sessions 
             JOIN sports ON sessions.sport_id = sports.sport_id 
             WHERE sessions.user_id = $1 
             ORDER BY sessions.session_time DESC LIMIT 1`,
            [req.session.userId]
        );

        console.log("Session details retrieved:", sessionResult.rows);

        res.render('user-dashboard', {
            sports: sportsResult.rows,
            username: req.session.username,
            successMessage: req.query.update === 'success' ? 'Action completed successfully!' : null,
            sessionDetails: sessionResult.rows[0] || null,
        });
    } catch (err) {
        console.error('Error fetching dashboard data:', err);
        res.status(500).send('Error fetching dashboard data');
    }
});

// Book a session
router.post('/user-dashboard/book-session', isAuthenticated, async (req, res) => {
    const { sportId, place, date, timings, description } = req.body;

    if (!sportId || isNaN(sportId) || sportId <= 0) {
        return res.status(400).send('Invalid sport ID');
    }

    try {
        const sport = await db.query('SELECT * FROM sports WHERE sport_id = $1', [sportId]);
        if (sport.rows.length === 0) {
            return res.status(400).send('Sport not found');
        }

        const sessionTime = `${date} ${timings}`;

        const newSession = await db.query(
            `INSERT INTO sessions (user_id, sport_id, session_time, venue, description, status) 
             VALUES ($1, $2, TO_TIMESTAMP($3, 'DD-MM-YYYY HH24:MI'), $4, $5, 'Pending') RETURNING *`,
            [req.session.userId, sportId, sessionTime, place, description]
        );

        res.redirect('/api/user/user-dashboard');
    } catch (err) {
        console.error('Error booking session:', err);
        res.status(500).send('Error booking session');
    }
});

// Cancel a booked sport
router.post('/user-dashboard/cancel-sport', isAuthenticated, async (req, res) => {
    const { sportId } = req.body;
    try {
        await db.query('DELETE FROM registrations WHERE user_id = $1 AND sport_id = $2', [req.session.userId, sportId]);
        res.redirect('/auth/user-dashboard?update=success');
    } catch (err) {
        console.error('Error canceling sport:', err);
        res.status(500).send('Error canceling sport');
    }
});

module.exports = router;
