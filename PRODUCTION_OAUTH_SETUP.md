# Production OAuth Setup Guide

## ✅ Current Configuration

**Your Production URLs:**
- Frontend: `https://tarkov.juanis.cool`
- Backend API: `https://tarkov.juanis.cool/api`
- Appwrite: `https://db.juanis.cool/v1`
- Project ID: `tarkovcas`

---

## 🔧 Required Configurations

### 1. Discord Developer Portal

**Navigate to:** https://discord.com/developers/applications

**Your Discord Application → OAuth2 → Redirects**

Add this **exact** redirect URI:
```
https://db.juanis.cool/v1/account/sessions/oauth2/callback/discord/tarkovcas
```

**Important:** Must be exactly this URL, including `/tarkovcas` at the end.

---

### 2. Appwrite Console

**Navigate to:** https://db.juanis.cool

**Project `tarkovcas` → Auth → Settings → OAuth2 Providers → Discord**

**Configuration:**
- ✅ **Enable Discord** (toggle ON)
- ✅ **App ID:** Your Discord Client ID
- ✅ **App Secret:** Your Discord Client Secret
- ✅ **Redirect URI:** `https://db.juanis.cool/v1/account/sessions/oauth2/callback/discord/tarkovcas`

---

### 3. Backend Environment Variables

**File:** `packages/backend/.env`

```env
APPWRITE_ENDPOINT=https://db.juanis.cool/v1
APPWRITE_PROJECT_ID=tarkovcas
APPWRITE_API_KEY=standard_9119aa1271bd6ea8d4eaf23904a26105c95897514aae7ea22d288f9910307afe03676d66990bafcbeaab1fb162c15638de783745d115bcd5615470c824b03fa8c88ff4a52c7a8e4e044dbc939847d0a44509cfc191c65e5b64e63a2fcf9a9105f42fd2431686bab63e0a9788f5a286959e399d05c5168be745f356acca01ad78
APPWRITE_DISCORD_REDIRECT_URI=https://db.juanis.cool/v1/account/sessions/oauth2/callback/discord/tarkovcas
APPWRITE_DATABASE_ID=main_db
FRONTEND_URL=https://tarkov.juanis.cool
BACKEND_CALLBACK_URL=https://tarkov.juanis.cool/api/auth/callback
PORT=3001
NODE_ENV=production
DAILY_BONUS=1000
STARTING_BALANCE=10000
```

---

### 4. Frontend Environment Variables

**File:** `packages/frontend/.env`

```env
VITE_APPWRITE_ENDPOINT=https://db.juanis.cool/v1
VITE_APPWRITE_PROJECT_ID=tarkovcas
VITE_APPWRITE_DATABASE_ID=main_db
VITE_API_URL=https://tarkov.juanis.cool/api
```

---

## 🔄 OAuth Flow (Production)

1. **User visits:** `https://tarkov.juanis.cool/login`
2. **Clicks "Login with Discord"**
3. **Frontend redirects to:** `https://tarkov.juanis.cool/api/auth/discord`
4. **Backend redirects to Appwrite:** `https://db.juanis.cool/v1/account/sessions/oauth2/discord?project=tarkovcas&success=https://tarkov.juanis.cool/api/auth/callback&failure=https://tarkov.juanis.cool/login?error=oauth_failed`
5. **Appwrite redirects to Discord** for authorization
6. **User authorizes on Discord**
7. **Discord redirects to Appwrite callback:** `https://db.juanis.cool/v1/account/sessions/oauth2/callback/discord/tarkovcas`
8. **Appwrite processes OAuth, redirects to your backend:** `https://tarkov.juanis.cool/api/auth/callback?userId=...&secret=...&state=...`
9. **Backend creates session, sets cookie, redirects to:** `https://tarkov.juanis.cool/`
10. **User is logged in!**

---

## 🔍 Verify Configurations

### Check Discord Developer Portal
- [ ] Application exists
- [ ] Redirect URI `https://db.juanis.cool/v1/account/sessions/oauth2/callback/discord/tarkovcas` is added
- [ ] Client ID and Secret are generated

### Check Appwrite Console
- [ ] Project `tarkovcas` exists
- [ ] Discord OAuth is enabled
- [ ] Discord Client ID matches Discord portal
- [ ] Discord Client Secret matches Discord portal
- [ ] The redirect URI shows: `https://db.juanis.cool/v1/account/sessions/oauth2/callback/discord/tarkovcas`

### Check Backend
- [ ] `.env` file has all variables
- [ ] `FRONTEND_URL=https://tarkov.juanis.cool`
- [ ] `BACKEND_CALLBACK_URL=https://tarkov.juanis.cool/api/auth/callback`
- [ ] `NODE_ENV=production`

### Check Frontend
- [ ] `.env` file has all variables
- [ ] `VITE_API_URL=https://tarkov.juanis.cool/api`

---

## 🚀 Deploy & Test

### 1. Build Frontend
```bash
cd /home/juan/appgameproj/packages/frontend
bun run build
```

### 2. Start Backend (Production)
```bash
cd /home/juan/appgameproj/packages/backend
NODE_ENV=production bun run src/index.ts
```

### 3. Test OAuth Flow
1. Visit `https://tarkov.juanis.cool/login`
2. Click "Login with Discord"
3. Authorize on Discord
4. Should redirect to `https://tarkov.juanis.cool/` logged in

---

## 🐛 Troubleshooting

### Error: "Project not found"
**Fix:** Verify `APPWRITE_PROJECT_ID=tarkovcas` in both frontend and backend `.env`

### Error: "Invalid redirect URI"
**Fix:** Ensure Discord Developer Portal has exact URL: `https://db.juanis.cool/v1/account/sessions/oauth2/callback/discord/tarkovcas`

### Error: "OAuth failed"
**Fix:** Check Appwrite console Discord OAuth is enabled with valid Client ID and Secret

### Error: "CORS error"
**Fix:** Ensure your backend CORS is configured to allow `https://tarkov.juanis.cool`

### Cookies not set
**Fix:** Ensure both frontend and backend are on HTTPS in production

---

## ✅ Checklist

Before testing OAuth in production:

- [ ] Discord Developer Portal: Redirect URI configured
- [ ] Appwrite Console: Discord OAuth enabled with credentials
- [ ] Backend `.env`: All production URLs set
- [ ] Frontend `.env`: All production URLs set
- [ ] Backend deployed and running
- [ ] Frontend built and deployed
- [ ] DNS pointing correctly
- [ ] HTTPS working on both domains

---

## 🎯 Success Criteria

When OAuth works, you should see:
1. Login button redirects to Appwrite
2. Appwrite redirects to Discord
3. Discord authorization page appears
4. After authorization, redirects back to Appwrite
5. Appwrite redirects to your backend callback
6. Backend creates session and redirects to frontend
7. Frontend shows you logged in with profile data

**If all these happen:** ✅ OAuth is working in production!

---

## 📞 If Still Having Issues

**Check Backend Logs:**
- Look for OAuth callback logs
- Check for errors creating user profile
- Verify session creation

**Check Browser Network Tab:**
- Follow the redirect chain
- Look for 500/404 errors
- Check which step fails

**Check Appwrite Logs:**
- Appwrite Console → Your Project → Logs
- Look for OAuth errors
- Check authentication attempts

---

**After configuring everything above, restart your backend and try the OAuth flow again!** 🚀

