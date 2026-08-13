---
title: "Security"
audience: developer
layer: backend
status: active
tags: [security, authentication, balance, atomic-operations, race-condition]
last_updated: 08/11/2026
---

# Security Architecture

## Authentication

All auth middleware validates identity against Appwrite before trusting any user data. `X-Appwrite-User-Id` is never accepted alone.

### `authMiddleware` — Standard routes

Validates session cookie → verifies user exists in DB → rejects header mismatch.

```typescript
// Always validates session cookie against Appwrite first
const sessionData = await validateSession(sessionSecret)

// Header present but doesn't match session → 403
if (headerUserId && headerUserId !== sessionData.id) {
  throw new HTTPException(403, { message: 'User identity verification failed' })
}

// User must exist in our DB
const profile = await UserService.getUserProfile(sessionData.id)
```

### `criticalAuthMiddleware` — Money & game routes

Session cookie → JWT fallback → hard 401 if neither validates. No DB-only fallback.

```typescript
// 1. Try session cookie
if (sessionCookie) validatedUser = await validateSession(sessionCookie)

// 2. Fallback to JWT
if (!validatedUser && jwtToken) validatedUser = await validateSession(jwtToken)

// 3. Reject — no DB-only fallback
if (!validatedUser) throw new HTTPException(401)
```

### `optionalAuthMiddleware` — Public routes with optional user context

Validates session cookie if present. Never reads `X-Appwrite-User-Id` header.

---

## Balance Integrity (C1)

All balance mutations use Appwrite atomic operations. No read-modify-write windows.

### `processGameTransaction` — Game bet + win settlement

```typescript
// Atomic deduct (min: 0 prevents overdraft — fails if balance < betAmount)
const { error: deductError } = await appwriteDb.decrementDocumentAttribute(
  COLLECTION_IDS.USERS, profile.$id, 'balance', betAmount, 0
)

// Atomic credit
if (winAmount > 0) {
  await appwriteDb.incrementDocumentAttribute(
    COLLECTION_IDS.USERS, profile.$id, 'balance', winAmount
  )
}

// Atomic stats
await Promise.all([
  appwriteDb.incrementDocumentAttribute(COLLECTION_IDS.USERS, profile.$id, 'totalWagered', betAmount),
  appwriteDb.incrementDocumentAttribute(COLLECTION_IDS.USERS, profile.$id, 'totalWon', winAmount),
  appwriteDb.incrementDocumentAttribute(COLLECTION_IDS.USERS, profile.$id, 'gamesPlayed', 1),
])
```

### `creditBalance` — Bonuses, rewards, refunds

```typescript
const { error } = await appwriteDb.incrementDocumentAttribute(
  COLLECTION_IDS.USERS, profile.$id, 'balance', amount
)
```

### Atomic operation bounds

| Operation | Bound param | Effect |
|---|---|---|
| `decrementDocumentAttribute` | `min: 0` | Fails atomically if result < 0 |
| `incrementDocumentAttribute` | `max` (optional) | Fails atomically if result > max |

---

## IDOR Protection (C2)

All routes derive `userId` from authenticated context (`c.get('user').id`). No endpoint accepts `userId` as a client-controlled parameter.

| Route group | Middleware | Ownership enforcement |
|---|---|---|
| `/api/user/*` | `criticalAuthMiddleware` | Always `user.id` |
| `/api/games/*` | `criticalAuthMiddleware` | Always `user.id` |
| `/api/statistics/*` | `criticalAuthMiddleware` | Always `user.id` |
| `/api/case-statistics/*` | `criticalAuthMiddleware` | Always `user.id` |
| `/api/achievements/*` | `authMiddleware` | Always `user.id` |
| `/api/chat/*` | `authMiddleware` | Always `user.id`; message delete checks ownership |
| `/api/games/cases/stats/:userId?` | `authMiddleware` | Param ignored, uses `user.id` |

## Remaining Issues

None — all identified issues resolved.
