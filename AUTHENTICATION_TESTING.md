# Authentication Testing Guide

## Quick Start

After setting up Discord OAuth (see `DISCORD_OAUTH_SETUP.md`), follow these steps to test:

### 1. Start the Application

```bash
# Terminal 1 - Backend
cd packages/backend
bun run dev

# Terminal 2 - Frontend
cd packages/frontend
bun run dev
```

### 2. Manual Testing Checklist

#### Test 1: Login Flow
1. Navigate to `http://localhost:3000/login`
2. Click "Login with Discord"
3. Authorize on Discord consent screen
4. ✅ Should redirect to `/dashboard`
5. ✅ Should see your Discord username/avatar

#### Test 2: Session Persistence
1. While logged in, refresh the page
2. ✅ Should remain logged in
3. Close browser and reopen
4. ✅ Should still be logged in (within 7 days)

#### Test 3: Protected Routes
1. While logged out, try to access:
   - `http://localhost:3000/profile`
   - `http://localhost:3000/roulette`
   - `http://localhost:3000/cases`
2. ✅ Should redirect to `/login`
3. Log in via Discord
4. ✅ Should redirect back to the original page

#### Test 4: Logout Flow
1. While logged in, click logout button
2. ✅ Should redirect to home page
3. Try to access protected routes
4. ✅ Should redirect to `/login`

#### Test 5: Register Flow
1. Navigate to `http://localhost:3000/register`
2. Click "Sign up with Discord"
3. ✅ Should work the same as login
4. First-time users are automatically registered

### 3. Browser Console Testing

The application includes auth test helpers in development mode. Open browser console and run:

```javascript
// Check current authentication status
authTests.checkAuthStatus()

// List all active sessions
authTests.listAllSessions()

// Get user preferences
authTests.getUserPreferences()

// Run all tests
authTests.runAllAuthTests()

// Test logout (warning: will log you out!)
authTests.testLogout()

// Test session persistence (will reload page)
authTests.testSessionPersistence()
```

### 4. Expected Console Output

When logged in successfully:
```
✅ User is authenticated
Session: {
  id: "...",
  expires: "2025-10-16T...",
  provider: "discord"
}
User: {
  id: "...",
  name: "YourDiscordUsername",
  email: "your@email.com"
}
```

When not logged in:
```
❌ User is not authenticated
```

### 5. Network Testing

#### Check Backend Endpoints

```bash
# Test auth status (should return 401 if not logged in)
curl -X GET http://localhost:3001/api/auth/me \
  --cookie "appwrite-session=your-session-id"

# Test logout
curl -X POST http://localhost:3001/api/auth/logout \
  --cookie "appwrite-session=your-session-id"
```

### 6. Common Issues and Solutions

#### Issue: "Invalid Redirect URI"
**Solution**: 
- Check Discord Developer Portal redirect URI exactly matches:
  `https://db.juanis.cool/v1/account/sessions/oauth2/callback/discord/redirect`

#### Issue: "Session not found"
**Solution**:
- Clear browser cookies
- Check `VITE_APPWRITE_ENDPOINT` and `VITE_APPWRITE_PROJECT_ID` are set correctly
- Verify Appwrite instance is running

#### Issue: "CORS error"
**Solution**:
- Add `http://localhost:3000` to Appwrite platforms:
  - Appwrite Console → Settings → Platforms → Add Web Platform
- Make sure `FRONTEND_URL` in backend `.env` is correct

#### Issue: Infinite redirect loop
**Solution**:
- Clear browser cookies and cache
- Check that both frontend and backend are using the same Appwrite project
- Verify OAuth redirect URI in Discord matches exactly

#### Issue: Session not persisting
**Solution**:
- Check browser allows cookies
- Verify cookies are being set (check DevTools → Application → Cookies)
- Make sure `SameSite` cookie attribute is compatible with your setup

### 7. Testing in Production

When testing in production environment:

1. Update Discord OAuth redirect URI to production domain
2. Update environment variables to production values
3. Verify HTTPS is enabled everywhere
4. Test with different browsers
5. Test with incognito/private mode
6. Test with different Discord accounts

### 8. Automated Testing (Future)

To be implemented:
```bash
# Run auth integration tests
bun test packages/frontend/src/hooks/__tests__/useAuth.test.ts

# Run e2e auth tests
bun test packages/frontend/src/test-utils/e2e-tests.test.ts
```

### 9. Monitoring

After deployment, monitor:
- Failed login attempts (Appwrite Console → Auth → Sessions)
- Session duration and expiration patterns
- OAuth errors in Appwrite logs
- Frontend console errors
- Backend server logs

### 10. Success Criteria

✅ All tests pass
✅ No console errors
✅ Sessions persist correctly
✅ Protected routes work
✅ Logout clears session completely
✅ Can log back in after logout
✅ Works across page reloads
✅ Works after closing and reopening browser (within 7 days)

## Troubleshooting Resources

- [Appwrite Discord OAuth Docs](https://appwrite.io/docs/products/auth/oauth2#discord)
- [Appwrite Sessions Docs](https://appwrite.io/docs/products/auth/sessions)
- [Discord OAuth2 Docs](https://discord.com/developers/docs/topics/oauth2)

## Need Help?

If tests fail:
1. Check all environment variables are set correctly
2. Verify Discord OAuth app configuration
3. Check Appwrite console logs
4. Review browser console for errors
5. Check network tab for failed requests
6. Verify cookies are being set and sent

