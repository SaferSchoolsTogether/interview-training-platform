# How to Verify Your Railway Deployment is Working

## 🔍 Step 1: Check Railway Deployment Logs

1. Go to Railway Dashboard → Your Project → Deployments
2. Look for the **latest deployment** (should be rebuilding now after the push)
3. Click on it to view logs

### ✅ Success Indicators in Logs:

You should see this output when the app starts successfully:

```
========================================
🚀 Interview Training Platform Started
========================================
Server is running on http://localhost:[PORT]
Environment: production
CORS Origin: https://interview-training-app.up.railway.app

Endpoints:
  - Health Check: http://localhost:[PORT]/api/health
  - Frontend: http://localhost:[PORT]/
  - Admin: http://localhost:[PORT]/admin
========================================
Session cleanup scheduled to run every hour (24-hour retention)
```

### ❌ Error Fixed:

You should **NO LONGER** see this error:
```
❌ ValidationError: Custom keyGenerator appears to use request IP without calling the ipKeyGenerator helper function for IPv6 addresses
```

---

## 🧪 Step 2: Test Your Live App

### Test 1: Health Check Endpoint
**URL**: https://interview-training-app.up.railway.app/api/health

**Expected Response**:
```json
{"status":"Server is running"}
```

**How to Test**:
- Open this URL in your browser
- OR use curl: `curl https://interview-training-app.up.railway.app/api/health`
- OR use Postman/Insomnia

**✅ Success**: You see `{"status":"Server is running"}`
**❌ Failure**: Page doesn't load or shows error

---

### Test 2: Frontend Homepage
**URL**: https://interview-training-app.up.railway.app/

**Expected Result**:
- Character selection page loads
- You see 5 character cards:
  - Ethan Reeves (Sibling)
  - Lily Reeves (Sibling)
  - Andrew Wright (Classmate)
  - Taylor Gibbons (Classmate)
  - Sam Harding (Friend)

**✅ Success**: Page loads with all characters visible
**❌ Failure**: Blank page, 404 error, or CORS errors in browser console

---

### Test 3: Admin Dashboard
**URL**: https://interview-training-app.up.railway.app/admin

**Expected Result**:
- Login page appears
- Input field for password

**How to Test**:
1. Navigate to the admin URL
2. Enter your `ADMIN_PASSWORD` (the one you set in Railway environment variables)
3. Click "Login"

**✅ Success**: You're logged in and see the admin dashboard
**❌ Failure**: Login page doesn't load or login fails

---

### Test 4: Full Interview Flow
**How to Test**:
1. Go to: https://interview-training-app.up.railway.app/
2. Click on any character (e.g., "Ethan Reeves")
3. Wait for chat interface to load
4. Type a test message: "Hi, how are you today?"
5. Click Send

**Expected Result**:
- Character's greeting message appears
- Your message appears in the chat
- AI response appears after a few seconds

**✅ Success**: AI responds with character-appropriate dialogue
**❌ Failure**: Error message, no response, or timeout

---

## 🔧 Troubleshooting

### Issue: Health check returns 404
**Cause**: App hasn't started or deployed incorrectly
**Solution**:
- Check Railway deployment logs for errors
- Verify `railway.json` is in the repository
- Check that environment variables are set

### Issue: Frontend loads but CORS errors in console
**Cause**: `FRONTEND_URL` environment variable incorrect
**Solution**:
1. Open browser console (F12)
2. Look for CORS error messages
3. In Railway, verify `FRONTEND_URL=https://interview-training-app.up.railway.app`
4. Redeploy after fixing

### Issue: Admin login fails
**Cause**: `ADMIN_PASSWORD` environment variable not set or incorrect
**Solution**:
1. Go to Railway → Variables
2. Check `ADMIN_PASSWORD` is set correctly
3. Try logging in with the exact password

### Issue: AI doesn't respond
**Cause**: `OPENAI_API_KEY` not set or invalid
**Solution**:
1. Check Railway logs for OpenAI API errors
2. Verify `OPENAI_API_KEY` in Railway variables
3. Check OpenAI account has credits

---

## 📊 How to Read Railway Logs

### Good Deployment Logs:
```
✓ Build complete
✓ Deployment successful
🚀 Interview Training Platform Started
Server is running on http://localhost:8080
Environment: production
CORS Origin: https://interview-training-app.up.railway.app
```

### Bad Deployment Logs:
```
❌ Error: Cannot find module 'express'
❌ ValidationError: [rate limiter error]
❌ OpenAI API error: Invalid API key
❌ Application crashed
```

---

## 🎯 Quick Test Checklist

Copy this checklist and check off as you test:

- [ ] Railway deployment shows "Deployment successful" (green checkmark)
- [ ] Deployment logs show "🚀 Interview Training Platform Started"
- [ ] Deployment logs show NO error messages
- [ ] Health check returns `{"status":"Server is running"}`
- [ ] Frontend loads at https://interview-training-app.up.railway.app/
- [ ] All 5 characters are visible on homepage
- [ ] Can click a character and load chat interface
- [ ] Can send a message and receive AI response
- [ ] Admin page loads at /admin
- [ ] Can log in with ADMIN_PASSWORD
- [ ] Admin dashboard shows session list

**If ALL items are checked**: ✅ **Your deployment is working perfectly!**

**If ANY items are unchecked**: ⚠️ See troubleshooting section above

---

## 🔗 Important URLs for Your App

| Purpose | URL |
|---------|-----|
| **Main App** | https://interview-training-app.up.railway.app/ |
| **Health Check** | https://interview-training-app.up.railway.app/api/health |
| **Admin Dashboard** | https://interview-training-app.up.railway.app/admin |
| **Railway Dashboard** | https://railway.app/project/[your-project-id] |
| **GitHub Repository** | https://github.com/SaferSchoolsTogether/interview-training-platform |

---

## 📱 Testing with Different Tools

### Browser (Easiest)
1. Open Chrome/Firefox
2. Navigate to each URL
3. Open DevTools (F12) to check for errors in Console tab

### cURL (Command Line)
```bash
# Health check
curl https://interview-training-app.up.railway.app/api/health

# Should return: {"status":"Server is running"}
```

### Postman/Insomnia (API Testing)
1. Create GET request to health endpoint
2. Create POST request to `/api/start-session` with body:
   ```json
   {
     "characterName": "Ethan Reeves",
     "characterRole": "Sibling"
   }
   ```

---

## 🆘 Still Not Working?

If you've followed all steps and it's still not working:

1. **Check Railway Logs**: Look for specific error messages
2. **Check Environment Variables**: Ensure all 4 are set:
   - `OPENAI_API_KEY`
   - `ADMIN_PASSWORD`
   - `NODE_ENV=production`
   - `FRONTEND_URL=https://interview-training-app.up.railway.app`
3. **Check Build Logs**: Ensure `npm install` completed successfully
4. **Wait a few minutes**: Sometimes Railway takes time to fully start
5. **Try redeploying**: Railway Dashboard → Deployments → Latest → Redeploy

---

## ✅ Verification Complete

Once you've verified all tests pass, your app is **live and production-ready**! 🎉

**Share your app**: https://interview-training-app.up.railway.app/

---

*Last Updated: 2025-11-10*
*Verification Guide v1.0*
