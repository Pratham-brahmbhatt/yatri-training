// =======================
// YATRI BACKEND SERVER (PostgreSQL)
// =======================

// Load environment variables
require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const path = require('path');
// Email functionality - optional dependency
let nodemailer;
try {
    nodemailer = require('nodemailer');
} catch (error) {
    console.log('Nodemailer not installed - email functionality disabled');
    nodemailer = null;
}

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

// Email configuration
let emailTransporter = null;
if (nodemailer) {
    try {
        // Check if email credentials are provided
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log('⚠️  Email credentials not configured. Set EMAIL_USER and EMAIL_PASS environment variables.');
            console.log('📧 Email functionality will be disabled.');
        } else {
            emailTransporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                },
                // Additional options for better reliability and cloud deployment
                pool: true,
                maxConnections: 1,
                rateLimit: 14, // Gmail's limit is 100 emails per day for free accounts
                rateDelta: 60000, // 1 minute
                maxMessages: 100,
                // Cloud deployment specific settings
                connectionTimeout: 60000, // 60 seconds
                greetingTimeout: 30000,   // 30 seconds
                socketTimeout: 60000,     // 60 seconds
                secure: true,
                tls: {
                    rejectUnauthorized: false
                }
            });
            
            // Test the connection with timeout handling
            const verifyPromise = emailTransporter.verify();
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Verification timeout')), 30000)
            );
            
            Promise.race([verifyPromise, timeoutPromise])
                .then(() => {
                    console.log('✅ Email transporter configured and verified successfully');
                    console.log(`📧 Email will be sent from: ${process.env.EMAIL_USER}`);
                })
                .catch((error) => {
                    if (error.message === 'Verification timeout') {
                        console.log('⚠️  Email verification timed out, but transporter created (will retry on first email)');
                        console.log(`📧 Email transporter created for: ${process.env.EMAIL_USER}`);
                    } else {
                        console.log('❌ Email transporter verification failed:', error.message);
                        emailTransporter = null;
                    }
                });
        }
    } catch (error) {
        console.log('❌ Failed to configure email transporter:', error.message);
        emailTransporter = null;
    }
} else {
    console.log('❌ Nodemailer not available - email functionality disabled');
}

// Email templates
const emailTemplates = {
    welcomeEmail: (staffName, staffId, password) => ({
        subject: '🎉 Welcome to YATRI Training Portal!',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; color: #FFD700; padding: 20px; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #FFD700; margin: 0;">YATRI</h1>
                    <h2 style="color: #E0E0E0; margin: 10px 0;">Staff Training Portal</h2>
                </div>
                
                <div style="background: #2a2a2a; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h3 style="color: #FFD700; margin-top: 0;">Welcome to the YATRI Family, ${staffName}!</h3>
                    <p style="color: #E0E0E0; line-height: 1.6;">
                        We're excited to have you join our team! Your training account has been created and you can now access our comprehensive training modules.
                    </p>
                </div>
                
                <div style="background: #2a2a2a; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h4 style="color: #FFD700; margin-top: 0;">Your Login Credentials:</h4>
                    <p style="color: #E0E0E0; margin: 5px 0;"><strong>Staff ID:</strong> ${staffId}</p>
                    <p style="color: #E0E0E0; margin: 5px 0;"><strong>Password:</strong> ${password}</p>
                    <p style="color: #ff4d4d; font-size: 0.9em; margin-top: 10px;">
                        ⚠️ Please change your password after your first login for security.
                    </p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="https://yatri-training.onrender.com" 
                       style="background: linear-gradient(135deg, #FFD700 0%, #e6b800 100%); 
                              color: #000; 
                              padding: 15px 30px; 
                              text-decoration: none; 
                              border-radius: 8px; 
                              font-weight: bold; 
                              display: inline-block;">
                        🚀 Start Your Training
                    </a>
                </div>
                
                <div style="background: #2a2a2a; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h4 style="color: #FFD700; margin-top: 0;">What's Next?</h4>
                    <ul style="color: #E0E0E0; line-height: 1.8;">
                        <li>Complete all 9 training modules</li>
                        <li>Pass the final assessment (80% required)</li>
                        <li>Receive your completion certificate</li>
                        <li>Start your journey with YATRI!</li>
                    </ul>
                </div>
                
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #444;">
                    <p style="color: #888; font-size: 0.9em; margin: 0;">
                        © 2025 YATRI Indian Restaurant. All rights reserved.
                    </p>
                </div>
            </div>
        `
    }),
    
    broadcastEmail: (subject, message, adminName) => ({
        subject: subject,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; color: #FFD700; padding: 20px; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #FFD700; margin: 0;">YATRI</h1>
                    <h2 style="color: #E0E0E0; margin: 10px 0;">Staff Training Portal</h2>
                </div>
                
                <div style="background: #2a2a2a; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <div style="color: #E0E0E0; line-height: 1.6;">
                        ${message.replace(/\n/g, '<br>')}
                    </div>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="https://yatri-training.onrender.com" 
                       style="background: linear-gradient(135deg, #FFD700 0%, #e6b800 100%); 
                              color: #000; 
                              padding: 15px 30px; 
                              text-decoration: none; 
                              border-radius: 8px; 
                              font-weight: bold; 
                              display: inline-block;">
                        🔗 Access Training Portal
                    </a>
                </div>
                
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #444;">
                    <p style="color: #888; font-size: 0.9em; margin: 5px 0;">
                        Message sent by: ${adminName}
                    </p>
                    <p style="color: #888; font-size: 0.9em; margin: 0;">
                        © 2025 YATRI Indian Restaurant. All rights reserved.
                    </p>
                </div>
            </div>
        `
    })
};

