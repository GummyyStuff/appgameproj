# Testing the New Discord OAuth Authentication System

## 🚀 QUICK START TESTING

### Prerequisites

1. **Appwrite Console Configuration**:
   - Discord OAuth provider enabled with Client ID and Secret
   - Redirect URL: `https://db.juanis.cool/v1/account/sessions/oauth2/callback/discord/redirect`
   - Web platform added with hostname `localhost`

2. **Discord Developer Portal**:
   - OAuth2 redirect URL configured
   - Application has `identify` and `email` scopes

3. **Environment Variables**:
   ```bash
   # Backend .env
   APPWRITE_ENDPOINT=https://db.juanis.cool/v1
   APPWRITE_PROJECT_ID=tarkovcas
   APPWRITE_API_KEY=your-api-key
   APPWRITE_DATABASE_ID=main_db
   STARTING_BALANCE=10000
   
   # Frontend .env
   VITE_APPWRITE_ENDPOINT=https://db.juanis.cool/v1
   VITE_APPWRITE_PROJECT_ID=tarkovcas
   VITE_API_URL=http://localhost:3001/api
   ```

### Start the Application

```bash
# Terminal 1 - Backend
cd packages/backend
bun run dev

# Terminal 2 - Frontend
cd packages/frontend
bun run dev
```

## 📋 TEST CHECKLIST

### 1. Initial Login Test

```
Step 1: Clear Browser Data
- Open DevTools (F12)
- Application tab > Clear site data
- Close and reopen browser (or use incognito)

Step 2: Navigate to Login
- Go to: http://localhost:3000/login
- Should see "Login with Discord" button
- No "Register" button should be visible

Step 3: Initiate OAuth
- Click "Login with Discord"
- Should redirect to Discord OAuth page
- URL should be: discord.com/oauth2/authorize...

Step 4: Authorize
- Authorize the application on Discord
- Should redirect to: http://localhost:3000/

Step 5: Verify Login
- Should be on homepage (not /login)
- Navigation should show username or "User" menu
- No errors in browser console

Expected Console Logs:
✅ "🔍 Checking user session..."
✅ "📱 Found Appwrite client user ID: ..."
✅ "📝 No profile found, creating new user profile..." (first time only)
✅ "✅ User profile created successfully" (first time only)
```

### 2. Session Persistence Test

```
Step 1: Verify Cookies
- DevTools > Application > Cookies
- Should see cookie(s) starting with "a_session_tarkovcas"
- Cookie should be HttpOnly

Step 2: Refresh Page
- Press F5 or Ctrl+R
- Should remain logged in
- No redirect to /login

Step 3: Close and Reopen Browser
- Close browser completely
- Reopen and go to http://localhost:3000
- Should still be logged in (session persists)
```

### 3. Profile Creation Test

```
Step 1: Check Appwrite Console
- Go to: https://db.juanis.cool/console
- Navigate to: Auth > Users
- Should see your Discord user

Step 2: Check Database
- Navigate to: Databases > main_db > users collection
- Should see document with your userId
- Verify fields:
  ✅ userId: matches Auth user ID
  ✅ username: from Discord
  ✅ displayName: from Discord
  ✅ email: from Discord
  ✅ balance: 10000 (or STARTING_BALANCE value)
  ✅ totalWagered: 0
  ✅ totalWon: 0
  ✅ gamesPlayed: 0
  ✅ lastDailyBonus: null
  ✅ isModerator: false
  ✅ avatarPath: Discord avatar or default
  ✅ chatRulesVersion: 1
  ✅ isActive: true
  ✅ createdAt: current timestamp
  ✅ updatedAt: current timestamp
```

### 4. User Profile Page Test

```
Step 1: Navigate to Profile
- Click on user menu
- Click "Profile" or go to /profile
- Should not redirect to login

Step 2: Verify Data Display
- Username should match Discord username
- Balance should show ₽10,000
- Statistics should show 0 games played
- Avatar should attempt to load

Step 3: Check Balance Display
- Look for balance in navigation bar
- Should show ₽10,000
```

### 5. Logout Test

```
Step 1: Click Logout
- Find logout button in navigation/profile
- Click logout

Step 2: Verify Redirect
- Should redirect to /login immediately
- User menu should disappear

Step 3: Verify Session Cleared
- DevTools > Application > Cookies
- Appwrite session cookies should be deleted
- DevTools > Console should show no errors

Step 4: Try Accessing Protected Route
- Try to go to /profile
- Should redirect to /login
```

### 6. Protected Routes Test

```
While Logged Out:
- Try /profile → Should redirect to /login
- Try /roulette → Should redirect to /login
- Try /blackjack → Should redirect to /login
- Try /cases → Should redirect to /login
- Try /history → Should redirect to /login

While Logged In:
- All routes should be accessible
- No redirects to /login
```

### 7. Game Functionality Test

#### Roulette Game
```
Step 1: Navigate to /roulette
- Should load without errors

Step 2: Place a Bet
- Set bet amount (e.g., 100)
- Choose bet type (e.g., Red)
- Click "Place Bet"

Step 3: Verify Game Works
- Wheel should spin
- Result should be displayed
- Balance should update
  - If win: balance increases
  - If lose: balance decreases by bet amount

Backend Console Should Show:
✅ "🔍 Validating user: [userId]"
✅ "✅ User validated: [username]"

Frontend Network Tab:
✅ Request to /api/games/roulette/bet
✅ Headers include: X-Appwrite-User-Id
✅ Response status: 200
```

#### Blackjack Game
```
Step 1: Navigate to /blackjack
- Should load without errors

Step 2: Start Game
- Set bet amount
- Click "Deal"

Step 3: Play Game
- Click "Hit" or "Stand"
- Game should progress
- Balance should update based on result

Verify:
✅ All API calls include X-Appwrite-User-Id header
✅ Game state updates correctly
✅ Balance updates after game completion
```

