const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.static(path.join(__dirname, 'public'))); 
// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/api/user', userRoutes); // User routes
app.use('/api/admin', adminRoutes); // Admin routes

// Serve Pages
app.get('/', (req, res) => res.render('index'));
app.get('/login', (req, res) => res.render('login'));
app.get('/signup', (req, res) => res.render('signup'));
app.get('/dashboard', (req, res) => res.render('user-dashboard'));

// Admin Login Page
app.get('/auth/admin-login-page', (req, res) => res.render('admin-login'));

// Admin Signup Page
app.get('/auth/admin-signup-page', (req, res) => res.render('admin-signup'));

// Admin Dashboard (optional)
const db = require('./db/db'); // Import your database connection

app.get('/auth/admin-dashboard', async (req, res) => {
    try {
        const sportsResult = await db.query('SELECT * FROM sports');
        res.render('admin-dashboard', { sports: sportsResult.rows });
    } catch (err) {
        console.error('Error fetching sports:', err);
        res.status(500).send('Error fetching sports');
    }
});

// Add Sport Route - Render the Add Sport Form (GET)
app.get('/auth/admin-dashboard/add-sport', (req, res) => {
    res.render('add-sport'); // Ensure you have an `add-sport.ejs` template
});

// Add Sport Route - Handle Form Submission (POST)
// Add Sport Route - Handle Form Submission (POST)
app.post('/auth/admin-dashboard/add-sport', async (req, res) => {
    const { name, place, date, timings, description } = req.body; // Extract all values

    if (!name || !place || !date || !timings || !description) {
        console.error("Missing required fields");
        return res.status(400).send("All fields are required.");
    }

    try {
        await db.query(
            'INSERT INTO sports (name, place, date, timings, description) VALUES ($1, $2, $3, $4, $5)',
            [name, place, date, timings, description]
        );
        res.redirect('/auth/admin-dashboard'); // Redirect back to admin dashboard
    } catch (err) {
        console.error('Error adding sport:', err);
        res.status(500).send('Error adding sport');
    }
});

// Update Sport Route - Render the Update Sport Form (GET)
app.get('/auth/admin-dashboard/update-sport/:sportId', async (req, res) => {
    const { sportId } = req.params;  // Use sportId (not id)
    try {
        const sportResult = await db.query('SELECT * FROM sports WHERE sport_id = $1', [sportId]);
        if (sportResult.rows.length === 0) {
            return res.status(404).send('Sport not found');
        }
        res.render('update-sport', { sport: sportResult.rows[0] });
    } catch (err) {
        console.error('Error fetching sport for update:', err);
        res.status(500).send('Error fetching sport for update');
    }
});

// Update Sport Route - Handle Form Submission (POST)
app.post('/auth/admin-dashboard/update-sport/:sportId', async (req, res) => {
    const { sportId } = req.params;  // Use sportId from URL
    const { name, place, date, timings, description } = req.body;

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
// Delete Sport Route - Handle Deletion (POST)
app.post('/auth/admin-dashboard/delete-sport', async (req, res) => {
    console.log("Received Request Body:", req.body); // Debugging log

    const { sportId } = req.body;  // Get sportId from request body

    if (!sportId || isNaN(sportId)) {
        console.error("Invalid sport ID received:", sportId);
        return res.status(400).send("Invalid sport ID.");
    }

    try {
        await db.query('DELETE FROM sports WHERE sport_id = $1', [sportId]);
        res.redirect('/auth/admin-dashboard');
    } catch (err) {
        console.error('Error deleting sport:', err);
        res.status(500).send('Error deleting sport');
    }
});

app.get('/user-dashboard', (req, res) => {
    const successMessage = req.query.booking === 'success' ? "Booking confirmed!" : null;
    
    res.render('user-dashboard', { successMessage });
});


// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
