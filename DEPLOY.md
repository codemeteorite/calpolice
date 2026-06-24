# Deployment Guide

This guide covers deploying CalPolice on Railway (backend) and Netlify (frontend).

## Architecture

```
┌─────────────────────┐
│  Netlify Frontend   │
│   (React + Vite)    │
│  https://yourapp    │
└──────────┬──────────┘
           │
           │ API Calls
           ↓
┌─────────────────────┐
│ Railway Backend     │
│ - Node.js API       │
│ - Python AI Service │
└─────────────────────┘
         ↓
┌─────────────────────┐
│  MongoDB Atlas      │
│  (Database)         │
└─────────────────────┘
```

## Backend Deployment on Railway

### Prerequisites

- Railway account ([Create here](https://railway.app))
- GitHub account (for easy deployment)

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Add Railway deployment config"
git push -u origin main
```

### Step 2: Create Railway Project

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Authorize GitHub and select your repository
5. Railway will auto-detect `railway.json` files

### Step 3: Add Environment Variables

In Railway Dashboard, navigate to each service and add:

**Node.js Backend:**
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/calpolice
JWT_SECRET=generate-a-complex-secret-key
PYTHON_AI_URL=https://your-python-service.up.railway.app
AI_SERVICE_URL=https://your-python-service.up.railway.app
PORT=5000
NODE_ENV=production
```

**Python AI Service:**
```
GROQ_API_KEY=your-groq-api-key
FLASK_ENV=production
FLASK_PORT=5001
```

### Step 4: Deploy

- Railway auto-deploys on push to main
- View logs in Railway Dashboard
- Get your service URLs from the Railway dashboard

### Monitoring

- Check logs: Railway Dashboard → Logs tab
- Monitor deployments: Railway Dashboard → Deployments tab
- View metrics: Railway Dashboard → Metrics tab

---

## Frontend Deployment on Netlify

### Prerequisites

- Netlify account ([Create here](https://netlify.com))
- GitHub account (for easy deployment)

### Step 1: Update API URL

In `client/.env.production` (create if doesn't exist):
```
VITE_API_URL=https://your-railway-backend.up.railway.app
```

Update your `client/src/api.js`:
```javascript
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
```

### Step 2: Connect to Netlify

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect GitHub and select your repository
4. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Base directory: `client`

### Step 3: Add Environment Variables

In Netlify Site Settings → Build & Deploy → Environment:

```
VITE_API_URL=https://your-railway-backend.up.railway.app
```

### Step 4: Deploy

- Netlify auto-deploys on push to main
- View deployment status in Netlify Dashboard
- Your site is live at `https://your-site.netlify.app`

### Redirects

The `netlify.toml` handles:
- SPA routing (all routes go to index.html)
- Cache headers
- API URL environment switching

---

## Environment Variables Summary

### Production Environment

**Railway Backend Services:**
- Node.js needs: `MONGO_URI`, `JWT_SECRET`, `PYTHON_AI_URL`, `PORT`, `NODE_ENV`
- Python needs: `GROQ_API_KEY`, `FLASK_ENV`, `FLASK_PORT`

**Netlify Frontend:**
- `VITE_API_URL` must point to Railway backend

### Local Development

Always use `.env` files (not committed):

```bash
# server/.env
MONGO_URI=mongodb://localhost:27017/calpolice
JWT_SECRET=dev-secret-key
PYTHON_AI_URL=http://127.0.0.1:5001
PORT=5000

# calpolice-ai/.env
GROQ_API_KEY=your-groq-key
FLASK_PORT=5001

# client/.env.local
VITE_API_URL=http://localhost:5000
```

---

## Monitoring & Debugging

### Railway

```bash
# View logs
railway logs -e production

# SSH into service
railway shell -e production

# View environment variables
railway vars
```

### Netlify

- Check build logs: Netlify Dashboard → Deploy log
- View function logs: Netlify Dashboard → Functions
- Monitor real-time: Netlify Dashboard → Analytics

### Common Issues

**CORS errors?**
- Ensure backend has CORS enabled for Netlify domain
- Check `server/index.js` CORS configuration

**Frontend can't reach API?**
- Verify `VITE_API_URL` is set correctly
- Check Railway backend is running
- Verify network policies aren't blocking requests

**404 errors on client navigation?**
- `netlify.toml` redirects should handle this
- Clear Netlify cache if still issues

---

## Scaling & Performance

### Backend (Railway)

- Monitor CPU/Memory in Railway Dashboard
- Auto-scale more resources if needed
- Consider separate services for Python AI

### Frontend (Netlify)

- Static site hosting is auto-scaled
- Edge caching enabled by default
- No scaling concerns

### Database (MongoDB Atlas)

- Monitor connection pool usage
- Backup regularly
- Consider indexes for large collections

---

## Rollback & Troubleshooting

### Railway

1. Go to Deployments tab
2. Click previous deployment
3. Select "Redeploy"

### Netlify

1. Go to Deploys tab
2. Click previous deploy
3. Select "Publish deploy"

### Database

Always keep MongoDB backups:
- MongoDB Atlas → Backup tab
- Enable automatic daily backups

---

## Next Steps

1. ✅ Push to GitHub
2. ✅ Connect Railway project
3. ✅ Set environment variables
4. ✅ Connect Netlify project
5. ✅ Test production deployment
6. ✅ Monitor logs and performance

You're ready to deploy! 🚀
