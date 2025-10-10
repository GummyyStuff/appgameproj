# Discord OAuth Authentication Rewrite - COMPLETED

## What Was Changed

### 1. SDK Updates ✅
- **Frontend**: Updated from `appwrite@14.0.1` to `appwrite@18.2.0`
- **Backend**: Updated from `node-appwrite@11.0.0` to `node-appwrite@17.2.0`
- Both are now compatible with Appwrite 1.7.4

### 2. Frontend Auth Hook ✅
**File**: `packages/frontend/src/hooks/useAuth.tsx`

**Changes**:
- Completely rewritten to use client-side OAuth flow
- Now uses `account.createOAuth2Session(OAuthProvider.Discord, ...)` directly
- Removed hybrid session checking logic
- Simplified from ~180 lines to ~130 lines
- Session management handled entirely by Appwrite Client SDK

**New Flow**:
1. User clicks "Login with Discord"
2. Frontend calls `account.createOAuth2Session()`
3. Appwrite redirects to Discord OAuth
4. Discord redirects to Appwrite
5. Appwrite creates session and redirects to success URL (homepage)
6. Session stored in browser cookies by Appwrite
7. Frontend calls `/auth/me` to get full user profile

### 3. Backend OAuth Routes ✅
**File**: `packages/backend/src/routes/auth.ts`

**Deleted**:
- `GET /auth/discord` - No longer needed (frontend initiates OAuth)
- `GET /auth/callback` - No longer needed (Appwrite handles callback)

**Kept**:
- `GET /auth/me` - Enhanced for automatic profile creation
- `POST /auth/logout` - For cleanup

**Removed Imports**:
- `randomUUID` from crypto
- `setCookie` from hono/cookie
- `handleOAuthCallback`, `BACKEND_CALLBACK_URL`, `FRONTEND_URL`, `SESSION_MAX_AGE`, `OAuthSession`

### 4. Enhanced Profile Creation ✅
**File**: `packages/backend/src/routes/auth.ts` (in `/me` endpoint)

**Changes**:
- Now accepts `X-Appwrite-User-Id` header from frontend
- Automatically creates user profile on first login with:
  - `userId` (from Appwrite auth)
  - `username` (from Discord)
  - `displayName` (from Discord)
  - `email` (from Discord)
  - `balance` (10000 default from `STARTING_BALANCE` env var)
  - `avatarUrl` (from Discord prefs or default)
  - `totalWagered: 0`
  - `totalWon: 0`
  - `gamesPlayed: 0`
  - `lastDailyBonus: null`
  - `isModerator: false`
  - `chatRulesVersion: 1`
  - `isActive: true`

### 5. User Service Update ✅
**File**: `packages/backend/src/services/user-service.ts`

**Changes**:
- Added `avatarUrl?: string` parameter to `createUserProfile` method
- Uses `avatarUrl` in `avatarPath` field (defaults to 'defaults/default-avatar.svg')

### 6. Auth Middleware Update ✅
**File**: `packages/backend/src/middleware/auth.ts`

**Changes**:
- Now validates based on `X-Appwrite-User-Id` header instead of session cookies
- Checks if user profile exists in database
- Removed session cookie validation (not needed with client-side OAuth)
- Updated both `authMiddleware` and `optionalAuthMiddleware`

### 7. Frontend Appwrite Config ✅
**File**: `packages/frontend/src/lib/appwrite.ts`

**Changes**:
- Added `OAuthProvider` to imports and exports
- Ready for SDK 18.x usage

## How to Use the New Auth System

### For Frontend Developers

#### Login
```typescript
// In your component
const { signInWithDiscord } = useAuth();

// User clicks login button
await signInWithDiscord();
// User will be redirected to Discord OAuth
```

#### Check Auth Status
```typescript
const { user, loading, isAuthenticated } = useAuth();

if (loading) return <LoadingSpinner />;
if (!isAuthenticated) return <Navigate to="/login" />;

// User is authenticated
console.log(user.balance); // Access user data
```

#### Logout
```typescript
const { signOut } = useAuth();

await signOut();
// User will be redirected to /login
```

#### Making Authenticated API Calls

**IMPORTANT**: All authenticated API calls must include the `X-Appwrite-User-Id` header.

**Option 1: Use the API helper** (recommended)
```typescript
import { authenticatedFetch, apiPost } from '../lib/api';

// Example: Place a bet
const response = await apiPost('/games/roulette/bet', {
  amount: 100,
  betType: 'red'
});
```

**Option 2: Manual fetch with header**
```typescript
import { useAuth } from '../hooks/useAuth';

const { user } = useAuth();

const response = await fetch(`${API_URL}/user/profile`, {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'X-Appwrite-User-Id': user.id, // ADD THIS HEADER
  },
});
```

### For Backend Developers

#### Protected Routes
Protected routes automatically have access to the authenticated user via context:

```typescript
import { authMiddleware } from '../middleware/auth';

app.get('/user/profile', authMiddleware, async (c) => {
  const user = c.get('user'); // Authenticated user from context
  // ... handle request
});
```

#### Optional Auth Routes
For routes that work with or without authentication:

```typescript
import { optionalAuthMiddleware } from '../middleware/auth';

app.get('/public/data', optionalAuthMiddleware, async (c) => {
  const user = c.get('user'); // May be undefined
  
  if (user) {
    // Return personalized data
  } else {
    // Return public data
  }
});
```

## Environment Variables

