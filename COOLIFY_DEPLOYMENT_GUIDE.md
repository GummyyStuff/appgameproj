# 🚀 Coolify Deployment Guide - Fix Blank Grey Screen

## 🔴 Problem
Your deployment shows a blank grey screen with these errors:
```
Refused to apply style from 'https://tarkov.juanis.cool/fa-v5-pro/css/all.css' because its MIME type ('text/html') is not a supported stylesheet MIME type
Supabase configuration error: {supabaseUrl: 'MISSING', supabaseAnonKey: 'MISSING'}
```

**Root Cause:** Environment variables are not being passed to the Docker build process.

## ✅ Solutions Applied

### 1. Fixed Code Issues ✅
- ✅ Fixed `setInterval` in `cache.ts` with browser check
- ✅ Changed minifier from `terser` to `esbuild`
- ✅ Updated `coolify.json` to include Appwrite variables
- ✅ Updated `Dockerfile` to accept Appwrite build args

### 2. Configuration Needed in Coolify ⚠️

You need to configure environment variables in Coolify's UI.

---

## 📝 Step-by-Step: Configure Coolify

### Step 1: Access Coolify Dashboard

1. Go to your Coolify dashboard
2. Navigate to your **tarkov-casino** project
3. Click on **Environment Variables** or **Settings** tab

### Step 2: Add Environment Variables

Add these variables in Coolify. **All are required!**

#### 🔵 Supabase Variables (Still in Use for Database)

```env
VITE_SUPABASE_URL=https://xxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_URL=https://xxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Where to find these:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - Project URL → `VITE_SUPABASE_URL` and `SUPABASE_URL`
   - `anon` `public` key → `VITE_SUPABASE_ANON_KEY` and `SUPABASE_ANON_KEY`
   - `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY`

#### 🟣 Appwrite Variables (For Authentication)

```env
VITE_APPWRITE_ENDPOINT=https://db.juanis.cool/v1
VITE_APPWRITE_PROJECT_ID=tarkovcas
APPWRITE_ENDPOINT=https://db.juanis.cool/v1
APPWRITE_PROJECT_ID=tarkovcas
APPWRITE_API_KEY=your-appwrite-api-key
```

**Where to find these:**
1. Go to your Appwrite console (https://db.juanis.cool)
2. Select project **tarkovcas**
3. For API Key:
   - Go to **Settings** → **API Keys**
   - Create new key or copy existing one
   - Scopes needed: `sessions.write`, `users.read`, `users.write`

#### 🟢 Application Variables

```env
VITE_API_URL=https://tarkov.juanis.cool
FRONTEND_URL=https://tarkov.juanis.cool
JWT_SECRET=your-secure-random-string-here
PORT=3000
NODE_ENV=production
```

**Generate JWT_SECRET:**
```bash
# Run this to generate a secure random string
openssl rand -base64 32
```

#### ⚙️ Optional Backend Variables

```env
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true
ENABLE_GAME_LOGGING=true
ENABLE_SECURITY_LOGGING=true
METRICS_ENABLED=true
REQUEST_TIMEOUT=30000
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
STARTING_BALANCE=10000
DAILY_BONUS=1000
```

### Step 3: Configure Build Arguments

**Important:** The `VITE_*` variables must be available during the **build stage**.

In Coolify, make sure these are set as **Build Arguments** (not just environment variables):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_URL`
- `VITE_APPWRITE_ENDPOINT`
- `VITE_APPWRITE_PROJECT_ID`

