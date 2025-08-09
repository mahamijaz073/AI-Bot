# 🚀 Render Free Tier Deployment Guide

This guide will help you deploy your AI Trading Signal Bot on Render's free tier using individual service deployments.

## 📋 Prerequisites

1. **GitHub Repository:** Your code should be pushed to: `https://github.com/mahamijaz073/AI-Bot.git`
2. **Render Account:** Sign up at [render.com](https://render.com) (free)
3. **MongoDB Atlas:** Set up a free MongoDB cluster at [mongodb.com](https://mongodb.com)

## 🔧 Step 1: Deploy Backend Service

### 1.1 Create Web Service
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Choose **"Build and deploy from a Git repository"**
4. Connect your GitHub account and select: `mahamijaz073/AI-Bot`

### 1.2 Configure Backend Service
```
Name: ai-trading-bot-backend
Environment: Node
Region: Oregon (US West) - or closest to you
Branch: main
Root Directory: (leave empty)
Runtime: Node
Build Command: npm install
Start Command: npm start
Instance Type: Free
```

### 1.3 Environment Variables
Add these environment variables in the "Environment" section:

```
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ai-trading-bot
JWT_SECRET=your-super-secret-jwt-key-here
LICENSE_ENCRYPTION_KEY=your-license-encryption-key-here
```

**Important:** Replace the MongoDB URI with your actual Atlas connection string.

### 1.4 Deploy Backend
1. Click **"Create Web Service"**
2. Wait for deployment (usually 2-5 minutes)
3. Note your backend URL: `https://ai-trading-bot-backend.onrender.com`

## 🌐 Step 2: Deploy Frontend (Static Site)

### 2.1 Create Static Site
1. From Render Dashboard, click **"New +"** → **"Static Site"**
2. Connect the same GitHub repository: `mahamijaz073/AI-Bot`

### 2.2 Configure Frontend Service
```
Name: ai-trading-bot-frontend
Branch: main
Root Directory: (leave empty)
Build Command: cd client && npm install && npm run build
Publish Directory: client/build
```

### 2.3 Environment Variables for Frontend
Add this environment variable:

```
REACT_APP_API_URL=https://ai-trading-bot-backend.onrender.com
```

**Note:** Replace `ai-trading-bot-backend` with your actual backend service name if different.

### 2.4 Deploy Frontend
1. Click **"Create Static Site"**
2. Wait for deployment (usually 3-7 minutes)
3. Your frontend will be available at: `https://ai-trading-bot-frontend.onrender.com`

## 🔐 Step 3: Generate License Keys

After deployment, generate license keys using the admin panel:

1. Visit: `https://ai-trading-bot-backend.onrender.com/admin`
2. Use the license generation interface
3. Distribute keys to users

## ⚠️ Important Notes for Free Tier

### Limitations:
- **Sleep Mode:** Services sleep after 15 minutes of inactivity
- **Cold Starts:** First request after sleep takes 30-60 seconds
- **Monthly Hours:** 750 hours/month (enough for 1 service 24/7)
- **Bandwidth:** 100GB/month

### Optimization Tips:
1. **Keep Services Awake:** Use a service like [UptimeRobot](https://uptimerobot.com) to ping your backend every 14 minutes
2. **Database:** Use MongoDB Atlas free tier (512MB storage)
3. **Monitoring:** Check Render logs for any deployment issues

## 🔍 Troubleshooting

### Common Issues:

**Backend won't start:**
- Check environment variables are set correctly
- Verify MongoDB connection string
- Check Render logs for specific errors

**Frontend can't connect to backend:**
- Ensure `REACT_APP_API_URL` points to correct backend URL
- Check CORS settings in backend
- Verify backend is running and accessible

**Database connection fails:**
- Whitelist `0.0.0.0/0` in MongoDB Atlas Network Access
- Verify connection string format
- Check database user permissions

## 📱 Final URLs

After successful deployment:
- **Frontend:** `https://ai-trading-bot-frontend.onrender.com`
- **Backend API:** `https://ai-trading-bot-backend.onrender.com`
- **Admin Panel:** `https://ai-trading-bot-backend.onrender.com/admin`
- **Health Check:** `https://ai-trading-bot-backend.onrender.com/api/health`

## 🎉 Success!

Your AI Trading Signal Bot is now live on Render's free tier! Users can access the application and purchase licenses through the web interface.

---

**Need Help?** Check Render's documentation or the application logs in your Render dashboard for detailed error information.