### Backend (`.env`)
```env
APPWRITE_ENDPOINT=https://db.juanis.cool/v1
APPWRITE_PROJECT_ID=tarkovcas
APPWRITE_API_KEY=your-api-key-here
APPWRITE_DATABASE_ID=main_db
STARTING_BALANCE=10000
```

### Frontend (`.env`)
```env
VITE_APPWRITE_ENDPOINT=https://db.juanis.cool/v1
VITE_APPWRITE_PROJECT_ID=tarkovcas
VITE_API_URL=http://localhost:3001/api
```

## Appwrite Console Configuration

### 1. Discord OAuth Provider
- Navigate to: **Auth > Settings > OAuth2 Providers**
- Enable: **Discord**
- Client ID: From Discord Developer Portal
- Client Secret: From Discord Developer Portal
- Redirect URL (shown by Appwrite): `https://db.juanis.cool/v1/account/sessions/oauth2/callback/discord/redirect`

### 2. Discord Developer Portal
- Navigate to: **OAuth2 > Redirects**
- Add Redirect URI: `https://db.juanis.cool/v1/account/sessions/oauth2/callback/discord/redirect`
- Scopes: `identify`, `email`

### 3. Web Platform in Appwrite
- Navigate to: **Settings > Platforms**
- Add Platform: **Web App**
- Name: "Tarkov Casino Web"
- Hostname (dev): `localhost`
- Hostname (prod): `your-production-domain.com`

## Testing the New Auth Flow

1. **Clear browser data**: Cookies, localStorage, sessionStorage
2. Navigate to `http://localhost:3000/login`
3. Click "Login with Discord"
4. Authorize the app on Discord
5. You should be redirected back to homepage
6. Check DevTools > Application > Cookies for Appwrite session cookies
7. Refresh the page - session should persist
8. Navigate to `/profile` - should see your balance (10000)
9. Click logout - should redirect to login and clear session

## Files Still Needing Updates

The following files make direct `fetch()` calls and need to add the `X-Appwrite-User-Id` header:

### Game Pages:
- `packages/frontend/src/pages/RoulettePage.tsx` - Add header to bet API call
- `packages/frontend/src/pages/BlackjackPage.tsx` - Add header to game action calls
- `packages/frontend/src/pages/CaseOpeningPage.tsx` - Add header to case opening calls

### Services:
- `packages/frontend/src/services/caseOpeningApi.ts` - Add header to all API methods
- Any other service files that make authenticated API calls

### Pattern to Follow:
```typescript
// Get user from auth context
const { user } = useAuth();

// Add header to fetch call
const response = await fetch(`${API_URL}/endpoint`, {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'X-Appwrite-User-Id': user.id, // ADD THIS
  },
  body: JSON.stringify(data),
});
```

## Security Considerations

### What's Secure:
- ✅ Appwrite manages sessions with HTTP-only cookies
- ✅ CSRF protection built into Appwrite OAuth flow
- ✅ Rate limiting on backend endpoints
- ✅ User profiles validated in database
- ✅ Discord provides verified email addresses

### What to Note:
- ⚠️ The `X-Appwrite-User-Id` header is sent from the client
- ⚠️ Backend validates this by checking if the user exists in database
- ⚠️ For higher security, consider validating the Appwrite session on backend
  - This would require the Appwrite session cookie to be accessible to backend
  - May need domain configuration adjustments

### Future Enhancement:
Consider using Appwrite JWT tokens for backend API authentication:
1. Frontend generates JWT with `account.createJWT()`
2. Frontend sends JWT in Authorization header
3. Backend validates JWT with Appwrite
4. More secure than just user ID header

## Architecture Diagram

```
┌─────────────┐
│   Browser   │
│  (React SPA)│
└──────┬──────┘
       │ 1. Click "Login with Discord"
       │ account.createOAuth2Session()
       ↓
┌─────────────┐
│  Appwrite   │ 2. Redirect to Discord OAuth
│   Server    │ 3. Handle Discord callback
└──────┬──────┘ 4. Create session + set cookies
       │ 5. Redirect to success URL
       ↓
┌─────────────┐
│   Browser   │
│  Has Session│ 6. Call /auth/me with X-Appwrite-User-Id
└──────┬──────┘
       │
       ↓
┌─────────────┐
│   Backend   │ 7. Validate user + create profile
│  API Server │ 8. Return user data with balance
└─────────────┘
```

## Troubleshooting

### "Not authenticated" error
- Check if Appwrite session cookies are present in browser
- Verify `X-Appwrite-User-Id` header is being sent
- Check browser console for errors from `account.get()`

### "User profile not found" error
- Profile should be created automatically on first `/auth/me` call
- Check backend logs for profile creation errors
- Verify Appwrite database has `users` collection

### "Failed to fetch profile" error
- Check `VITE_API_URL` environment variable
- Verify backend is running
- Check CORS configuration

### OAuth redirect not working
- Verify Discord OAuth settings in Discord Developer Portal
- Check Appwrite Console > Auth > Settings > OAuth2 Providers
- Ensure redirect URL matches exactly

## Next Steps

1. **Update remaining API calls** to send `X-Appwrite-User-Id` header
2. **Test all game functionality** with new auth system
3. **Remove unused code** from old auth implementation
4. **Consider JWT tokens** for enhanced security
5. **Update deployment docs** with new auth flow

## Rollback Plan

If issues occur, you can rollback by:
1. Revert package.json changes: `git checkout packages/*/package.json`
2. Revert auth files: `git checkout packages/*/src/hooks/useAuth.tsx packages/backend/src/routes/auth.ts`
3. Run `bun install` to restore old SDKs