**How to set build arguments in Coolify:**
1. In your project settings
2. Look for **Build Arguments** or **Build-time Environment Variables** section
3. Add each `VITE_*` variable there
4. OR ensure the variables are available during build (Coolify usually handles this automatically if they're in the environment variables list)

### Step 4: Push Code Changes

The fixes have been committed. Now push them:

```bash
cd /home/juan/appgameproj
git push origin master
```

If you have authentication issues, you may need to:
```bash
# Use SSH if configured
git remote set-url origin git@github.com:yourusername/appgameproj.git
git push origin master

# Or use HTTPS with credentials
git push origin master
# Enter GitHub username and personal access token when prompted
```

### Step 5: Deploy

1. **Option A: Automatic Deploy** (if enabled in Coolify)
   - Coolify will automatically detect the new commit and deploy

2. **Option B: Manual Deploy**
   - Go to Coolify dashboard
   - Navigate to your project
   - Click **"Redeploy"** or **"Deploy"** button
   - Wait for build to complete (5-10 minutes)

### Step 6: Verify Deployment

Once deployment completes:

1. **Open your site:** https://tarkov.juanis.cool

2. **Open Browser DevTools** (F12)

3. **Check Console** - You should see:
   - ✅ No `CACHE_KEYS` errors
   - ✅ No Supabase configuration errors
   - ✅ No Font Awesome MIME type errors
   - ✅ Site loads correctly

4. **Test Authentication:**
   - Click "Login with Discord"
   - Should redirect to Discord OAuth
   - After authorization, should return to site logged in

---

## 🐛 Troubleshooting

### Error: "MIME type ('text/html') is not a supported stylesheet"

**Cause:** Font Awesome CSS files not being served correctly

**Fix:**
- Check that `/fa-v5-pro/` folder exists in the built frontend
- Verify nginx/server is serving static files correctly
- Clear browser cache and hard reload (Ctrl+Shift+R)

### Error: "Supabase configuration error: MISSING"

**Cause:** Environment variables not passed to build

**Fix:**
1. Verify variables are set in Coolify UI
2. Ensure `VITE_*` variables are available as **build arguments**
3. Trigger a **clean rebuild** (delete and redeploy)

### Error: "Appwrite: Invalid project ID"

**Cause:** Appwrite variables not set or incorrect

**Fix:**
1. Verify `VITE_APPWRITE_PROJECT_ID=tarkovcas`
2. Verify `VITE_APPWRITE_ENDPOINT=https://db.juanis.cool/v1`
3. Check Appwrite console that project exists

### Build Fails with "Missing required environment variables"

**Cause:** Build arguments not configured in Coolify

**Fix:**
1. Go to Coolify → Your Project → Settings
2. Add all `VITE_*` variables as build arguments
3. Ensure they're available during the Docker build stage

### Site Still Shows Blank Grey Screen After Deploy

**Troubleshooting Steps:**
1. Check Coolify build logs for errors
2. Check Coolify runtime logs for startup errors
3. Verify Docker container is running
4. Check health endpoint: https://tarkov.juanis.cool/api/health
5. Hard refresh browser (Ctrl+Shift+R)
6. Clear browser cache completely

---

## 📊 Checklist

Before deploying, ensure:

- [ ] All Supabase environment variables are set in Coolify
- [ ] All Appwrite environment variables are set in Coolify
- [ ] `VITE_*` variables are configured as build arguments
- [ ] JWT_SECRET is set with a secure random string
- [ ] Code changes have been pushed to GitHub
- [ ] Coolify has access to pull from GitHub repository

After deploying:

- [ ] Site loads without blank grey screen
- [ ] No console errors related to environment variables
- [ ] Font Awesome icons display correctly
- [ ] Login with Discord works
- [ ] Can navigate to different pages
- [ ] Games load and function properly

---

## 📚 Related Documentation

- `QUICK_START.md` - Environment setup
- `DISCORD_OAUTH_SETUP.md` - Discord OAuth configuration
- `STEP2_COMPLETE.md` - Authentication migration details
- `APPWRITE_VERIFICATION.md` - Appwrite implementation
- `AUTH_MIGRATION_SUMMARY.md` - Technical migration details

---

## 🆘 Need Help?

If you're still having issues after following this guide:

1. Check the Coolify logs (Build logs and Runtime logs)
2. Check the browser console for specific error messages
3. Verify all environment variables are set correctly
4. Try a clean rebuild (remove and redeploy)
5. Ensure your Appwrite and Supabase services are accessible

---

**Last Updated:** 2025-10-09
**Status:** Ready to deploy after configuring environment variables in Coolify

