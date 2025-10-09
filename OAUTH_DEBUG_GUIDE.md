# OAuth Debug Guide

## 🔍 Debugging OAuth Flow

I've added extensive logging to help diagnose the OAuth issue. Here's how to use it:

### Step 1: Restart Backend

```bash
cd /home/juan/appgameproj/packages/backend
# Stop it (Ctrl+C) and restart:
bun run dev
```

### Step 2: Try Logging In

1. Go to https://tarkov.juanis.cool/login
2. Click "Login with Discord"
3. Authorize on Discord
4. Watch what happens

### Step 3: Check Backend Logs

You should see these logs in your terminal:

```
=== Starting OAuth Flow ===
Generated state: <uuid>
Set cookie domain: tarkov.juanis.cool (or none for localhost)
Redirecting to Appwrite OAuth URL: https://db.juanis.cool/v1/account/sessions/oauth2/discord?project=tarkovcas&success=...&failure=...
Success callback: https://tarkov.juanis.cool/api/auth/callback
===========================
```

Then after Discord authorization:

```
=== OAuth Callback Debug ===
Full URL: https://tarkov.juanis.cool/api/auth/callback?userId=...&secret=...&state=...
Query params: { userId: 'xxx', secret: 'present', state: 'xxx' }
Cookie state: <uuid>
All query params: { userId: 'xxx', secret: 'xxx', state: 'xxx' }
IP: <your-ip>
===========================
```

### Step 4: Analyze the Output

#### If you see `error=invalid_request`:

**Backend logs will show:**
```
❌ Missing OAuth parameters!
{ userId: 'MISSING', secret: 'MISSING', allParams: { ... } }
```

**This means:** Appwrite is NOT sending userId and secret in the callback.

**Possible causes:**
1. Success URL format is incorrect
2. Discord OAuth not fully configured in Appwrite
3. Appwrite version compatibility issue

#### If you see `error=invalid_state`:

**Backend logs will show:**
```
❌ State mismatch!
{ received: 'xxx', expected: 'yyy' }
```

**This means:** Cookie isn't being preserved across the OAuth flow.

**Possible causes:**
1. Cookie domain mismatch
2. SameSite attribute issue
3. Secure cookie on HTTP

---

## 🔧 Common Fixes

### Fix 1: Check What Parameters Appwrite Sends

Look at the `All query params` in the logs. Appwrite might be using different parameter names.

**According to Appwrite docs, the callback might include:**
- `userId` and `secret` (standard)
- OR `user` and `secret`
- OR session information in a different format

### Fix 2: Verify Discord OAuth in Appwrite Console

**Appwrite Console → tarkovcas → Auth → Settings → Discord:**

Must have:
- ✅ Enabled (toggle ON)
- ✅ App ID (Discord Client ID)
- ✅ App Secret (Discord Client Secret)  
- ✅ Redirect URI shown: `https://db.juanis.cool/v1/account/sessions/oauth2/callback/discord/tarkovcas`

### Fix 3: Check Discord Developer Portal

**Discord Portal → Your App → OAuth2 → Redirects:**

Must have EXACTLY:
```
https://db.juanis.cool/v1/account/sessions/oauth2/callback/discord/tarkovcas
```

---

## 📋 What to Share

After trying to login, share:

1. **Backend console logs** - Copy the OAuth debug output
2. **Browser URL** after redirect - What error parameter is in the URL?
3. **Appwrite Console** - Screenshot of Discord OAuth settings (hide secrets)

This will help us pinpoint the exact issue!

---

## 🎯 Expected Successful Flow

When working correctly, you'll see:

```
=== Starting OAuth Flow ===
Generated state: abc-123
Redirecting to Appwrite OAuth URL: https://db.juanis.cool/v1/account/sessions/oauth2/discord?...
===========================

[User authorizes on Discord]

=== OAuth Callback Debug ===
Full URL: https://tarkov.juanis.cool/api/auth/callback?userId=xxx&secret=yyy&state=abc-123
Query params: { userId: 'xxx', secret: 'present', state: 'abc-123' }
Cookie state: abc-123
===========================

🔐 Creating Appwrite session...
✅ Session created successfully
```

Then user is redirected to frontend dashboard, logged in!

---

**Try logging in again and share the backend logs!** 🚀

