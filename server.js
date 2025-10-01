// =======================
// YATRI BACKEND SERVER (PostgreSQL)
// =======================

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const saltRounds = 10; // For password hashing

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Database Setup (PostgreSQL) ---
const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database
async function initializeDatabase() {
    try {
        // Test database connection
        const client = await db.connect();
        console.log("Successfully connected to PostgreSQL database");
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS staff (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                staff_id TEXT NOT NULL UNIQUE,
                email TEXT,
                password TEXT NOT NULL,
                progress TEXT DEFAULT '{}',
                quiz_score TEXT DEFAULT 'Not taken',
                created_by TEXT DEFAULT 'Unknown'
            )
        `);
        console.log("Staff table verified/created successfully");
        client.release();
    } catch (err) {
        console.error("Database initialization error:", err);
        process.exit(1); // Exit if database connection fails
    }
}

// Initialize database on startup
initializeDatabase();

// =======================
// API ENDPOINTS
// =======================

// --- Health Check ---
app.get('/api/health', async (req, res) => {
    try {
        // Test database connection
        await db.query('SELECT 1');
        res.json({ 
            status: 'healthy', 
            database: 'connected',
            environment: process.env.NODE_ENV || 'development',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(500).json({ 
            status: 'unhealthy', 
            database: 'disconnected',
            error: error.message 
        });
    }
});

// --- Admin Login ---
app.post('/api/admin/login', (req, res) => {
    try {
        const { adminId, password } = req.body;
        console.log(`Admin login attempt: ${adminId}`);
        
        const isAdmin1 = adminId === 'pratham' && password === 'Yatriwest';
        const isAdmin2 = adminId === 'ketal' && password === 'Yatri@euston';

        if (isAdmin1 || isAdmin2) {
            console.log(`Admin login successful: ${adminId}`);
            res.json({ success: true });
        } else {
            console.log(`Admin login failed: ${adminId}`);
            res.status(401).json({ success: false, message: 'Invalid Admin credentials.' });
        }
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ success: false, message: 'Server error during login.' });
    }
});

// --- Staff Login ---
app.post('/api/staff/login', async (req, res) => {
    try {
        const { staffId, password } = req.body;
        const result = await db.query('SELECT * FROM staff WHERE staff_id = $1', [staffId]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid Staff ID or password.' });
        }
        
        const user = result.rows[0];
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (isValidPassword) {
            const { password, ...userData } = user; // Exclude password from response
            res.json({ success: true, user: userData });
        } else {
            res.status(401).json({ success: false, message: 'Invalid Staff ID or password.' });
        }
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// --- Get All Staff (for Admin Dashboard) ---
app.get('/api/staff', async (req, res) => {
    try {
        const result = await db.query('SELECT id, name, staff_id, email, progress, quiz_score, created_by FROM staff');
        console.log(`Retrieved ${result.rows.length} staff members`);
        res.json(result.rows);
    } catch (err) {
        console.error('Get staff error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- Create New Staff ---
app.post('/api/staff', async (req, res) => {
    try {
        const { name, staff_id, email, password, adminId } = req.body;
        console.log(`Creating staff member: ${staff_id} by admin: ${adminId}`);
        
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        const result = await db.query(
            'INSERT INTO staff (name, staff_id, email, password, progress, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [name, staff_id, email, hashedPassword, JSON.stringify({}), adminId]
        );
        
        console.log(`Staff member created successfully with ID: ${result.rows[0].id}`);
        res.json({ success: true, id: result.rows[0].id });
    } catch (err) {
        if (err.code === '23505') { // Unique constraint violation
            console.log(`Staff ID ${req.body.staff_id} already exists`);
            res.status(400).json({ error: 'Staff ID already exists.' });
        } else {
            console.error('Create staff error:', err);
            res.status(500).json({ error: 'Server error.' });
        }
    }
});

// --- Update Staff Information ---
app.put('/api/staff/:current_staff_id', async (req, res) => {
    try {
        const { name, staff_id, email, password } = req.body;
        const { current_staff_id } = req.params;

        if (password) {
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            const result = await db.query(
                'UPDATE staff SET name = $1, staff_id = $2, email = $3, password = $4 WHERE staff_id = $5',
                [name, staff_id, email, hashedPassword, current_staff_id]
            );
            res.json({ success: true, changes: result.rowCount });
        } else {
            const result = await db.query(
                'UPDATE staff SET name = $1, staff_id = $2, email = $3 WHERE staff_id = $4',
                [name, staff_id, email, current_staff_id]
            );
            res.json({ success: true, changes: result.rowCount });
        }
    } catch (err) {
        if (err.code === '23505') { // Unique constraint violation
            res.status(400).json({ error: "Staff ID might already be in use." });
        } else {
            console.error('Update staff error:', err);
            res.status(500).json({ error: 'Server error.' });
        }
    }
});

// --- Delete Staff ---
app.delete('/api/staff/:staff_id', async (req, res) => {
    try {
        const result = await db.query('DELETE FROM staff WHERE staff_id = $1', [req.params.staff_id]);
        res.json({ success: true, changes: result.rowCount });
    } catch (err) {
        console.error('Delete staff error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- Update Progress / Quiz Score ---
app.post('/api/progress', async (req, res) => {
    try {
        const { staffId, progress, quizScore } = req.body;
        
        if (progress) {
            await db.query('UPDATE staff SET progress = $1 WHERE staff_id = $2', [JSON.stringify(progress), staffId]);
        } else if (quizScore) {
            await db.query('UPDATE staff SET quiz_score = $1 WHERE staff_id = $2', [quizScore, staffId]);
        } else {
            return res.status(400).json({ error: 'No progress or quiz score provided.' });
        }
        
        res.json({ success: true });
    } catch (err) {
        console.error('Update progress error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Database URL configured: ${process.env.DATABASE_URL ? 'Yes' : 'No'}`);
});
