// ===================================================
// YATRI BACKEND SERVER (MIGRATED TO POSTGRESQL)
// ===================================================

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { Pool } = require('pg'); // <-- Replaced sqlite3 with pg
const path = require('path'); // <-- Added for serving files

const app = express();
const PORT = process.env.PORT || 3000;
const saltRounds = 10;

// --- Middleware ---
app.use(cors());
app.use(express.json());

// This will serve your static files like CSS, images, etc., from the root directory
app.use(express.static(path.join(__dirname)));

// --- Database Setup (PostgreSQL) ---
// The Pool will automatically use the DATABASE_URL environment variable on Render
const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    // This is required for connecting to Render's free tier database
    ssl: {
        rejectUnauthorized: false
    }
});

// Function to create the table if it doesn't exist
async function initializeDatabase() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS staff (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                staff_id TEXT NOT NULL UNIQUE,
                email TEXT,
                password TEXT NOT NULL,
                progress JSONB DEFAULT '{}',
                quiz_score TEXT DEFAULT 'Not taken',
                created_by TEXT DEFAULT 'Unknown'
            )`);
        console.log("Successfully connected to PostgreSQL. 'staff' table is ready.");
    } catch (err) {
        console.error("Error initializing database table:", err);
    }
}
initializeDatabase();


// =======================
// API ENDPOINTS
// =======================

// --- Admin Login (No database interaction, no changes needed) ---
app.post('/api/admin/login', (req, res) => {
    const { adminId, password } = req.body;
    // In a real application, these should also be environment variables
    const isAdmin1 = adminId === 'pratham' && password === 'Yatriwest';
    const isAdmin2 = adminId === 'ketal' && password === 'Yatri@euston';

    if (isAdmin1 || isAdmin2) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Invalid Admin credentials.' });
    }
});

// --- Staff Login ---
app.post('/api/staff/login', async (req, res) => {
    const { staffId, password } = req.body;
    try {
        const result = await db.query('SELECT * FROM staff WHERE staff_id = $1', [staffId]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid Staff ID or password.' });
        }

        const match = await bcrypt.compare(password, user.password);

        if (match) {
            const { password, ...userData } = user; // Exclude password from response
            res.json({ success: true, user: userData });
        } else {
            res.status(401).json({ success: false, message: 'Invalid Staff ID or password.' });
        }
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ error: "Server error during login." });
    }
});

// --- Get All Staff (for Admin Dashboard) ---
app.get('/api/staff', async (req, res) => {
    try {
        const result = await db.query('SELECT id, name, staff_id, email, progress, quiz_score, created_by FROM staff');
        res.json(result.rows);
    } catch (err) {
        console.error("Get All Staff Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- Create New Staff ---
app.post('/api/staff', async (req, res) => {
    const { name, staff_id, email, password, adminId } = req.body;
    try {
        const hash = await bcrypt.hash(password, saltRounds);
        const sql = 'INSERT INTO staff (name, staff_id, email, password, progress, created_by) VALUES ($1, $2, $3, $4, $5, $6)';
        await db.query(sql, [name, staff_id, email, hash, '{}', adminId]);
        res.status(201).json({ success: true });
    } catch (err) {
        console.error("Create Staff Error:", err);
        // Check for unique violation error code from PostgreSQL
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Staff ID already exists.' });
        }
        res.status(500).json({ error: 'Error creating staff member.' });
    }
});

// --- Update Staff Information ---
app.put('/api/staff/:current_staff_id', async (req, res) => {
    const { name, staff_id, email, password } = req.body;
    const { current_staff_id } = req.params;

    try {
        if (password) {
            const hash = await bcrypt.hash(password, saltRounds);
            await db.query(
                'UPDATE staff SET name = $1, staff_id = $2, email = $3, password = $4 WHERE staff_id = $5',
                [name, staff_id, email, hash, current_staff_id]
            );
        } else {
            await db.query(
                'UPDATE staff SET name = $1, staff_id = $2, email = $3 WHERE staff_id = $4',
                [name, staff_id, email, current_staff_id]
            );
        }
        res.json({ success: true });
    } catch (err) {
        console.error("Update Staff Error:", err);
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Staff ID might already be in use.' });
        }
        res.status(500).json({ error: 'Error updating staff member.' });
    }
});

// --- Delete Staff ---
app.delete('/api/staff/:staff_id', async (req, res) => {
    try {
        await db.query('DELETE FROM staff WHERE staff_id = $1', [req.params.staff_id]);
        res.json({ success: true });
    } catch (err) {
        console.error("Delete Staff Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- Update Progress / Quiz Score ---
app.post('/api/progress', async (req, res) => {
    const { staffId, progress, quizScore } = req.body;
    try {
        if (progress) {
            await db.query('UPDATE staff SET progress = $1 WHERE staff_id = $2', [progress, staffId]);
        } else if (quizScore) {
            await db.query('UPDATE staff SET quiz_score = $1 WHERE staff_id = $2', [quizScore, staffId]);
        } else {
            return res.status(400).json({ error: 'No progress or quiz score provided.' });
        }
        res.json({ success: true });
    } catch (err) {
        console.error("Update Progress Error:", err);
        res.status(500).json({ error: err.message });
    }
});


// =======================================================
// SERVE THE FRONTEND FILE (Catch-All Route)
// This must be AFTER all your API routes
// =======================================================
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});


// --- Server Start ---
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
