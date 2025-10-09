# Next Steps - Quick Checklist

## ✅ Already Done

- [x] Database created and populated
- [x] All backend services migrated
- [x] All routes updated
- [x] New frontend hooks created
- [x] Documentation complete

## 🚀 Execute These Steps (In Order)

### Step 1: Rename New Hooks (2 minutes)

```bash
cd /home/juan/appgameproj/packages/frontend/src/hooks
mv useChatRealtime.ts useChatRealtime-old.ts
mv useChatRealtime-new.ts useChatRealtime.ts
```

**Why:** Components import `useChatRealtime`, so renaming activates the new Appwrite version.

---

### Step 2: Ensure Frontend Environment Variables (1 minute)

Create or verify `packages/frontend/.env`:

```bash
cat > /home/juan/appgameproj/packages/frontend/.env << 'EOF'
VITE_APPWRITE_ENDPOINT=https://db.juanis.cool/v1
VITE_APPWRITE_PROJECT_ID=tarkovcas
VITE_APPWRITE_DATABASE_ID=main_db
VITE_API_URL=http://localhost:3001
EOF
```

---

### Step 3: Test Backend (5 minutes)

```bash
cd /home/juan/appgameproj/packages/backend
bun run dev
```

**Expected:** Server starts on port 3001 without errors

**Test:**
```bash
# In another terminal:
curl http://localhost:3001/api
# Should return API info with all endpoints
```

---

### Step 4: Test Frontend (10 minutes)

```bash
cd /home/juan/appgameproj/packages/frontend
bun run dev
```

**Expected:** Frontend starts on port 3000/5173 without errors

**Browser Test:**
1. Open http://localhost:3000
2. Click "Login with Discord"
3. Authorize
4. Check dashboard loads
5. Verify balance shows 10,000

---

### Step 5: Test Case Opening (5 minutes)

1. Navigate to cases page
2. Select "Starter Case" (500 cost)
3. Click "Open Case"
4. **Expected:**
   - Balance decreases by 500
   - Item won displays
   - Currency awarded added to balance
   - Net change shows correctly

**If it works:** ✅ Core functionality is working!

---

### Step 6: Test Chat (5 minutes)

1. Open chat sidebar
2. Type a message
3. Send message
4. **Expected:**
   - Message appears immediately (optimistic)
   - Message persists after refresh

**Multi-User Test:**
1. Open incognito browser
2. Login with different Discord account (or same)
3. Send message from browser 1
4. **Expected:** Message appears in browser 2 in realtime

**If it works:** ✅ Realtime is working!

---

### Step 7: Test Daily Bonus (2 minutes)

1. Navigate to daily bonus section (or API call)
2. Claim bonus
3. **Expected:**
   - Balance increases by 1,000
   - Cannot claim again today
   - Next claim time shown

---

### Step 8: Verify Data in Appwrite Console (5 minutes)

1. Open https://db.juanis.cool
2. Navigate to `main_db` database
3. Check collections:
   - ✅ users - Should have your user profile
   - ✅ game_history - Should have game records
   - ✅ chat_messages - Should have your chat messages
   - ✅ chat_presence - Should have your presence
   - ✅ daily_bonuses - Should have bonus claim if you claimed

---

## 🐛 If Something Doesn't Work

### Check Backend Logs
Look for errors in the terminal where `bun run dev` is running

### Check Frontend Console
Press F12 → Console tab → Look for errors

### Common Issues:

**"User profile not found"**
- User wasn't created on first login
- Need to create profile manually or fix createUserProfile logic

**"Collection not found"**
- Collections weren't created properly
- Run create-collections.ts again

**"Balance not updating"**
- Check Appwrite Realtime is enabled
- Check subscription is active (console logs)

**"Chat not working"**
- Verify useChatRealtime hook was renamed
- Check chat routes are registered
- Check Appwrite Realtime subscriptions

---

## ✅ Success Checkpoints

After each test, mark it complete:

- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Login with Discord works
- [ ] Profile displays correctly
- [ ] Balance shows 10,000 initially
- [ ] Can open a case
- [ ] Balance updates after case opening
- [ ] Can send chat message
- [ ] Chat message appears in realtime (multi-browser)
- [ ] Online presence updates
- [ ] Daily bonus can be claimed
- [ ] Game history displays
- [ ] Statistics show correctly

**When all checkpoints pass:** Migration is SUCCESS! ✅

---

## 🎯 After Everything Works

### Final Cleanup

```bash
# Backend - remove old services
cd /home/juan/appgameproj/packages/backend/src/services
rm database.ts currency.ts case-opening.ts realtime-supabase.ts

# Backend - rename new services
mv currency-new.ts currency.ts
mv case-opening-appwrite.ts case-opening.ts

# Backend - remove old config
rm ../config/supabase.ts

# Frontend - remove old files
cd /home/juan/appgameproj/packages/frontend/src
rm lib/supabase.ts
rm hooks/useSupabaseRealtime.ts hooks/useChatRealtime-old.ts

# Remove dependencies
cd /home/juan/appgameproj/packages/backend
bun remove @supabase/supabase-js

cd /home/juan/appgameproj/packages/frontend
bun remove @supabase/supabase-js

# Delete SQL migrations
cd /home/juan/appgameproj
rm -rf packages/backend/src/database/migrations/
```

---

## 🎊 Celebration Time!

Once everything works and is cleaned up:

✅ **You've successfully migrated from Supabase to self-hosted Appwrite!**

**What you've gained:**
- Full control over your infrastructure
- Modern NoSQL architecture
- TypeScript business logic (no SQL)
- Real-time capabilities
- Better type safety
- Comprehensive documentation

---

**Start with Step 1 and work through the checklist. Good luck!** 🚀

