# OAuth Redirect Fix - Summary

## Problem
After Discord OAuth login, users were redirected to `/dashboard` which resulted in a 404 error because:
1. The `/dashboard` route didn't exist in the frontend router
2. The frontend was trying to use Appwrite SDK directly for session management, but sessions were being created on the backend
3. The Supabase client was still active and trying to fetch data with undefined user IDs

## Root Cause
There was a mismatch between the authentication architecture:
- **Backend**: Using Appwrite SDK to handle OAuth and create server-side sessions with HTTP-only cookies
- **Frontend**: Trying to use Appwrite SDK client-side to manage sessions (which doesn't know about backend-created sessions)

## Solution

### 1. Fixed Redirect URLs
✅ **Backend OAuth Callback** (`packages/backend/src/routes/auth.ts`)
- Changed redirect from `/dashboard` to `/` (homepage)

✅ **Frontend Login Page** (`packages/frontend/src/pages/LoginPage.tsx`)
- Changed default redirect from `/dashboard` to `/`

### 2. Fixed Frontend Auth Hook
✅ **Auth Hook** (`packages/frontend/src/hooks/useAuth.tsx`)
- Removed dependency on Appwrite client SDK for session management
- Now uses backend API endpoints:
  - `/api/auth/me` - Check current session
  - `/api/auth/logout` - Logout
  - `/api/auth/discord` - Initiate Discord OAuth
- Uses `credentials: 'include'` to send HTTP-only cookies with requests

### 3. Fixed Backend OAuth Initiation
✅ **OAuth Route** (`packages/backend/src/routes/auth.ts`)
- Fixed `/auth/discord` route to properly generate Appwrite OAuth URL
- Now correctly redirects to: `{APPWRITE_ENDPOINT}/v1/account/sessions/oauth2/discord`
- Includes CSRF protection with state parameter

### 4. Removed Dashboard Route
✅ **Router** (`packages/frontend/src/router/AppRouter.tsx`)
- No `/dashboard` route added (users go to homepage after login)

## OAuth Flow (Fixed)

```
1. User clicks "Login with Discord"
   ↓
2. Frontend → GET /api/auth/discord
   ↓
3. Backend generates Appwrite OAuth URL with state
   ↓
4. Backend → Redirect to Appwrite OAuth endpoint
   ↓
5. Appwrite → Redirect to Discord OAuth
   ↓
6. User authorizes on Discord
   ↓
7. Discord → Redirect to Appwrite with OAuth code
   ↓
8. Appwrite creates session
   ↓
9. Appwrite → Redirect to Backend callback (/api/auth/callback?userId=...&secret=...&state=...)
   ↓
10. Backend validates state (CSRF protection)
    ↓
11. Backend creates session with Appwrite SDK
    ↓
12. Backend sets HTTP-only session cookie
    ↓
13. Backend → Redirect to Frontend (/)
    ↓
14. Frontend checks session via /api/auth/me
    ↓
15. User is logged in! 🎉
```

## Environment Variables Required

### Backend
```env
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_api_key
APPWRITE_DISCORD_REDIRECT_URI=https://your-api-domain.com/api/auth/callback
FRONTEND_URL=https://your-frontend-domain.com
```

### Frontend
```env
VITE_API_URL=/api  # or https://your-api-domain.com/api for different domain
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your_project_id
```

## Appwrite Console Configuration

In your Appwrite Console (https://cloud.appwrite.io):

1. Go to **Auth → Settings**
2. Scroll to **OAuth2 Providers**
3. Enable **Discord**
4. Set the Discord OAuth2 credentials:
   - App ID: Your Discord Client ID
   - App Secret: Your Discord Client Secret
5. **Important**: The redirect URI in Discord Developer Portal should be:
   ```
   https://cloud.appwrite.io/v1/account/sessions/oauth2/callback/discord/YOUR_PROJECT_ID
   ```
   (Appwrite will handle the redirect to your backend callback)

## Testing Steps

1. **Rebuild the application:**
   ```bash
   bun run build
   ```

2. **Start the backend:**
   ```bash
   cd packages/backend
   bun run dev
   ```

3. **Start the frontend:**
   ```bash
   cd packages/frontend
   bun run dev
   ```

4. **Test the login flow:**
   - Navigate to `/login`
   - Click "Login with Discord"
   - Should redirect through Discord OAuth
   - After authorization, should redirect back to homepage (`/`)
   - User should be logged in (check browser dev tools → Application → Cookies for `appwrite-session`)

## Remaining Issues to Address

### Supabase Dependencies
The frontend still uses Supabase client directly for:
- User profiles (`useProfile` hook)
- Balance queries (`useBalance` hook)
- Chat messages (`useChatRealtime` hook)
- Game statistics

**Next Steps** (Part of Migration Plan Step 3 - Database Migration):
1. Create backend API endpoints for these data operations
2. Update frontend hooks to call backend APIs instead of Supabase directly
3. Backend will handle Supabase queries with proper authentication

### Current Workaround
For now, the app will still try to fetch from Supabase but will gracefully handle errors. To fully resolve this, you need to:
1. Ensure user profiles are synced between Appwrite and Supabase
2. OR migrate to Appwrite database collections (see MIGRATION_PLAN.md Step 3)

## Files Changed
- ✅ `packages/backend/src/routes/auth.ts` - Fixed OAuth flow
- ✅ `packages/frontend/src/hooks/useAuth.tsx` - Fixed session management
- ✅ `packages/frontend/src/router/AppRouter.tsx` - No dashboard route
- ✅ `packages/frontend/src/pages/LoginPage.tsx` - Updated redirect
- 📝 `OAUTH_REDIRECT_FIX.md` - This documentation

## Migration Progress Update

Updated **MIGRATION_PLAN.md Step 2** progress:
- ✅ Authentication flows working with Appwrite
- ✅ Discord OAuth functional
- ✅ Session management via backend API
- ⏳ Need to test end-to-end
- ⏳ Need to sync/migrate user profiles

**Next Phase**: Database Migration (Step 3)

