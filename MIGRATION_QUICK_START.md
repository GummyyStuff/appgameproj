# Appwrite Migration - Quick Start Guide

## 🎉 Migration Complete!

The Supabase to Appwrite migration is **COMPLETE**. All services, hooks, and components have been migrated.

---

## ✅ What's Done

- ✅ Database: 9 collections created and seeded
- ✅ Backend: All services migrated to Appwrite
- ✅ Frontend: All realtime hooks migrated
- ✅ Dependencies: Supabase packages removed
- ✅ Data: 4 cases, 20 items, 35 pool entries seeded

---

## 🚀 Quick Start

### 1. Verify Appwrite is Running

```bash
curl https://db.juanis.cool/v1/health
```

Should return: `{"status":"ok",...}`

### 2. Start the Application

**Terminal 1 - Backend:**
```bash
cd /home/juan/appgameproj/packages/backend
bun run dev
```

**Terminal 2 - Frontend:**
```bash
cd /home/juan/appgameproj/packages/frontend
bun run dev
```

### 3. Test Core Features

#### Authentication
- Navigate to http://localhost:3000
- Click "Login with Discord"
- Verify successful authentication

#### Case Opening
- Navigate to "Cases" page
- Try opening a case
- Verify balance updates

#### Chat
- Send a chat message
- Verify realtime message appears
- Check online user count

#### Games
- Play a Roulette round
- Play a Blackjack hand
- Verify balance updates in realtime

---

## 📁 Key Files

### Backend Services (Appwrite)
```
packages/backend/src/
├── services/
│   ├── appwrite-database.ts       # Database service layer
│   ├── user-service.ts            # User operations
│   ├── game-service.ts            # Game history
│   ├── currency-new.ts            # Currency transactions
│   ├── chat-service.ts            # Chat operations
│   ├── audit-service.ts           # Audit logging
│   ├── case-opening-appwrite.ts   # Case opening
│   └── statistics-appwrite.ts     # Statistics (NEW!)
├── routes/
│   ├── auth.ts                    # Auth routes
│   ├── user.ts                    # User endpoints
│   ├── games.ts                   # Game endpoints
│   ├── chat.ts                    # Chat endpoints
│   └── statistics.ts              # Stats (updated!)
└── config/
    ├── appwrite.ts                # Appwrite client
    └── collections.ts             # Collection definitions
```

### Frontend Services (Appwrite)
```
packages/frontend/src/
├── services/
│   └── appwrite-realtime.ts       # Realtime subscriptions
├── hooks/
│   ├── useChatRealtime.ts         # Chat realtime
│   ├── useGameRealtime.ts         # Game realtime
│   └── usePresence.ts             # Online users
└── lib/
    └── appwrite.ts                # Appwrite client
```

---

## 🔧 Environment Variables

### Backend (.env)
```env
APPWRITE_ENDPOINT=https://db.juanis.cool/v1
APPWRITE_PROJECT_ID=tarkovcas
APPWRITE_API_KEY=your-api-key
APPWRITE_DATABASE_ID=main_db
FRONTEND_URL=https://tarkov.juanis.cool
PORT=3001
```

### Frontend (.env)
```env
VITE_APPWRITE_ENDPOINT=https://db.juanis.cool/v1
VITE_APPWRITE_PROJECT_ID=tarkovcas
VITE_APPWRITE_DATABASE_ID=main_db
VITE_API_URL=http://localhost:3001
```

---

## 📊 Database Status

### Collections (9)
All created with proper attributes and indexes:

1. ✅ **users** - User profiles (starting balance: 10,000)
2. ✅ **game_history** - Game records
3. ✅ **daily_bonuses** - Daily bonus claims
4. ✅ **case_types** - 4 cases seeded
5. ✅ **tarkov_items** - 20 items seeded
6. ✅ **case_item_pools** - 35 pools seeded
7. ✅ **chat_messages** - Chat messages
8. ✅ **chat_presence** - Online users
9. ✅ **audit_logs** - Audit trail