#### Case Opening Game
```
Step 1: Navigate to /cases
- Should load without errors
- Cases should display with prices

Step 2: Open a Case
- Select a case (e.g., Scav Case - ₽500)
- Click "Open Case"

Step 3: Verify Animation
- Carousel should spin
- Item should be revealed
- Currency should be awarded
- Balance should update

Verify:
✅ API call to /api/games/cases/open includes header
✅ Balance deducted for case price
✅ Currency awarded from item
✅ Net result calculated correctly
```

### 8. Real-Time Features Test

```
Test Chat (if implemented):
- Send a message in chat
- Message should appear
- Verify user is authenticated

Test Presence:
- User should appear as "online"
- Other tabs/windows should see your presence
```

## 🐛 TROUBLESHOOTING

### Issue: "Not authenticated" Error

**Symptoms**: 
- Error message in console
- Redirected to /login
- 401 errors in Network tab

**Check:**
1. Browser console for Appwrite session check errors
2. DevTools > Application > Cookies for Appwrite session cookies
3. Backend console logs for validation errors

**Solutions:**
- Clear browser data and login again
- Verify Appwrite OAuth is configured correctly
- Check that frontend and backend are using same project ID

### Issue: "Failed to fetch/create user profile"

**Symptoms**:
- Can login but get error after redirect
- Backend logs show database errors

**Check:**
1. Appwrite Console > Databases > users collection exists
2. Collection has all required attributes
3. Permissions allow user document creation
4. Backend environment variables are correct

**Solutions:**
- Verify `APPWRITE_DATABASE_ID` in backend .env
- Check Appwrite API key has databases.* permissions
- Review backend console logs for specific error

### Issue: "X-Appwrite-User-Id header missing"

**Symptoms**:
- 401 errors on game API endpoints
- Console shows auth middleware errors

**Check:**
1. Frontend sending header in API calls
2. User object exists in useAuth hook
3. Account.get() succeeds before API call

**Solutions:**
- Verify game pages import and use `useAuth` hook
- Check that API calls include header: `'X-Appwrite-User-Id': user.id`
- Use browser DevTools > Network tab to inspect request headers

### Issue: Balance Not Updating

**Symptoms**:
- Games work but balance doesn't change
- Profile shows incorrect balance

**Check:**
1. Backend logs for database update errors
2. User profile in Appwrite database
3. Balance update endpoint responses

**Solutions:**
- Verify database permissions
- Check backend currency service implementation
- Refresh balance with `refreshBalance()` hook

### Issue: Avatar Not Displaying

**Symptoms**:
- Default avatar shown instead of Discord avatar
- 404 errors for avatar URLs

**Check:**
1. User profile `avatarPath` field in database
2. Discord avatar URL format
3. CORS policy for Discord CDN

**Solutions:**
- Discord avatar might not be in prefs
- May need to implement avatar fetching from Discord API
- For now, default avatar is acceptable

## ✅ SUCCESS CRITERIA

Your auth system is working correctly when:

- ✅ Can login with Discord OAuth
- ✅ Session persists across browser refreshes
- ✅ User profile created automatically with balance = 10000
- ✅ All game pages load without auth errors
- ✅ Can place bets and play games successfully
- ✅ Balance updates correctly after games
- ✅ Can logout and session is cleared
- ✅ Protected routes redirect when not authenticated
- ✅ No console errors related to authentication
- ✅ No 401 errors in Network tab during normal usage

## 📊 MONITORING

### Browser Console Logs to Watch For:

**Good Signs** ✅:
```
🔍 Checking user session...
📱 Found Appwrite client user ID: [id]
✅ User profile found
✅ User validated: [username]
```

**First Login** ✅:
```
📝 No profile found, creating new user profile...
✅ User profile created successfully
```

**Bad Signs** ❌:
```
❌ Error with user profile: ...
❌ User profile not found
Failed to fetch profile
Authentication failed
```

### Backend Console Logs:

**Good Signs** ✅:
```
🔍 Validating user: [userId]
✅ User validated: [username]
```

**Bad Signs** ❌:
```
❌ Error with user profile after retries
❌ User profile not found
Auth middleware error
```

### Network Tab (DevTools):

**Check for**:
- All API requests to `/api/*` include `X-Appwrite-User-Id` header
- Responses are 200 OK (not 401 Unauthorized)
- Session cookies are sent with requests

## 🎯 NEXT STEPS AFTER TESTING

If everything works:

1. **Document the Pattern**:
   - Add auth guidelines to project README
   - Update .cursorrules with auth pattern

2. **Production Deployment**:
   - Update environment variables for production
   - Configure Discord OAuth with production URLs
   - Add production domain to Appwrite platforms

3. **Optional Enhancements**:
   - Implement JWT token auth for better security
   - Add refresh token handling
   - Implement session timeout warnings
   - Add "Remember me" functionality

4. **Clean Up**:
   - Remove unused OAuth functions from backend
   - Remove old migration documentation
   - Archive old auth implementation docs

## 📞 GETTING HELP

If tests fail:

1. **Check all console logs** (browser AND backend)
2. **Review `AUTH_REWRITE_COMPLETE.md`** for usage instructions
3. **Review `AUTH_IMPLEMENTATION_SUMMARY.md`** for what changed
4. **Check Appwrite Console** for user and session data
5. **Verify environment variables** are set correctly

Common issues usually involve:
- Missing environment variables
- OAuth not configured in Appwrite Console
- Discord redirect URL mismatch
- CORS configuration issues
- Database collection/attribute missing