// Email sending function
async function sendEmail(to, subject, html) {
    try {
        if (!nodemailer || !emailTransporter) {
            console.log('❌ Nodemailer not available, skipping email send');
            return { success: false, message: 'Email service not available' };
        }

        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log('❌ Email credentials not configured, skipping email send');
            return { success: false, message: 'Email not configured' };
        }

        const mailOptions = {
            from: `"YATRI Training Portal" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            html: html,
            // Add headers for better deliverability
            headers: {
                'X-Mailer': 'YATRI Training Portal',
                'X-Priority': '3'
            }
        };

        console.log(`📧 Attempting to send email to: ${to}`);
        console.log(`📧 Subject: ${subject}`);
        
        // Add timeout for email sending
        const sendPromise = emailTransporter.sendMail(mailOptions);
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Email sending timeout')), 60000)
        );
        
        const result = await Promise.race([sendPromise, timeoutPromise]);
        console.log(`✅ Email sent successfully to ${to}. Message ID: ${result.messageId}`);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error(`❌ Email sending error for ${to}:`, error.message);
        console.error('Full error:', error);
        return { success: false, error: error.message };
    }
}

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
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS admins (
                id SERIAL PRIMARY KEY,
                admin_id TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                email TEXT,
                password TEXT NOT NULL,
                created_by TEXT DEFAULT 'System',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT true
            )
        `);
        
        // Create default admin if no admins exist
        const adminCheck = await client.query('SELECT COUNT(*) FROM admins');
        if (parseInt(adminCheck.rows[0].count) === 0) {
            console.log('Creating default admin account...');
            const defaultPassword = await bcrypt.hash('Yatriwest', saltRounds);
            await client.query(
                'INSERT INTO admins (admin_id, name, email, password, created_by) VALUES ($1, $2, $3, $4, $5)',
                ['pratham', 'Pratham', '08prathambarot@gmail.com', defaultPassword, 'System']
            );
            console.log('Default admin created: pratham/Yatriwest');
        }
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

// --- Test Email Configuration ---
app.get('/api/test-email', async (req, res) => {
    try {
        const emailStatus = {
            nodemailerAvailable: !!nodemailer,
            emailTransporterConfigured: !!emailTransporter,
            emailCredentialsSet: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS),
            emailUser: process.env.EMAIL_USER ? `${process.env.EMAIL_USER.substring(0, 3)}***@gmail.com` : 'Not set'
        };

        // Test email transporter if available
        if (emailTransporter) {
            try {
                await emailTransporter.verify();
                emailStatus.transporterVerified = true;
            } catch (error) {
                emailStatus.transporterVerified = false;
                emailStatus.verificationError = error.message;
            }
        }

        res.json({
            status: 'success',
            emailConfiguration: emailStatus,
            message: emailTransporter ? 'Email service is ready' : 'Email service not configured'
        });
    } catch (err) {
        console.error('Email test error:', err);
        res.status(500).json({
            status: 'error',
            error: err.message
        });
    }
});