### Seeded Data

**Cases:**
- Starter Case (500 coins)
- Military Case (1,000 coins)
- Premium Case (2,500 coins)
- Legendary Case (5,000 coins)

**Items:** 20 Tarkov items across 5 rarities
**Pools:** 35 case-to-item mappings with weights

---

## 🧪 Testing Checklist

### Manual Testing Required

- [ ] **Login:** Discord OAuth authentication
- [ ] **Profile:** View and update profile
- [ ] **Balance:** Check balance display
- [ ] **Daily Bonus:** Claim daily bonus
- [ ] **Roulette:** Play and verify balance update
- [ ] **Blackjack:** Play and verify balance update
- [ ] **Case Opening:** Open case and verify rewards
- [ ] **Chat:** Send message and verify realtime
- [ ] **Presence:** Check online user count
- [ ] **Game History:** View game history
- [ ] **Statistics:** View statistics dashboard
- [ ] **Realtime:** Verify all realtime updates work

---

## 🐛 Troubleshooting

### Connection Issues

**Problem:** Cannot connect to Appwrite
```bash
# Check Appwrite health
curl https://db.juanis.cool/v1/health

# Check environment variables
echo $APPWRITE_ENDPOINT
```

**Solution:** Verify Appwrite server is running and endpoint is correct

### Authentication Errors

**Problem:** "Session validation failed"
```bash
# Clear cookies
# Re-login with Discord
```

**Solution:** Clear browser cookies and re-authenticate

### Database Errors

**Problem:** "Collection not found"
```bash
# Verify collections exist
# Re-run collection creation if needed
bun run packages/backend/src/scripts/create-collections.ts
```

**Solution:** Collections may need to be recreated

### Balance Not Updating

**Problem:** Balance doesn't update after game
```bash
# Check browser console for errors
# Check backend logs
# Verify realtime subscription is active
```

**Solution:** Check realtime connection and backend logs

---

## 📚 Documentation

- **Full Migration Details:** See `MIGRATION_COMPLETED.md`
- **Migration Plan:** See `.cursor/plans/supabase-to-appwrite-migration-*.plan.md`
- **Appwrite Docs:** https://appwrite.io/docs
- **Collection Schema:** See `packages/backend/src/config/collections.ts`

---

## 🚨 Important Notes

### Application-Level Transactions

Since Appwrite doesn't have native multi-document transactions, we handle them at the application level:

```typescript
// Example: Case Opening Transaction
1. Check balance
2. Deduct cost
3. Add winnings
4. Update stats
5. Record history

// If any step fails, handle rollback in application
```

### JSON Storage

Complex objects are stored as JSON strings:
- Game results: `resultData` field
- Case rarity distribution: `rarityDistribution` field
- Audit metadata: `details` field

Parse them in your application code.

### Composite Keys

For unique constraints across multiple fields:
- Daily bonuses: `userBonusKey = ${userId}_${date}`
- Case pools: `caseItemKey = ${caseTypeId}_${itemId}`

---

## 🎯 Next Steps

1. **Manual Testing:** Test all features listed above
2. **Monitor Logs:** Watch for any errors during testing
3. **Performance:** Monitor query performance
4. **Error Handling:** Test edge cases and error scenarios
5. **Load Testing:** Test with multiple concurrent users
6. **Deployment:** Deploy to production when ready

---

## ✨ Success Criteria

- [x] All Supabase dependencies removed
- [x] All services migrated to Appwrite
- [x] Collections created and seeded
- [ ] Manual testing passed
- [ ] No critical errors in logs
- [ ] Realtime features working
- [ ] Performance acceptable
- [ ] Ready for production

---

## 📞 Support

If you encounter any issues:

1. Check the logs (browser console + backend terminal)
2. Verify Appwrite is running and accessible
3. Check environment variables
4. Review the migration documentation
5. Test in isolation (one feature at a time)

---

**Migration Completed:** October 10, 2025  
**Status:** ✅ Ready for Testing  
**Next Action:** Manual testing of all features

