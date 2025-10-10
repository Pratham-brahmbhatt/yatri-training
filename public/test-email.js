#!/usr/bin/env node

/**
 * Email Configuration Test Script
 * Run this script to test your email configuration
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmailConfiguration() {
    console.log('🧪 Testing YATRI Portal Email Configuration\n');
    
    // Check environment variables
    console.log('📋 Environment Variables Check:');
    console.log(`   EMAIL_USER: ${process.env.EMAIL_USER ? '✅ Set' : '❌ Not set'}`);
    console.log(`   EMAIL_PASS: ${process.env.EMAIL_PASS ? '✅ Set' : '❌ Not set'}`);
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log('\n❌ Email credentials not configured!');
        console.log('Please set EMAIL_USER and EMAIL_PASS environment variables.');
        console.log('See EMAIL_SETUP.md for detailed instructions.');
        return;
    }
    
    // Create transporter
    console.log('\n🔧 Creating email transporter...');
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
    
    // Test connection
    console.log('🔍 Testing email connection...');
    try {
        await transporter.verify();
        console.log('✅ Email connection successful!');
    } catch (error) {
        console.log('❌ Email connection failed:', error.message);
        console.log('\n🔧 Troubleshooting tips:');
        console.log('1. Make sure you\'re using Gmail App Password, not your regular password');
        console.log('2. Enable 2-Factor Authentication on your Gmail account');
        console.log('3. Generate a new App Password from Google Account settings');
        console.log('4. Check if your Gmail account has "Less secure app access" enabled');
        return;
    }
    
    // Test sending email
    const testEmail = process.env.EMAIL_USER; // Send to self for testing
    console.log(`\n📧 Testing email sending to ${testEmail}...`);
    
    const mailOptions = {
        from: `"YATRI Training Portal" <${process.env.EMAIL_USER}>`,
        to: testEmail,
        subject: '🧪 YATRI Portal Email Test',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; color: #FFD700; padding: 20px; border-radius: 10px;">
                <h1 style="color: #FFD700; text-align: center;">YATRI Portal Email Test</h1>
                <p style="color: #E0E0E0;">This is a test email to verify your email configuration is working correctly.</p>
                <p style="color: #E0E0E0;">✅ If you received this email, your configuration is working!</p>
                <p style="color: #888; text-align: center; margin-top: 30px;">© 2025 YATRI Indian Restaurant</p>
            </div>
        `
    };
    
    try {
        const result = await transporter.sendMail(mailOptions);
        console.log('✅ Test email sent successfully!');
        console.log(`   Message ID: ${result.messageId}`);
        console.log(`   Response: ${result.response}`);
        console.log('\n🎉 Email configuration is working perfectly!');
        console.log('You can now use the YATRI Portal email features.');
    } catch (error) {
        console.log('❌ Failed to send test email:', error.message);
        console.log('\n🔧 Additional troubleshooting:');
        console.log('1. Check your internet connection');
        console.log('2. Verify Gmail account is not locked or suspended');
        console.log('3. Try generating a new App Password');
        console.log('4. Check Gmail\'s sending limits (100 emails/day for free accounts)');
    }
}

// Run the test
testEmailConfiguration().catch(console.error);

