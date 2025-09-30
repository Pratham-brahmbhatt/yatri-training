# Yatri Restaurant Portal - Email Setup Instructions

## Email Configuration Setup

To enable automatic email sending when staff users are created, follow these steps:

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure iCloud Email
The system is configured to send emails from `prathambarot08@icloud.com`. You need to set up an App-Specific Password:

1. Go to [Apple ID Management](https://appleid.apple.com/account/manage)
2. Sign in with your Apple ID (`prathambarot08@icloud.com`)
3. Navigate to **Security** section
4. Under **App-Specific Passwords**, click **Generate Password**
5. Enter a label like "Yatri Portal Server"
6. Copy the generated password

### 3. Set Environment Variable
Set the App-Specific Password as an environment variable:

**Windows (Command Prompt):**
```cmd
set ICLOUD_APP_PASSWORD=your-generated-app-password
```

**Windows (PowerShell):**
```powershell
$env:ICLOUD_APP_PASSWORD="your-generated-app-password"
```

**macOS/Linux:**
```bash
export ICLOUD_APP_PASSWORD="your-generated-app-password"
```

### 4. Start the Server
```bash
npm start
```

## Email Features

### What Happens When Staff is Created:
1. **Staff Account Creation**: New staff member is added to the database
2. **Automatic Email**: Welcome email is sent to the staff member's email address
3. **Email Content Includes**:
   - Welcome message
   - Login credentials (Staff ID and Password)
   - Portal URL
   - Training module instructions
   - Professional HTML formatting

### Email Template Features:
- **Professional Design**: Branded with Yatri colors and logo
- **Complete Information**: All necessary login details
- **Training Instructions**: Clear steps for completing modules
- **Responsive Design**: Works on all devices
- **Fallback Text**: Plain text version for email clients that don't support HTML

### Error Handling:
- **Email Validation**: Checks email format before sending
- **Graceful Failures**: If email fails, staff is still created
- **Admin Notifications**: Clear feedback on email status
- **Logging**: All email attempts are logged to console

## Troubleshooting

### Common Issues:

1. **"Email configuration error"**
   - Check if App-Specific Password is correctly set
   - Verify the password is valid and not expired

2. **"Authentication failed"**
   - Regenerate App-Specific Password
   - Ensure 2FA is enabled on the Apple ID

3. **"Connection timeout"**
   - Check internet connection
   - Verify SMTP settings (smtp.mail.me.com:587)

### Testing Email:
1. Create a test staff member through the admin panel
2. Check console logs for email status
3. Verify email is received in the staff member's inbox

## Security Notes:
- App-Specific Passwords are more secure than regular passwords
- Never commit the actual password to version control
- Use environment variables for sensitive information
- The password is only used for SMTP authentication

## Support:
If you encounter issues with email setup, check:
1. Apple ID security settings
2. Network connectivity
3. Server console logs
4. Email client spam folders

