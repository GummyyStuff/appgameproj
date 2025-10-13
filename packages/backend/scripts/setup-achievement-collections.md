# Achievement Collections Setup Guide

## Quick Setup Using Appwrite Console

You need to create 2 collections in your Appwrite Console. Follow these steps:

### Step 1: Create `achievement_definitions` Collection

1. Go to Appwrite Console → Databases → Your Database
2. Click "Create Collection"
3. **Collection ID**: `achievement_definitions`
4. **Name**: "Achievement Definitions"
5. Click "Create"

#### Add Attributes:

1. **achievementId** (String, 64 chars, Required, Unique)
   - Click "Add Attribute" → String
   - Key: `achievementId`
   - Size: 64
   - Required: ✓
   - Array: ✗
   - Default: (none)

2. **title** (String, 128 chars, Required)
   - Key: `title`
   - Size: 128
   - Required: ✓

3. **description** (String, 512 chars, Required)
   - Key: `description`
   - Size: 512
   - Required: ✓

4. **category** (Enum, Required)
   - Key: `category`
   - Elements: `gameplay,progression,special,social`
   - Required: ✓

5. **rarity** (Enum, Required)
   - Key: `rarity`
   - Elements: `common,rare,epic,legendary`
   - Required: ✓

6. **maxProgress** (Integer, Required)
   - Key: `maxProgress`
   - Required: ✓

7. **rewardType** (Enum, Required)
   - Key: `rewardType`
   - Elements: `currency,title,cosmetic`
   - Required: ✓

8. **rewardAmount** (Integer, Optional)
   - Key: `rewardAmount`
   - Required: ✗

9. **rewardItem** (String, 128 chars, Optional)
   - Key: `rewardItem`
   - Size: 128
   - Required: ✗

10. **isActive** (Boolean, Required, Default: true)
    - Key: `isActive`
    - Required: ✓
    - Default: true

11. **createdAt** (DateTime, Required)
    - Key: `createdAt`
    - Required: ✓

#### Create Indexes:

1. **achievementId Index** (Unique)
   - Click "Create Index"
   - Key: `idx_achievementId`
   - Type: Unique
   - Attributes: `achievementId` (ASC)

2. **isActive Index**
   - Key: `idx_isActive`
   - Type: Key
   - Attributes: `isActive` (ASC)

#### Set Permissions:

- **Read**: Any (so users can see achievement definitions)
- **Create/Update/Delete**: API key only (only backend can modify)

---

### Step 2: Create `user_achievements` Collection

1. Click "Create Collection"
2. **Collection ID**: `user_achievements`
3. **Name**: "User Achievements"
4. Click "Create"

#### Add Attributes:

1. **userId** (String, 64 chars, Required)
   - Key: `userId`
   - Size: 64
   - Required: ✓

2. **achievementId** (String, 64 chars, Required)
   - Key: `achievementId`
   - Size: 64
   - Required: ✓

3. **progress** (Integer, Required, Default: 0)
   - Key: `progress`
   - Required: ✓
   - Default: 0

4. **unlocked** (Boolean, Required, Default: false)
   - Key: `unlocked`
   - Required: ✓
   - Default: false

5. **unlockedAt** (DateTime, Optional)
   - Key: `unlockedAt`
   - Required: ✗

6. **claimed** (Boolean, Required, Default: false)
   - Key: `claimed`
   - Required: ✓
   - Default: false

7. **claimedAt** (DateTime, Optional)
   - Key: `claimedAt`
   - Required: ✗

8. **createdAt** (DateTime, Required)
   - Key: `createdAt`
   - Required: ✓

9. **updatedAt** (DateTime, Required)
   - Key: `updatedAt`
   - Required: ✓

10. **userAchievementKey** (String, 129 chars, Required, Unique)
    - Key: `userAchievementKey`
    - Size: 129
    - Required: ✓

#### Create Indexes:

1. **userId Index**
   - Key: `idx_userId`
   - Type: Key
   - Attributes: `userId` (ASC)

2. **achievementId Index**
   - Key: `idx_achievementId`
   - Type: Key
   - Attributes: `achievementId` (ASC)

3. **userAchievementKey Index** (Unique)
   - Key: `idx_userAchievementKey`
   - Type: Unique
   - Attributes: `userAchievementKey` (ASC)

4. **Compound Index** (userId + achievementId)
   - Key: `idx_userId_achievementId`
   - Type: Key
   - Attributes: `userId` (ASC), `achievementId` (ASC)

#### Set Permissions:

- **Read**: Users (userId = $userId) - users can only read their own achievements
- **Create/Update**: API key only - only backend can create/update
- **Delete**: API key only - only backend can delete

---

## Step 3: Seed Achievement Definitions

After creating the collections, run the seed script:

```bash
cd packages/backend
bun run seed:achievements
```

Expected output:
```
🌱 Starting achievement definitions seed...
📊 Total achievements to seed: 30
✅ Seeded: first-case (First Case)
✅ Seeded: case-opener-10 (Case Opener)
...
📊 Seeding Summary:
✅ Successfully seeded: 30
❌ Failed: 0
📈 Total: 30

🎉 All achievements seeded successfully!
```

---

## Verification

After setup, test the API:

```bash
# Test achievements endpoint
curl http://localhost:5000/api/achievements \
  -H "X-Appwrite-User-Id: YOUR_USER_ID"
```

You should get a 200 response with achievement data.

---

## Troubleshooting

### Collection Not Found Error
- Verify collection IDs match exactly: `achievement_definitions` and `user_achievements`
- Check you're in the correct database

### Permission Denied
- Verify permissions are set correctly
- Check API key has write permissions

### Seed Script Fails
- Verify all attributes exist with correct types
- Check for duplicate achievement IDs
- Verify API key has write access

---

## Need Help?

If you encounter issues:
1. Check Appwrite Console logs
2. Verify collection IDs in `/packages/backend/src/config/collections.ts`
3. Check backend logs for detailed error messages
4. Ensure API key has correct permissions

