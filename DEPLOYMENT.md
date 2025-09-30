# Yatri Portal - Deployment Guide

## Deploying to Render

### Prerequisites
1. A GitHub account
2. A Render account (free tier available)
3. Your code pushed to a GitHub repository

### Step-by-Step Deployment Instructions

#### 1. Push your code to GitHub
```bash
# Initialize git repository (if not already done)
git init

# Add all files
git add .

# Commit your changes
git commit -m "Initial commit for Render deployment"

# Create a new repository on GitHub and push
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

#### 2. Deploy to Render

1. **Go to Render Dashboard**
   - Visit [render.com](https://render.com)
   - Sign up/Login with your GitHub account

2. **Create New Web Service**
   - Click "New +" button
   - Select "Web Service"
   - Connect your GitHub repository

3. **Configure Service Settings**
   - **Name**: `yatri-portal` (or your preferred name)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or upgrade if needed)

4. **Environment Variables** (Optional)
   - `NODE_ENV`: `production`
   - `PORT`: `10000` (Render will override this automatically)

5. **Deploy**
   - Click "Create Web Service"
   - Render will automatically build and deploy your application
   - Wait for deployment to complete (usually 2-5 minutes)

#### 3. Access Your Application
- Once deployed, Render will provide you with a URL like: `https://yatri-portal.onrender.com`
- Your application will be live and accessible worldwide!

### Important Notes

#### Database Considerations
- **Current Setup**: Uses SQLite database stored in `/tmp/` directory
- **Limitation**: Data will be lost when Render restarts the service (free tier limitation)
- **Recommendation**: For production use, consider upgrading to a paid plan and using PostgreSQL

#### Admin Credentials
Your current admin credentials are:
- Admin 1: `pratham` / `Yatriwest`
- Admin 2: `ketal` / `Yatri@euston`

**Security Note**: Consider changing these credentials for production deployment.

#### Free Tier Limitations
- Service sleeps after 15 minutes of inactivity
- Cold start takes ~30 seconds when waking up
- Database data is not persistent (resets on restart)

### Troubleshooting

#### Common Issues:
1. **Build Fails**: Check that all dependencies are in `package.json`
2. **Service Won't Start**: Verify `start` script in `package.json`
3. **Database Errors**: Ensure database path is correctly configured

#### Support:
- Check Render logs in the dashboard for error details
- Render documentation: [render.com/docs](https://render.com/docs)

### Next Steps (Optional)
1. **Custom Domain**: Add your own domain name
2. **SSL Certificate**: Automatically provided by Render
3. **Database Upgrade**: Migrate to PostgreSQL for data persistence
4. **Environment Variables**: Add production-specific configurations
