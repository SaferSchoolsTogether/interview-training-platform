# Railway Deployment Troubleshooting Guide

## 🔴 Error: "Error creating build plan with Railpack"

### Problem
Railway cannot detect your Node.js application because the `package.json` is in a subdirectory (`backend/`), not the root.

### ✅ Solution (Multiple Options)

I've created **4 configuration files** to fix this. Railway will use whichever it finds first:

---

## Configuration Files Created

### 1. **railway.json** (Highest Priority)
**Location**: Root directory
**Purpose**: Explicit Railway configuration

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd backend && npm install",
    "watchPatterns": ["backend/**"]
  },
  "deploy": {
    "startCommand": "cd backend && node server.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 2. **nixpacks.toml** (Second Priority)
**Location**: Root directory
**Purpose**: Nixpacks build configuration

```toml
[phases.setup]
nixPkgs = ["nodejs_20"]

[phases.install]
cmds = ["cd backend && npm install"]

[phases.build]
cmds = ["echo 'Build complete'"]

[start]
cmd = "cd backend && node server.js"
```

### 3. **package.json** (Root Level)
**Location**: Root directory
**Purpose**: Root-level package configuration for Railway

```json
{
  "name": "interview-training-platform",
  "version": "1.0.0",
  "main": "backend/server.js",
  "scripts": {
    "start": "cd backend && node server.js",
    "install": "cd backend && npm install"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### 4. **backend/package.json** (Updated)
**Added `start` script**:
```json
{
  "scripts": {
    "start": "node server.js"
  }
}
```

---

## 🚀 Next Steps to Deploy

### Step 1: Commit and Push Changes
```bash
git add .
git commit -m "Add Railway configuration files"
git push origin main
```

### Step 2: Redeploy on Railway

#### Option A: Auto-Deploy (if GitHub connected)
1. Railway will automatically detect the push
2. A new deployment will start
3. Monitor the build logs

#### Option B: Manual Deploy
1. Go to Railway dashboard
2. Click **"Deploy"** button
3. Or trigger a redeploy from the **Deployments** tab

### Step 3: Monitor Build Logs
Watch for these stages:
1. ✅ **Initialization** - Railway clones your repo
2. ✅ **Build** - Runs `cd backend && npm install`
3. ✅ **Deploy** - Runs `cd backend && node server.js`
4. ✅ **Success** - App is live!

---

## 📋 Deployment Checklist

Before redeploying, ensure:

### Environment Variables Set in Railway:
- ✅ `OPENAI_API_KEY` - Your OpenAI API key
- ✅ `ADMIN_PASSWORD` - Secure admin password
- ✅ `NODE_ENV` - Set to `production`
- ✅ `FRONTEND_URL` - Your Railway app URL (e.g., `https://your-app-name.up.railway.app`)

**Note**: `PORT` is automatically set by Railway, you don't need to set it manually.

### Files Present in Repository:
- ✅ `railway.json` - Railway configuration
- ✅ `nixpacks.toml` - Nixpacks configuration
- ✅ `package.json` - Root package.json
- ✅ `backend/package.json` - Backend dependencies
- ✅ `backend/server.js` - Main server file
- ✅ `.gitignore` - Excludes `node_modules` and `.env`

---

## 🔍 Common Deployment Errors

### Error 1: "Cannot find module 'express'"
**Cause**: Dependencies not installed
**Solution**: Ensure `railway.json` has correct build command:
```json
"buildCommand": "cd backend && npm install"
```

### Error 2: "OPENAI_API_KEY is undefined"
**Cause**: Environment variable not set
**Solution**:
1. Go to Railway → Your Project → Variables
2. Add `OPENAI_API_KEY=sk-proj-xxxxx`
3. Redeploy

### Error 3: "Address already in use"
**Cause**: Wrong PORT configuration
**Solution**: Remove `PORT` from environment variables (Railway sets this automatically)

### Error 4: "Application failed to respond"
**Cause**: Server not listening on correct port
**Solution**: Verify `server.js` uses:
```javascript
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Error 5: "CORS error in browser"
**Cause**: `FRONTEND_URL` not set correctly
**Solution**:
1. Check your Railway deployment URL
2. Update `FRONTEND_URL` to match exactly (e.g., `https://your-app-name.up.railway.app`)
3. Redeploy

---

## 🧪 Testing After Deployment

### 1. Health Check
Visit: `https://your-app-name.up.railway.app/api/health`

**Expected Response**:
```json
{"status":"Server is running"}
```

### 2. Frontend
Visit: `https://your-app-name.up.railway.app/`

**Expected**: Character selection page loads

### 3. Admin Dashboard
Visit: `https://your-app-name.up.railway.app/admin`

**Expected**: Login page appears

### 4. Start Interview
1. Select a character
2. Start interview
3. Send a test message

**Expected**: AI responds with character dialogue

---

## 📊 Railway Dashboard Guide

### View Build Logs
1. Go to **Deployments** tab
2. Click on the latest deployment
3. View **Build** logs to see npm install output
4. View **Deploy** logs to see server startup

### View Runtime Logs
1. Go to **Deployments** tab
2. Click **View Logs**
3. Look for:
   ```
   Server is running on http://localhost:[PORT]
   Frontend available at http://localhost:[PORT]
   Session cleanup scheduled to run every hour
   ```

### Check Metrics
1. Go to **Metrics** tab
2. Monitor:
   - CPU usage
   - Memory usage
   - Network traffic

---

## 🛠️ Advanced Configuration

### Custom Domain
1. Railway Dashboard → Settings → Domains
2. Click **Add Custom Domain**
3. Add your domain (e.g., `interview.yourdomain.com`)
4. Update DNS records as instructed
5. Update `FRONTEND_URL` environment variable to your custom domain

### Environment-Specific Settings

#### Development:
```env
NODE_ENV=development
FRONTEND_URL=http://localhost:3001
```

#### Production (Railway):
```env
NODE_ENV=production
FRONTEND_URL=https://your-app-name.up.railway.app
```

---

## 🔄 Rollback Process

If deployment fails and you need to rollback:

1. Go to **Deployments** tab
2. Find a working deployment (green checkmark)
3. Click **⋮** (three dots)
4. Select **Redeploy**

---

## 📞 Getting Help

### Railway Support
- **Discord**: https://discord.gg/railway
- **Docs**: https://docs.railway.app/
- **Status**: https://status.railway.app/

### Check Railway Logs
```bash
# Using Railway CLI
railway logs
```

### View Deployment Details
```bash
# Using Railway CLI
railway status
```

---

## ✅ Deployment Success Indicators

You'll know deployment succeeded when:

1. ✅ Build logs show: `npm install` completed successfully
2. ✅ Deploy logs show: `Server is running on port [PORT]`
3. ✅ Health check returns `{"status":"Server is running"}`
4. ✅ Frontend loads without errors
5. ✅ You can log in to admin dashboard
6. ✅ Test interview session works end-to-end

---

## 🎯 Expected Railway Build Output

```
=== Initialization ===
Cloning repository...
✓ Repository cloned

=== Build ===
Running: cd backend && npm install
added 76 packages in 3.2s
✓ Build complete

=== Deploy ===
Running: cd backend && node server.js
Server is running on http://localhost:8080
Frontend available at http://localhost:8080
Session cleanup scheduled to run every hour
✓ Deployment successful

=== Your app is live! ===
https://your-app-name.up.railway.app
```

---

## 📝 Quick Reference

| Issue | Solution |
|-------|----------|
| Build fails | Check `railway.json` build command |
| App won't start | Check `railway.json` start command |
| CORS errors | Update `FRONTEND_URL` environment variable |
| API key errors | Verify `OPENAI_API_KEY` in Railway variables |
| Admin login fails | Check `ADMIN_PASSWORD` in Railway variables |
| Port errors | Remove `PORT` from environment variables |

---

## 🚀 One-Command Deployment Test

If you're still having issues, try this manual Railway CLI approach:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Set environment variables
railway variables set OPENAI_API_KEY=sk-proj-xxxxx
railway variables set ADMIN_PASSWORD=YourSecurePassword123
railway variables set NODE_ENV=production
railway variables set FRONTEND_URL=https://your-app-name.up.railway.app

# Deploy
railway up
```

---

*Last Updated: 2025-11-10*
*Troubleshooting Guide v1.0*
