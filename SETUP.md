# Setup Guide

This guide walks through setting up CalPolice for development and production deployment.

## Local Development Setup

### Prerequisites

- Node.js v18 or higher ([Download](https://nodejs.org/))
- Python 3.10 or higher ([Download](https://www.python.org/))
- MongoDB Atlas account ([Create here](https://www.mongodb.com/atlas))
- Groq API key ([Get here](https://console.groq.com))

### Step 1: Clone and Navigate

```bash
git clone https://github.com/yourusername/calpolice.git
cd calpolice
```

### Step 2: Configure Environment Variables

**Backend (.env):**
```bash
cp server/.env.example server/.env
```

Edit `server/.env` and add:
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/calpolice
JWT_SECRET=generate-a-random-secret-key-here
PYTHON_AI_URL=http://127.0.0.1:5001
PORT=5000
```

**AI Service (.env):**
```bash
cp calpolice-ai/.env.example calpolice-ai/.env
```

Edit `calpolice-ai/.env` and add:
```
GROQ_API_KEY=your-groq-api-key-here
FLASK_PORT=5001
```

### Step 3: Install Dependencies

```bash
# Backend
cd server && npm install && cd ..

# Frontend
cd client && npm install && cd ..

# AI Service
cd calpolice-ai && pip install -r requirements.txt && cd ..
```

### Step 4: Start Services

**Windows (using startup script):**
```bash
start.bat
```

**Manual (all platforms):**
```bash
# Terminal 1 - Backend
cd server && npm run dev

# Terminal 2 - Frontend
cd client && npm run dev

# Terminal 3 - AI Service
cd calpolice-ai && python app.py
```

Access the application at http://localhost:5173

## Production Deployment

### Environment Configuration

Create secure `.env` files with production credentials:

**Backend:**
- Use a strong, randomly generated JWT_SECRET
- Use production MongoDB URI with strong password
- Set NODE_ENV=production
- Use production AI service URL

**Frontend:**
- Build optimized production bundle
- Configure API endpoints for production server

### Building for Production

```bash
# Frontend build
cd client && npm run build

# Backend is ready as-is (Node.js)

# AI service is ready as-is (Flask)
```

### Deployment Considerations

1. **Security:**
   - Never commit `.env` files
   - Rotate JWT secrets regularly
   - Use HTTPS in production
   - Implement rate limiting
   - Validate all API inputs

2. **Database:**
   - Enable MongoDB connection encryption
   - Use connection pooling
   - Regular backups
   - Monitor performance

3. **API Keys:**
   - Manage Groq API key securely
   - Use environment variables
   - Monitor API usage

4. **Performance:**
   - Enable frontend optimization
   - Use CDN for static assets
   - Enable caching headers
   - Monitor error logs

## Troubleshooting

### Port Already in Use

If ports 5000, 5001, or 5173 are already in use, edit the respective `.env` file or configuration.

### MongoDB Connection Error

Verify MongoDB URI is correct and your IP is whitelisted in MongoDB Atlas.

### Python Dependencies

If you encounter dependency issues:
```bash
cd calpolice-ai
pip install --upgrade pip
pip install -r requirements.txt
```

### Node Dependencies

Clear cache and reinstall:
```bash
cd server  # or client
rm -rf node_modules package-lock.json
npm install
```

## Additional Resources

- [MongoDB Atlas Docs](https://docs.atlas.mongodb.com/)
- [Express Best Practices](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [Python/Flask Docs](https://flask.palletsprojects.com/)
- [Groq API Docs](https://console.groq.com/docs)