// --- Test Database Connection ---
app.get('/api/test-db', async (req, res) => {
    try {
        console.log('=== TESTING DATABASE CONNECTION ===');
        const client = await db.connect();
        console.log('Database connection successful');
        
        // Test basic query
        const result = await client.query('SELECT NOW() as current_time');
        console.log('Database query successful:', result.rows[0]);
        
        // Check if staff table exists
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'staff'
            );
        `);
        
        // Count staff if table exists
        let staffCount = 0;
        if (tableCheck.rows[0].exists) {
            const countResult = await client.query('SELECT COUNT(*) FROM staff');
            staffCount = parseInt(countResult.rows[0].count);
        }
        
        client.release();
        
        res.json({
            status: 'success',
            database_connected: true,
            current_time: result.rows[0].current_time,
            staff_table_exists: tableCheck.rows[0].exists,
            staff_count: staffCount,
            environment: process.env.NODE_ENV || 'development'
        });
    } catch (err) {
        console.error('Database test error:', err);
        res.status(500).json({
            status: 'error',
            database_connected: false,
            error: err.message,
            details: err.detail
        });
    }
});

// --- Admin Login ---
app.post('/api/admin/login', async (req, res) => {
    try {
        const { adminId, password } = req.body;
        console.log(`Admin login attempt: ${adminId}`);
        
        // Query admin from database
        const result = await db.query('SELECT * FROM admins WHERE admin_id = $1 AND is_active = true', [adminId]);
        
        if (result.rows.length === 0) {
            console.log(`Admin login failed: ${adminId} not found`);
            return res.status(401).json({ success: false, message: 'Invalid Admin credentials.' });
        }
        
        const admin = result.rows[0];
        const isValidPassword = await bcrypt.compare(password, admin.password);
        
        if (isValidPassword) {
            console.log(`Admin login successful: ${adminId}`);
            const { password, ...adminData } = admin; // Exclude password from response
            res.json({ success: true, admin: adminData });
        } else {
            console.log(`Admin login failed: ${adminId} wrong password`);
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
        console.log('=== STAFF API CALLED ===');
        console.log('Database URL configured:', process.env.DATABASE_URL ? 'Yes' : 'No');
        
        // Test database connection first
        const client = await db.connect();
        console.log('Database connection successful');
        
        // Check if table exists
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'staff'
            );
        `);
        console.log('Staff table exists:', tableCheck.rows[0].exists);
        
        if (!tableCheck.rows[0].exists) {
            console.log('Creating staff table...');
            await client.query(`
                CREATE TABLE staff (
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
            console.log('Staff table created successfully');
        }
        
        // Get all staff
        const result = await client.query('SELECT id, name, staff_id, email, progress, quiz_score, created_by FROM staff ORDER BY id DESC');
        console.log(`Retrieved ${result.rows.length} staff members:`, result.rows);
        
        client.release();
        res.json(result.rows);
    } catch (err) {
        console.error('Get staff error:', err);
        console.error('Error details:', {
            message: err.message,
            code: err.code,
            detail: err.detail
        });
        res.status(500).json({ 
            error: err.message,
            details: err.detail || 'Database connection failed'
        });
    }
});

// --- Create New Staff ---
app.post('/api/staff', async (req, res) => {
    try {
        const { name, staff_id, email, password, adminId } = req.body;
        console.log(`=== CREATING STAFF MEMBER ===`);
        console.log('Data received:', { name, staff_id, email, adminId });
        
        // Test database connection
        const client = await db.connect();
        console.log('Database connection successful for staff creation');
        
        // Ensure table exists
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'staff'
            );
        `);
        
        if (!tableCheck.rows[0].exists) {
            console.log('Creating staff table...');
            await client.query(`
                CREATE TABLE staff (
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
            console.log('Staff table created successfully');
        }
        
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        console.log('Password hashed successfully');
        
        const result = await client.query(
            'INSERT INTO staff (name, staff_id, email, password, progress, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [name, staff_id, email, hashedPassword, JSON.stringify({}), adminId]
        );
        
        console.log(`Staff member created successfully with ID: ${result.rows[0].id}`);
        client.release();
        
        // Send welcome email
        if (email && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            const emailTemplate = emailTemplates.welcomeEmail(name, staff_id, password);
            const emailResult = await sendEmail(email, emailTemplate.subject, emailTemplate.html);
            
            if (emailResult.success) {
                console.log(`Welcome email sent to ${email}`);
            } else {
                console.log(`Failed to send welcome email to ${email}:`, emailResult.error);
            }
        } else if (email) {
            console.log(`Email credentials not configured - skipping welcome email to ${email}`);
        }
        
        res.json({ success: true, id: result.rows[0].id, emailSent: email ? true : false });
    } catch (err) {
        console.error('Create staff error:', err);
        console.error('Error details:', {
            message: err.message,
            code: err.code,
            detail: err.detail
        });
        
        if (err.code === '23505') { // Unique constraint violation
            console.log(`Staff ID ${req.body.staff_id} already exists`);
            res.status(400).json({ error: 'Staff ID already exists.' });
        } else {
            res.status(500).json({ 
                error: 'Server error.',
                details: err.message
            });
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

// --- Get All Admins ---
app.get('/api/admins', async (req, res) => {
    try {
        const result = await db.query('SELECT id, admin_id, name, email, created_by, created_at, is_active FROM admins ORDER BY created_at DESC');
        console.log(`Retrieved ${result.rows.length} admins`);
        res.json(result.rows);
    } catch (err) {
        console.error('Get admins error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- Create New Admin ---
app.post('/api/admins', async (req, res) => {
    try {
        const { admin_id, name, email, password, created_by } = req.body;
        console.log(`Creating admin: ${admin_id} by: ${created_by}`);
        
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        const result = await db.query(
            'INSERT INTO admins (admin_id, name, email, password, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [admin_id, name, email, hashedPassword, created_by]
        );
        
        console.log(`Admin created successfully with ID: ${result.rows[0].id}`);
        res.json({ success: true, id: result.rows[0].id });
    } catch (err) {
        if (err.code === '23505') { // Unique constraint violation
            console.log(`Admin ID ${req.body.admin_id} already exists`);
            res.status(400).json({ error: 'Admin ID already exists.' });
        } else {
            console.error('Create admin error:', err);
            res.status(500).json({ error: 'Server error.' });
        }
    }
});

// --- Update Admin ---
app.put('/api/admins/:admin_id', async (req, res) => {
    try {
        const { name, email, password, is_active } = req.body;
        const { admin_id } = req.params;

        if (password) {
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            const result = await db.query(
                'UPDATE admins SET name = $1, email = $2, password = $3, is_active = $4 WHERE admin_id = $5',
                [name, email, hashedPassword, is_active, admin_id]
            );
            res.json({ success: true, changes: result.rowCount });
        } else {
            const result = await db.query(
                'UPDATE admins SET name = $1, email = $2, is_active = $3 WHERE admin_id = $4',
                [name, email, is_active, admin_id]
            );
            res.json({ success: true, changes: result.rowCount });
        }
    } catch (err) {
        console.error('Update admin error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// --- Delete Admin ---
app.delete('/api/admins/:admin_id', async (req, res) => {
    try {
        const result = await db.query('DELETE FROM admins WHERE admin_id = $1', [req.params.admin_id]);
        res.json({ success: true, changes: result.rowCount });
    } catch (err) {
        console.error('Delete admin error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- Broadcast Email ---
app.post('/api/broadcast-email', async (req, res) => {
    try {
        const { subject, message, adminName } = req.body;
        
        if (!subject || !message || !adminName) {
            return res.status(400).json({ error: 'Subject, message, and admin name are required' });
        }

        // Check if email service is available
        if (!nodemailer || !emailTransporter) {
            return res.status(400).json({ 
                error: 'Email service not available. Please check email configuration.' 
            });
        }

        // Check if email credentials are configured
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            return res.status(400).json({ 
                error: 'Email credentials not configured. Please set EMAIL_USER and EMAIL_PASS environment variables.' 
            });
        }

        // Get all staff emails
        const staffResult = await db.query('SELECT email, name FROM staff WHERE email IS NOT NULL AND email != \'\'');
        const staffEmails = staffResult.rows;

        if (staffEmails.length === 0) {
            return res.json({ 
                success: true, 
                message: 'No staff members with email addresses found',
                emailsSent: 0 
            });
        }

        console.log(`📧 Broadcasting email to ${staffEmails.length} staff members`);
        console.log(`📧 Subject: ${subject}`);
        console.log(`📧 From: ${adminName}`);

        // Send emails to all staff
        const emailTemplate = emailTemplates.broadcastEmail(subject, message, adminName);
        const emailPromises = staffEmails.map(async (staff) => {
            try {
                const result = await sendEmail(staff.email, emailTemplate.subject, emailTemplate.html);
                return { 
                    email: staff.email, 
                    name: staff.name, 
                    success: result.success,
                    error: result.error 
                };
            } catch (error) {
                return { 
                    email: staff.email, 
                    name: staff.name, 
                    success: false, 
                    error: error.message 
                };
            }
        });

        const results = await Promise.all(emailPromises);
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success);

        console.log(`Broadcast complete: ${successful} successful, ${failed.length} failed`);

        res.json({
            success: true,
            totalRecipients: staffEmails.length,
            emailsSent: successful,
            emailsFailed: failed.length,
            failedEmails: failed
        });

    } catch (err) {
        console.error('Broadcast email error:', err);
        res.status(500).json({ error: 'Server error while sending broadcast email' });
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
