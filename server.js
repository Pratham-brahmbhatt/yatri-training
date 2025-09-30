// =======================
// YATRI BACKEND SERVER
// =======================

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;
const saltRounds = 10; // For password hashing


// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// --- Database Setup ---
const dbPath = process.env.NODE_ENV === 'production' ? '/tmp/yatri_data.db' : './yatri_data.db';
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Error opening database", err.message);
    } else {
        console.log("Connected to the SQLite database.");
        // ** REVERTED **: The insecure 'plain_password' column has been removed.
        db.run(`CREATE TABLE IF NOT EXISTS staff (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            staff_id TEXT NOT NULL UNIQUE,
            email TEXT,
            password TEXT NOT NULL,
            progress TEXT DEFAULT '{}',
            quiz_score TEXT DEFAULT 'Not taken',
            created_by TEXT DEFAULT 'Unknown'
        )`, (err) => {
            if (err) console.error("Error creating table", err);
        });
        
        // Add new columns if they don't exist (for existing databases)
        db.run(`ALTER TABLE staff ADD COLUMN email TEXT`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error("Error adding email column", err);
            }
        });
        
        db.run(`ALTER TABLE staff ADD COLUMN created_by TEXT DEFAULT 'Unknown'`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error("Error adding created_by column", err);
            }
        });
    }
});

// =======================
// API ENDPOINTS
// =======================

// --- Admin Login ---
app.post('/api/admin/login', (req, res) => {
    const { adminId, password } = req.body;
    const isAdmin1 = adminId === 'pratham' && password === 'Yatriwest';
    const isAdmin2 = adminId === 'ketal' && password === 'Yatri@euston';

    if (isAdmin1 || isAdmin2) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Invalid Admin credentials.' });
    }
});

// --- Staff Login ---
app.post('/api/staff/login', (req, res) => {
    const { staffId, password } = req.body;
    db.get('SELECT * FROM staff WHERE staff_id = ?', [staffId], (err, user) => {
        if (err || !user) {
            return res.status(401).json({ success: false, message: 'Invalid Staff ID or password.' });
        }
        bcrypt.compare(password, user.password, (err, result) => {
            if (result) {
                const { password, ...userData } = user; // Exclude password from response
                res.json({ success: true, user: userData });
            } else {
                res.status(401).json({ success: false, message: 'Invalid Staff ID or password.' });
            }
        });
    });
});

// --- Get All Staff (for Admin Dashboard) ---
app.get('/api/staff', (req, res) => {
    // ** REVERTED **: No longer sends any password info to the admin dashboard.
    db.all('SELECT id, name, staff_id, email, progress, quiz_score, created_by FROM staff', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// --- Create New Staff ---
app.post('/api/staff', (req, res) => {
    const { name, staff_id, email, password, adminId } = req.body;
    bcrypt.hash(password, saltRounds, (err, hash) => {
        if (err) {
            return res.status(500).json({ error: 'Error hashing password' });
        }
        // ** REVERTED **: Only inserts the hashed password.
        const sql = 'INSERT INTO staff (name, staff_id, email, password, progress, created_by) VALUES (?, ?, ?, ?, ?, ?)';
        db.run(sql, [name, staff_id, email, hash, JSON.stringify({}), adminId], function(err) {
            if (err) {
                return res.status(400).json({ error: 'Staff ID already exists.' });
            }
            res.json({ success: true, id: this.lastID });
        });
    });
});

// --- ** NEW **: Update Staff Information ---
app.put('/api/staff/:current_staff_id', (req, res) => {
    const { name, staff_id, email, password } = req.body;
    const { current_staff_id } = req.params;

    // If password is being changed, hash it first.
    if (password) {
        bcrypt.hash(password, saltRounds, (err, hash) => {
            if (err) return res.status(500).json({ error: "Error hashing password" });
            db.run(`UPDATE staff SET name = ?, staff_id = ?, email = ?, password = ? WHERE staff_id = ?`,
                [name, staff_id, email, hash, current_staff_id], function (err) {
                if (err) return res.status(400).json({ error: "Staff ID might already be in use." });
                res.json({ success: true, changes: this.changes });
            });
        });
    } else {
        // If password is not being changed, update other fields.
        db.run(`UPDATE staff SET name = ?, staff_id = ?, email = ? WHERE staff_id = ?`,
            [name, staff_id, email, current_staff_id], function (err) {
            if (err) return res.status(400).json({ error: "Staff ID might already be in use." });
            res.json({ success: true, changes: this.changes });
        });
    }
});


// --- Delete Staff ---
app.delete('/api/staff/:staff_id', (req, res) => {
    db.run('DELETE FROM staff WHERE staff_id = ?', [req.params.staff_id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, changes: this.changes });
    });
});

// --- Update Progress / Quiz Score ---
app.post('/api/progress', (req, res) => {
    const { staffId, progress, quizScore } = req.body;
    let sql, params;
    if (progress) {
        sql = 'UPDATE staff SET progress = ? WHERE staff_id = ?';
        params = [JSON.stringify(progress), staffId];
    } else if (quizScore) {
        sql = 'UPDATE staff SET quiz_score = ? WHERE staff_id = ?';
        params = [quizScore, staffId];
    } else {
        return res.status(400).json({ error: 'No progress or quiz score provided.' });
    }
    db.run(sql, params, function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true });
    });
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});