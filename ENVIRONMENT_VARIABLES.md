# Environment Variables Configuration Guide

## 📁 Backend Environment Variables

**File:** `packages/backend/.env`

### Production Configuration

```env
# ==================================================
# APPWRITE CONFIGURATION
# ==================================================
APPWRITE_ENDPOINT=https://db.juanis.cool/v1
APPWRITE_PROJECT_ID=tarkovcas
APPWRITE_API_KEY=<your-api-key-from-appwrite-console>
APPWRITE_DATABASE_ID=main_db
APPWRITE_DISCORD_REDIRECT_URI=https://db.juanis.cool/v1/account/sessions/oauth2/callback/discord/tarkovcas

# ==================================================
# APPLICATION URLS
# ==================================================
FRONTEND_URL=https://tarkov.juanis.cool
BACKEND_CALLBACK_URL=https://tarkov.juanis.cool/api/auth/callback
PORT=3001

# ==================================================
# ENVIRONMENT
# ==================================================
NODE_ENV=production

# ==================================================
# GAME CONFIGURATION
# ==================================================
DAILY_BONUS=1000
STARTING_BALANCE=10000

# ==================================================
# LEGACY - Remove after migration complete
# ==================================================
SUPABASE_URL=<your-supabase-url>
SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
JWT_SECRET=<your-jwt-secret>
```

### Local Development Configuration

```env
# Same as production but with localhost URLs:
FRONTEND_URL=http://localhost:3000
BACKEND_CALLBACK_URL=http://localhost:3001/api/auth/callback
NODE_ENV=development
```

---

## 📁 Frontend Environment Variables

**File:** `packages/frontend/.env`

### Production Configuration

```env
# ==================================================
# APPWRITE CONFIGURATION
# ==================================================
VITE_APPWRITE_ENDPOINT=https://db.juanis.cool/v1
VITE_APPWRITE_PROJECT_ID=tarkovcas
VITE_APPWRITE_DATABASE_ID=main_db

# ==================================================
# API CONFIGURATION
# ==================================================
VITE_API_URL=https://tarkov.juanis.cool/api

# ==================================================
# LEGACY - Remove after migration complete
# ==================================================
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

### Local Development Configuration

```env
# Same as production but with localhost API:
VITE_API_URL=http://localhost:3001/api
```

---

## 🔑 How to Get Required Values

### APPWRITE_API_KEY

1. Go to https://db.juanis.cool
2. Login to Appwrite Console
3. Select project `tarkovcas`
4. Navigate to **Settings** → **API Keys**
5. Click **Create API Key**
6. Name: `Backend API Key`
7. **Scopes:** Select all, or at minimum:
   - `users.read`
   - `users.write`
   - `databases.read`
   - `databases.write`
   - `sessions.write`
8. Click **Create**
9. Copy the generated API key
10. Paste into `APPWRITE_API_KEY`

**Note:** You already have a valid API key in your current `.env`, so you may not need to create a new one!

---

## ✅ Current Configuration Status

Based on your current `.env` files:

### Backend `.env` - What You Have:

```
✅ APPWRITE_ENDPOINT=https://db.juanis.cool/v1
✅ APPWRITE_PROJECT_ID=tarkovcas
✅ APPWRITE_API_KEY=standard_9119... (looks valid!)
✅ APPWRITE_DATABASE_ID=main_db
✅ APPWRITE_DISCORD_REDIRECT_URI=https://db.juanis.cool/v1/account/sessions/oauth2/callback/discord/tarkovcas

❌ FRONTEND_URL=http://localhost:3000 (should be https://tarkov.juanis.cool for production)
❌ BACKEND_CALLBACK_URL=http://localhost:3001/api/auth/callback (should be https://tarkov.juanis.cool/api/auth/callback for production)
❌ NODE_ENV=development (should be 'production' for production)
```

### Frontend `.env` - What You Have:

```
✅ VITE_APPWRITE_ENDPOINT=https://db.juanis.cool/v1
✅ VITE_APPWRITE_PROJECT_ID=tarkovcas
✅ VITE_APPWRITE_DATABASE_ID=main_db

❌ VITE_API_URL=http://localhost:3001/api (should be https://tarkov.juanis.cool/api for production)
```

---

## 🔧 Quick Fix for Production

**Edit your actual `.env` files and change these lines:**

### Backend (`packages/backend/.env`):

```bash
# Change these 3 lines:
FRONTEND_URL=https://tarkov.juanis.cool
BACKEND_CALLBACK_URL=https://tarkov.juanis.cool/api/auth/callback
NODE_ENV=production
```

### Frontend (`packages/frontend/.env`):

```bash
# Change this 1 line:
VITE_API_URL=https://tarkov.juanis.cool/api
```

**Everything else can stay as-is!** Your APPWRITE_API_KEY already looks valid. ✅

---

## 🚀 After Editing

1. **Restart/redeploy your backend** (picks up new .env)
2. **Rebuild your frontend** (`bun run build`)
3. **Deploy both**
4. **Test at** https://tarkov.juanis.cool/login

The OAuth flow will now work correctly with production URLs! 🎉

