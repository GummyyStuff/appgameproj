# Environment Variables Setup Instructions

## 📋 What You Need to Configure

### Backend `.env` File

**Location:** `/home/juan/appgameproj/packages/backend/.env`

**What to fill in:**

1. **`APPWRITE_API_KEY`** - ⚠️ **YOU MUST REPLACE THIS**
   - Go to https://db.juanis.cool
   - Login to Appwrite Console
   - Select project `tarkovcas`
   - Navigate to **Settings** → **API Keys**
   - Create a new API key OR use existing one
   - **Scopes needed:** All scopes (or at least: `users.read`, `users.write`, `databases.read`, `databases.write`, `sessions.write`)
   - Copy the API key
   - Replace `<YOUR_APPWRITE_API_KEY_HERE>` in `.env`

**All other values are already correct** and can stay as-is:
- ✅ `APPWRITE_ENDPOINT=https://db.juanis.cool/v1`
- ✅ `APPWRITE_PROJECT_ID=tarkovcas`
- ✅ `APPWRITE_DATABASE_ID=main_db`
- ✅ `APPWRITE_DISCORD_REDIRECT_URI=https://db.juanis.cool/v1/account/sessions/oauth2/callback/discord/tarkovcas`
- ✅ `FRONTEND_URL=https://tarkov.juanis.cool`
- ✅ `BACKEND_CALLBACK_URL=https://tarkov.juanis.cool/api/auth/callback`
- ✅ `PORT=3001`
- ✅ `NODE_ENV=production`
- ✅ `DAILY_BONUS=1000`
- ✅ `STARTING_BALANCE=10000`

---

### Frontend `.env` File

**Location:** `/home/juan/appgameproj/packages/frontend/.env`

**All values are already correct:**
- ✅ `VITE_APPWRITE_ENDPOINT=https://db.juanis.cool/v1`
- ✅ `VITE_APPWRITE_PROJECT_ID=tarkovcas`
- ✅ `VITE_APPWRITE_DATABASE_ID=main_db`
- ✅ `VITE_API_URL=https://tarkov.juanis.cool/api`

**No changes needed for frontend!**

---

## 🔐 Discord OAuth Configuration

### Discord Developer Portal

**Already configured** (you mentioned you completed this):
- ✅ Redirect URI: `https://db.juanis.cool/v1/account/sessions/oauth2/callback/discord/tarkovcas`

### Appwrite Console

**To verify/configure:**

1. Go to https://db.juanis.cool
2. Login and select project `tarkovcas`
3. Navigate to **Auth** → **Settings**
4. Scroll to **OAuth2 Providers**
5. Find **Discord** and click to expand
6. **Verify:**
   - ✅ Discord is **Enabled** (toggle is ON)
   - ✅ **App ID** is filled (your Discord Client ID)
   - ✅ **App Secret** is filled (your Discord Client Secret)
   - ✅ The redirect URI matches: `https://db.juanis.cool/v1/account/sessions/oauth2/callback/discord/tarkovcas`

---

## 📝 Current .env Status

Let me check what's currently in your `.env` files:

**Backend `.env`:**
```bash
cat /home/juan/appgameproj/packages/backend/.env
```

**Frontend `.env`:**
```bash
cat /home/juan/appgameproj/packages/frontend/.env
```

---

## ✅ Quick Checklist

Before testing, verify:

- [ ] **Backend `.env`**: APPWRITE_API_KEY is set (not placeholder)
- [ ] **Backend `.env`**: FRONTEND_URL=https://tarkov.juanis.cool
- [ ] **Backend `.env`**: BACKEND_CALLBACK_URL=https://tarkov.juanis.cool/api/auth/callback
- [ ] **Frontend `.env`**: VITE_API_URL=https://tarkov.juanis.cool/api
- [ ] **Appwrite Console**: Discord OAuth enabled with valid credentials
- [ ] **Discord Portal**: Redirect URI added
- [ ] **Backend**: Restarted after .env changes
- [ ] **Frontend**: Rebuilt after .env changes

---

## 🚀 After Configuration

**Deploy/Start:**

```bash
# Backend
cd /home/juan/appgameproj/packages/backend
bun run dev  # or deploy to production

# Frontend  
cd /home/juan/appgameproj/packages/frontend
bun run build  # then deploy dist/
```

**Test:**
1. Go to https://tarkov.juanis.cool/login
2. Click "Login with Discord"
3. Authorize
4. Check backend logs for debug output

---

## 🎯 Most Important

**The ONLY thing you likely need to change** is the `APPWRITE_API_KEY` in the backend `.env` file if it's not already a valid API key.

Everything else should already be configured correctly based on our migration! ✅

