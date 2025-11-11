# Railway Deployment Checklist

## 🚀 Pre-Deployment Preparation

### 1. Environment Variables Setup
Before deploying to Railway, ensure you have the following environment variables ready:

- ✅ `OPENAI_API_KEY` - Your OpenAI API key from https://platform.openai.com/api-keys
- ✅ `ADMIN_PASSWORD` - A **strong, secure password** for admin dashboard access
- ✅ `NODE_ENV` - Set to `production`
- ✅ `FRONTEND_URL` - Your Railway app URL (e.g., `https://your-app-name.up.railway.app`)
- ✅ `PORT` - Railway automatically sets this, but you can override if needed

### 2. Code Review
- ✅ Verify all hardcoded `http://localhost:3001` URLs are replaced with environment variables or relative paths
- ✅ Ensure `.env` file is in `.gitignore` (already configured)
- ✅ Review `package.json` for correct dependencies
- ✅ Test locally one final time before deployment

### 3. Git Repository Setup
- ✅ Initialize Git repository if not already done:
  ```bash
  git init
  git add .
  git commit -m "Initial commit - ready for Railway deployment"
  ```
- ✅ Push to GitHub/GitLab (optional but recommended for Railway integration)

---

## 📦 Railway Deployment Steps

### Step 1: Create Railway Account
1. Go to https://railway.app/
2. Sign up with GitHub, GitLab, or email
3. Verify your account

### Step 2: Create New Project
1. Click **"New Project"** on Railway dashboard
2. Choose one of the following:
   - **Deploy from GitHub repo** (recommended)
   - **Deploy from local directory** (using Railway CLI)

### Step 3: Configure Project

#### Option A: Deploy from GitHub (Recommended)
1. Connect your GitHub account to Railway
2. Select your repository
3. Railway will auto-detect Node.js project
4. Configure build settings:
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && node server.js`
   - **Root Directory**: `/` (or specify if different)

#### Option B: Deploy from Local (Railway CLI)
1. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```
2. Login to Railway:
   ```bash
   railway login
   ```
3. Initialize project:
   ```bash
   railway init
   ```
4. Deploy:
   ```bash
   railway up
   ```

### Step 4: Set Environment Variables in Railway
1. Navigate to your project in Railway dashboard
2. Go to **Variables** tab
3. Add each environment variable:

```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
ADMIN_PASSWORD=YourSecurePassword123!
NODE_ENV=production
FRONTEND_URL=https://your-app-name.up.railway.app
```

**⚠️ IMPORTANT**: Replace `your-app-name` with your actual Railway app domain after deployment.

### Step 5: Configure Custom Domain (Optional)
1. Go to **Settings** → **Domains**
2. Railway provides a free subdomain: `your-app-name.up.railway.app`
3. To add custom domain:
   - Click **"Add Custom Domain"**
   - Follow DNS configuration instructions
   - Update `FRONTEND_URL` environment variable

### Step 6: Deploy and Monitor
1. Railway will automatically deploy your app
2. Monitor deployment logs in **Deployments** tab
3. Check for any errors during build/deployment
4. Once deployed, you'll see a URL (e.g., `https://your-app-name.up.railway.app`)

### Step 7: Update CORS Configuration
1. After getting your Railway URL, update `FRONTEND_URL` environment variable:
   ```
   FRONTEND_URL=https://your-app-name.up.railway.app
   ```
2. Railway will automatically redeploy with new environment variable

---

## 🧪 Post-Deployment Testing

### Test 1: Health Check
- ✅ Visit `https://your-app-name.up.railway.app/api/health`
- ✅ Should return: `{"status":"Server is running"}`

### Test 2: Frontend Access
- ✅ Visit `https://your-app-name.up.railway.app/`
- ✅ Character selection page should load
- ✅ Select a character and start an interview
- ✅ Send a few test messages
- ✅ Verify AI responses are working

### Test 3: Admin Dashboard
- ✅ Visit `https://your-app-name.up.railway.app/admin`
- ✅ Login with your `ADMIN_PASSWORD`
- ✅ Verify active sessions are displayed
- ✅ Test "Clear All Sessions" button
- ✅ Test individual session deletion

### Test 4: Rate Limiting
- ✅ Rapidly send multiple messages (should hit rate limit after 30 messages in 10 minutes)
- ✅ Verify rate limit error message is displayed

### Test 5: Session Cleanup
- ✅ Create a test session
- ✅ Wait 24+ hours (or modify cleanup interval for testing)
- ✅ Verify old session is automatically deleted

---

## 🔒 Security Checklist

### Before Going Live
- ✅ **Change default admin password** to a strong, unique password (minimum 16 characters)
- ✅ **Secure OpenAI API key** - never commit to Git
- ✅ **Enable HTTPS** (Railway provides this automatically)
- ✅ **Review CORS settings** - ensure `FRONTEND_URL` is correctly set
- ✅ **Test rate limiting** to prevent API abuse
- ✅ **Monitor OpenAI API usage** to avoid unexpected costs

### Recommended Security Improvements (Future)
- 🔄 **Hash admin password** using bcrypt (currently stored in plain text)
- 🔄 **Implement JWT tokens** for admin authentication
- 🔄 **Add session tokens** instead of plain session IDs
- 🔄 **Implement CSRF protection** for admin actions
- 🔄 **Add database persistence** (PostgreSQL) instead of in-memory storage

---

## 📊 Monitoring and Maintenance

### Railway Dashboard Monitoring
1. **Deployments** - View deployment history and logs
2. **Metrics** - Monitor CPU, memory, and network usage
3. **Logs** - Real-time application logs
   - Session creation/deletion
   - Rate limit hits
   - Cleanup operations
   - Errors and warnings

### OpenAI API Monitoring
1. Visit https://platform.openai.com/usage
2. Monitor daily/monthly usage
3. Set up usage alerts
4. Review cost estimates

### Regular Maintenance Tasks
- ✅ **Weekly**: Review application logs for errors
- ✅ **Monthly**: Check OpenAI API costs and usage patterns
- ✅ **Monthly**: Review and update dependencies (`npm audit`)
- ✅ **Quarterly**: Rotate admin password
- ✅ **Quarterly**: Review and update rate limits based on usage

---

## 🚨 Troubleshooting

### Issue: App Crashes on Startup
**Solution**: Check Railway logs for errors
- Verify all environment variables are set correctly
- Check Node.js version compatibility
- Review dependencies in `package.json`

### Issue: CORS Errors
**Solution**:
- Verify `FRONTEND_URL` matches your Railway domain exactly
- Check CORS configuration in `server.js`
- Ensure `NODE_ENV=production` is set

### Issue: OpenAI API Errors
**Solution**:
- Verify `OPENAI_API_KEY` is valid
- Check OpenAI account billing and quota
- Review API usage limits

### Issue: Sessions Not Persisting
**Expected Behavior**: Sessions are stored in-memory and will be lost on:
- Server restart
- Railway redeployment
- Server crash
- After 24 hours of inactivity

**Long-term Solution**: Implement database persistence (PostgreSQL)

### Issue: Rate Limit Not Working
**Solution**:
- Check Railway logs for rate limiter initialization
- Verify `express-rate-limit` is installed
- Test with different IPs/sessions

---

## 📝 Railway-Specific Configuration

### Environment Variables Best Practices
1. **Never commit `.env` file** - already in `.gitignore`
2. **Use Railway dashboard** to set production variables
3. **Keep `.env.example` updated** for team reference

### Build Configuration
```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd backend && npm install",
    "startCommand": "cd backend && node server.js"
  }
}
```

### Auto-Deploy Settings
- ✅ Enable auto-deploy on Git push (if using GitHub integration)
- ✅ Set up deployment notifications
- ✅ Configure deployment rollback if needed

---

## 💰 Cost Estimation

### Railway Costs
- **Starter Plan**: $5/month for 500 hours of usage
- **Developer Plan**: $20/month for unlimited usage
- **Free Trial**: 500 hours/month (requires credit card verification)

### OpenAI API Costs (GPT-4o-mini)
- **Input**: ~$0.15 per 1M tokens
- **Output**: ~$0.60 per 1M tokens
- **Estimated Cost per Conversation** (10 messages): ~$0.001-0.005
- **Monthly Estimate** (1000 conversations): ~$1-5

**Total Estimated Monthly Cost**: $6-25 (depending on usage)

---

## 🎯 Next Steps After Deployment

### Immediate Actions
1. ✅ Test all functionality in production
2. ✅ Share app URL with initial users
3. ✅ Monitor logs for first 24 hours
4. ✅ Set up usage alerts

### Future Enhancements
1. **Database Integration**: Add PostgreSQL for session persistence
2. **User Authentication**: Implement proper user accounts and authentication
3. **Analytics**: Track usage metrics and conversation quality
4. **Feedback System**: Allow users to rate conversations
5. **Advanced Security**: Implement JWT, bcrypt, CSRF protection
6. **Backup System**: Regular backups of conversation data
7. **API Rate Monitoring**: Dashboard for OpenAI API usage

---

## 📚 Additional Resources

- **Railway Documentation**: https://docs.railway.app/
- **OpenAI API Documentation**: https://platform.openai.com/docs
- **Express.js Security Best Practices**: https://expressjs.com/en/advanced/best-practice-security.html
- **Node.js Production Best Practices**: https://github.com/goldbergyoni/nodebestpractices

---

## 🆘 Support

### Railway Support
- **Railway Discord**: https://discord.gg/railway
- **Railway Status**: https://status.railway.app/
- **Railway Help Docs**: https://help.railway.app/

### OpenAI Support
- **OpenAI Help Center**: https://help.openai.com/
- **OpenAI Status**: https://status.openai.com/
- **API Documentation**: https://platform.openai.com/docs

---

## ✅ Deployment Complete!

Once you've completed all steps above, your Interview Training Platform will be live on Railway!

**Your app will be accessible at**: `https://your-app-name.up.railway.app`

**Admin dashboard**: `https://your-app-name.up.railway.app/admin`

---

*Last Updated: 2025-11-10*
*Railway Deployment Guide v1.0*
