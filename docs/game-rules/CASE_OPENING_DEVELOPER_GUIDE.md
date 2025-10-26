# Case Opening Game - Developer Guide

> **Last Updated**: October 2024 | **Version**: 1.0  
> **For**: Developers and Cursor IDE | **Purpose**: Game mechanics, iteration, and maintenance

This guide provides everything you need to understand, modify, and extend the case opening game system.

## 🎯 Cursor IDE Context

**This document helps Cursor understand:**
- How case opening works (backend selection logic)
- Where to find files (exact paths with line numbers)
- How to add/modify cases and items (step-by-step workflows)
- Common issues and solutions (troubleshooting)
- Important constraints (value ranges, naming conventions, caching)

**When to reference this:**
- User asks "how to add a new case?"
- User encounters case opening bugs
- User wants to modify drop rates or item values
- User needs to understand the item selection algorithm
- User asks about case/item properties or structure

## Table of Contents

- [Quick Reference](#quick-reference)
- [Architecture Overview](#architecture-overview)
- [Understanding the System](#understanding-the-system)
- [Adding New Cases](#adding-new-cases)
- [Adding New Items](#adding-new-items)
- [Adding New Item Categories](#adding-new-item-categories)
- [Complete Workflows](#complete-workflow-adding-a-new-case-end-to-end)
- [Testing](#testing-cases-and-items)
- [Troubleshooting](#troubleshooting)
- [Advanced Topics](#advanced-topics)

## Quick Reference

### Current Database State

**Active Cases** (4 total):
| Case Name | Price | Common | Uncommon | Rare | Epic | Legendary |
|-----------|-------|--------|----------|------|------|-----------|
| Starter Case | 500₽ | 70% | 25% | 5% | 0% | 0% |
| Military Case | 1,200₽ | 25% | 50% | 25% | 0% | 0% |
| Premium Case | 2,500₽ | 20% | 45% | 20% | 15% | 0% |
| Legendary Case | 5,500₽ | 20% | 20% | 25% | 30% | 5% |

**Item Value Ranges** (based on actual DB):
| Rarity | Min Value | Max Value | Avg Value | Count |
|--------|-----------|-----------|-----------|-------|
| Common | 184₽ | 276₽ | 224₽ | 4 items |
| Uncommon | 486₽ | 810₽ | 628₽ | 4 items |
| Rare | 2,280₽ | 4,560₽ | 3,135₽ | 4 items |
| Epic | 8,250₽ | 11,000₽ | 9,488₽ | 4 items |
| Legendary | 26,250₽ | 37,500₽ | 31,875₽ | 4 items |

**Expected Returns** (calculated from DB values):
| Case | Price | EV | Return Rate | House Edge | Avg Loss |
|------|-------|----|-------------|-----------|-----------|
| Starter | 500₽ | 471₽ | 94.1% | 5.9% | 29₽ |
| Military | 1,200₽ | 1,154₽ | 96.1% | 3.9% | 46₽ |
| Premium | 2,500₽ | 2,378₽ | 95.1% | 4.9% | 122₽ |
| Legendary | 5,500₽ | 5,394₽ | 98.1% | 1.9% | 106₽ |

**Existing Categories**: `medical`, `electronics`, `consumables`, `valuables`, `keycards`

### Most Common Tasks

**Want to add a new case?** → See [Adding New Cases](#adding-new-cases) section  
**Want to add a new item?** → See [Adding New Items](#adding-new-items) section  
**Want to add a new category?** → See [Adding New Item Categories](#adding-new-item-categories) section  
**Want a complete walkthrough?** → See [Complete Workflow](#complete-workflow-adding-a-new-case-end-to-end) section

## Architecture Overview

### System Components

The case opening system is split between frontend (React/TypeScript) and backend (Node.js/Appwrite):

```
Frontend Components:
├── CaseOpeningGame.tsx          # Main orchestrator (state management)
├── CaseSelector.tsx             # Case selection UI (displays cases)
├── CaseOpeningAnimation.tsx     # Animation controller (carousel effects)
├── CaseResult.tsx              # Result display (shows won item)
├── CaseHistory.tsx             # History viewer (past openings)
└── CaseConfirmation.tsx        # Purchase confirmation (balance check)

Backend Services:
├── case-opening-appwrite.ts     # Core logic: item selection algorithm
├── games.ts (routes)            # API endpoints: /api/games/cases/*
└── random-generator.ts         # Secure random (crypto-safe)

Database (Appwrite):
├── case_types                   # Case definitions (price, distribution)
├── tarkov_items                # Item pool (rarity, value, category)
└── case_item_pools             # Optional: case-specific items
```

### Component Relationships

```
User clicks "Open" 
  → CaseConfirmation.tsx validates balance
  → useCaseOpeningGame.ts calls API
  → Backend (case-opening-appwrite.ts) selects item
  → Returns item to frontend
  → CaseOpeningAnimation.tsx shows carousel
  → ItemReveal.tsx displays result with effects
  → Balance updated, history saved
```

### Key Dependencies

**Frontend → Backend API Routes**:
- `GET /api/games/cases` - List all active case types
- `GET /api/games/cases/:caseTypeId` - Get specific case type and item pool
- `POST /api/games/cases/open` - Open a case (requires authentication)
  - Request body: `{ caseTypeId, previewOnly?, requestId? }`
  - Response: `{ transaction_id, opening_result }`

**Backend → Appwrite Database**:
- Collection IDs (from `packages/backend/src/config/collections.ts`):
  - `CASE_TYPES` (`case_types`) - Case definitions
  - `TARKOV_ITEMS` (`tarkov_items`) - Item pool
  - `CASE_ITEM_POOLS` (`case_item_pools`) - Optional case-specific items
- Caching: 5 min for cases, 3 min for item pools
- Appwrite SDK: `packages/backend/src/services/appwrite-database.ts`

**Key Field Names**:
- TypeScript interfaces use camelCase: `imageUrl`, `baseValue`, `isActive`, `rarityDistribution`
- Appwrite API stores as camelCase: `imageUrl`, `baseValue`, `isActive`, `rarityDistribution`
- No snake_case conversion needed - Appwrite handles this automatically

## How the Game Works

### Step-by-Step Flow

1. **User Selects Case**: Frontend displays available cases from API
2. **User Confirms Purchase**: Balance validation happens
3. **API Call**: `POST /api/games/cases/open` with case type and user ID
4. **Backend Logic**:
   - Deducts balance from user account
   - Gets case's rarity distribution
   - Gets item pool (all active items or case-specific items)
   - Selects rarity tier based on distribution
   - Randomly picks item from that rarity
   - Calculates currency awarded
   - Saves to game history
5. **Response**: Returns item won and currency awarded
6. **Frontend**: Plays animation, displays result, credits balance

### Code Flow

```typescript
// 1. User clicks "Open Case" in CaseConfirmation.tsx
const handleConfirm = async () => {
  await openCase(selectedCase)
}

// 2. Hook handles the flow (useCaseOpeningGame.ts:215-364)
const openCase = async (caseType?: CaseType) => {
  // Validate balance
  if (balance < selectedCase.price) {
    throw new Error('Insufficient balance')
  }
  
  // Call API
  const openingResponse = await caseOpeningApi.openCase(selectedCase)
  
  // Update UI state
  setGameState({ phase: 'animating', result: openingResponse })
  
  // Animation completes, credit winnings
  creditWinnings(openingResponse.currency_awarded)
}
```

### Backend Item Selection Algorithm

The core logic lives in `packages/backend/src/services/case-opening-appwrite.ts`:

```typescript
// Step 1: Select rarity tier based on case distribution
static async selectRandomItem(caseType: CaseType, itemPool: WeightedItem[]) {
  const rarityDistribution = caseType.rarity_distribution
  
  // Generate secure random (0.0 - 100.0)
  const random = await this.randomGenerator.generateSecureRandom()
  const selectedValue = random * totalPercentage
  
  // Determine rarity (see code lines 234-270)
  let selectedRarity: ItemRarity
  let cumulativePercentage = 0
  
  cumulativePercentage += rarityDistribution.common
  if (selectedValue <= cumulativePercentage) {
    selectedRarity = 'common'
  } else {
    cumulativePercentage += rarityDistribution.uncommon
    if (selectedValue <= cumulativePercentage) {
      selectedRarity = 'uncommon'
    } // ... continues for all rarities
  }
  
  // Step 2: Filter items by selected rarity
  const itemsOfRarity = itemPool.filter(wi => wi.item.rarity === selectedRarity)
  
  // Step 3: Randomly pick one item from filtered list
  const secureRandom = await this.randomGenerator.generateSecureRandom()
  const randomItemIndex = Math.floor(secureRandom * itemsOfRarity.length)
  return itemsOfRarity[randomItemIndex]
}
```

## Data Structure

### Case Type

```typescript
interface CaseType {
  id: string
  name: string
  price: number
  description: string
  image_url?: string
  rarity_distribution: {
    common: number      // Case-specific percentage
    uncommon: number   // Case-specific percentage
    rare: number       // Case-specific percentage
    epic: number       // Case-specific percentage
    legendary: number  // Case-specific percentage
  }
  value_multiplier: number  // Always 1.0 - items pre-scaled
  is_active: boolean
  created_at: string
  updated_at: string
}
```

**Example Case** (from actual database):
```json
{
  "$id": "68e7d251003c9b70c730",
  "name": "Starter Case",
  "price": 500,
  "description": "A basic case with common items. Perfect for beginners!",
  "imageUrl": null,
  "rarityDistribution": "{\"common\":70,\"uncommon\":25,\"rare\":5,\"epic\":0,\"legendary\":0}",
  "valueMultiplier": 1,
  "isActive": true,
  "createdAt": "2025-10-09T15:18:41.969+00:00",
  "updatedAt": "2025-10-09T15:18:41.969+00:00",
  "$createdAt": "2025-10-09T15:18:41.736+00:00",
  "$updatedAt": "2025-10-13T03:17:15.030+00:00",
  "$permissions": [],
  "$databaseId": "main_db",
  "$collectionId": "case_types"
}
```

### Tarkov Item

```typescript
interface TarkovItem {
  id: string
  name: string
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  base_value: number      // Pre-scaled for case type
  category: 'medical' | 'electronics' | 'consumables' | 'valuables' | 'keycards'
  image_url?: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}
```

**Example Item** (from actual database):
```json
{
  "$id": "68e7d2540022cd56fed7",
  "name": "LEDX",
  "rarity": "epic",
  "baseValue": 11000,
  "category": "medical",
  "imageUrl": null,
  "description": "Transilluminator",
  "isActive": true,
  "createdAt": "2025-10-09T15:18:44.556+00:00",
  "$createdAt": "2025-10-09T15:18:44.192+00:00",
  "$updatedAt": "2025-10-13T03:04:29.567+00:00",
  "$permissions": [],
  "$databaseId": "main_db",
  "$collectionId": "tarkov_items"
}
```

### Opening Result

```typescript
interface CaseOpeningResult {
  case_type: CaseType
  item_won: TarkovItem
  currency_awarded: number
  opening_id: string      // Format: "case_1234567890_user_id"
  timestamp: string
}
```

## Adding New Cases

### Step 1: Create the Case Record

In Appwrite Console, go to Databases → `case_types` collection and create a new document:

**Example - Combat Case**:

```json
{
  "name": "Combat Case",
  "price": 3000,
  "description": "High-value case with military-grade equipment",
  "imageUrl": "/images/cases/combat-case.png",
  "rarityDistribution": "{\"common\":40,\"uncommon\":30,\"rare\":20,\"epic\":8,\"legendary\":2}",
  "valueMultiplier": 1.0,
  "isActive": true
}
```

**Field Details**:
- `name`: Display name for the case
- `price`: Cost in roubles (user balance)
- `description`: Flavor text shown to users
- `imageUrl`: Path to case image (or `null` for default)
- `rarityDistribution`: JSON string with percentages (must sum to 100)
- `valueMultiplier`: Currently always 1.0 (items pre-scaled)
- `isActive`: Set to `false` to hide from users

### Step 2: Case Image (Optional)

Store images in `public/images/cases/`:
- **Recommended Size**: 400x300 pixels
- **Format**: PNG or JPG
- **Naming**: Use kebab-case (e.g., `combat-case.png`)

Update the `imageUrl` field:
```json
{
  "imageUrl": "/images/cases/combat-case.png"
}
```

### Step 3: Configure Rarity Distribution

The distribution controls drop rates. Percentages are relative weights:

```json
{
  "common": 40,      // 40% chance
  "uncommon": 30,    // 30% chance
  "rare": 20,        // 20% chance
  "epic": 8,         // 8% chance
  "legendary": 2     // 2% chance
}
```

**Important**: Values don't need to sum to 100, but the system will normalize them.

**Distribution Examples**:

- **Budget Case** (many commons): `{common: 70, uncommon: 20, rare: 8, epic: 1.5, legendary: 0.5}`
- **Balanced Case**: `{common: 50, uncommon: 30, rare: 15, epic: 4, legendary: 1}`
- **Premium Case** (fewer commons): `{common: 30, uncommon: 35, rare: 20, epic: 12, legendary: 3}`

### Step 4: Test the Case

```bash
# Start development server
bun run dev

# Navigate to /games/case-opening in your browser
# Look for your new case in the case selector
# Click on it to verify details show correctly
# Open a test case to verify item selection works
# Check that items drop according to rarity distribution
```

### Quick Reference: Creating a Complete New Case

**Summary Checklist**:
1. ✅ Create document in `case_types` collection with unique ID
2. ✅ Set `name`, `price`, `description` fields
3. ✅ Configure `rarityDistribution` as JSON string
4. ✅ Set `imageUrl` (or leave `null` for default box icon)
5. ✅ Set `isActive: true` to make it visible
6. ✅ Test in UI at `/games/case-opening`
7. ✅ Verify drop rates match expectations

**Current Active Cases** (for reference):
- Starter Case (500₽): 70/25/5/0/0 - No epics/legendaries
- Military Case (1,200₽): 25/50/25/0/0 - No epics/legendaries
- Premium Case (2,500₽): 20/45/20/15/0 - No legendaries
- Legendary Case (5,500₽): 20/20/25/30/5 - Best odds

## Adding New Items

### Step 1: Determine Base Value

Item values should be appropriate for their rarity tier based on actual database values:

```typescript
const VALUE_RANGES = {
  common: { min: 184, max: 276, avg: 224 },        // Actual from DB
  uncommon: { min: 486, max: 810, avg: 628 },      // Actual from DB
  rare: { min: 2280, max: 4560, avg: 3135 },        // Actual from DB
  epic: { min: 8250, max: 11000, avg: 9488 },      // Actual from DB
  legendary: { min: 26250, max: 37500, avg: 31875 } // Actual from DB
}
```

**Scaling Note**: Values are case-scaled. Don't worry about multipliers - just set `base_value` appropriately based on these ranges.

### Step 2: Create the Item Record

In Appwrite Console, go to Databases → `tarkov_items` collection:

**Example - New Medical Item**:

```json
{
  "name": "Surgical Kit",
  "rarity": "rare",
  "baseValue": 3000,
  "category": "medical",
  "imageUrl": "/images/items/medical/surgical-kit.png",
  "description": "Professional surgical equipment set",
  "isActive": true
}
```

**Example - New Electronic Item**:

```json
{
  "name": "Quantum Processor",
  "rarity": "legendary",
  "baseValue": 30000,
  "category": "electronics",
  "imageUrl": "/images/items/electronics/quantum-processor.png",
  "description": "Ultra-rare quantum computing chip",
  "isActive": true
}
```

### Step 3: Item Image (Optional)

Store images in `public/images/items/{category}/`:

- **Recommended Size**: 128x128 pixels
- **Format**: PNG (transparent background) or JPG
- **Naming**: Use kebab-case
- **Structure**:

```
public/images/items/
├── medical/
│   ├── bandage.png
│   ├── salewa-kit.png
│   └── new-item.png
├── electronics/
│   ├── gpu.png
│   └── quantum-processor.png
├── consumables/
│   └── vodka.png
├── valuables/
│   └── bitcoin.png
└── keycards/
    └── red-keycard.png
```

If no image is provided, the system uses category-based emoji fallbacks (see `rarityConfig` in code).

### Step 4: Update Case Item Pools (Optional)

By default, **all active items** are available in all cases. If you want to restrict certain items to specific cases:

1. Go to `case_item_pools` collection
2. Create a mapping:

```json
{
  "caseTypeId": "case-scav-001",
  "itemId": "item-ledx-001",
  "valueMultiplier": 1.0,  // Optional - currently unused
  "weight": 1.0             // Optional - not used in current algorithm
}
```

**When to Use**:
- Create case-exclusive items
- Add special event items to certain cases
- Test new items before making them global

**Default Behavior**: If `case_item_pools` is empty for a case, it uses ALL active items.

## Adding New Item Categories

Currently supported categories:
- `medical` 🏥
- `electronics` 💻
- `consumables` 🍖
- `valuables` 💰
- `keycards` 🗝️

### Step 1: Add New Category to Code

If you want to create a completely new item category (e.g., `weapons` or `armor`), you need to update the code:

**1. Update TypeScript Types** (`packages/backend/src/config/collections.ts`):

```typescript
export type ItemCategory = 
  | 'medical' 
  | 'electronics' 
  | 'consumables' 
  | 'valuables' 
  | 'keycards'
  | 'weapons'  // NEW CATEGORY
```

**2. Update Frontend Components**:

In `packages/frontend/src/components/games/ItemReveal.tsx` and `CaseOpeningCarousel.tsx`:

```typescript
// Add to categoryIcons object (around line 94)
const categoryIcons = {
  medical: '🏥',
  electronics: '💻',
  consumables: '🍖',
  valuables: '💰',
  keycards: '🗝️',
  weapons: '🔫'  // NEW CATEGORY ICON
}
```

**3. Update Item Categories Interface**:

In `packages/frontend/src/components/games/ItemReveal.tsx`:

```typescript
export type ItemCategory = 
  'medical' | 
  'electronics' | 
  'consumables' | 
  'valuables' | 
  'keycards' |
  'weapons'  // NEW
```

### Step 2: Add Items with New Category

Once the code is updated, add items to the database with the new category:

```json
{
  "name": "AK-74 Assault Rifle",
  "rarity": "rare",
  "baseValue": 3500,
  "category": "weapons",
  "imageUrl": "/images/items/weapons/ak74.png",
  "description": "5.45x39mm assault rifle",
  "isActive": true
}
```

### Step 3: Create Category Folder for Images

```bash
mkdir -p public/images/items/weapons
# Add weapon images to this folder
```

### Important Notes

- **No database migration needed**: Appwrite dynamically accepts any category string
- **Fallback behavior**: If a category icon isn't defined in code, it will show as a question mark
- **Update all category lists**: Make sure to update the type definition in both frontend and backend
- **Testing**: Test new categories thoroughly as they'll be used in all case openings

### Alternative: Using Existing Categories

Instead of creating new categories, you can use existing ones:
- Medical items → `medical`
- Tech items → `electronics`
- Food/drinks → `consumables`
- Gold/artifacts → `valuables`
- Keys/cards → `keycards`

**Recommended**: Only add new categories if you have 5+ items planned for that category.

## Modifying Existing Cases

### Change Case Price

```javascript
// In Appwrite Console, update via UI or API
// Example: Update Starter Case price from 500 to 600

// Via Appwrite Console:
// 1. Go to Databases → case_types collection
// 2. Find Starter Case document
// 3. Update price field to 600
// 4. Save
```

Or via code:
```typescript
await appwriteDb.updateDocument(
  COLLECTION_IDS.CASE_TYPES,
  caseId,
  { price: 2000 }
)
```

### Update Rarity Distribution

```json
{
  "rarityDistribution": "{\"common\":50,\"uncommon\":30,\"rare\":15,\"epic\":4,\"legendary\":1}"
}
```

### Change Case Image

1. Replace image file in `public/images/cases/`
2. Update `imageUrl` field (or set to `null` for default)

### Disable/Enable Case

```json
// Temporarily disable
{ "isActive": false }

// Re-enable
{ "isActive": true }
```

## Modifying Existing Items

### Update Item Value

**Example - Rebalance Item Value**:
In Appwrite Console:
1. Go to Databases → `tarkov_items` collection
2. Find the item document
3. Update `baseValue` field (e.g., change from 3000 to 4000)
4. Save

### Change Item Rarity

**Important**: This changes which cases can drop the item and affects the drop rate calculation.

In Appwrite Console:
1. Go to Databases → `tarkov_items` collection
2. Find the item document
3. Update `rarity` field (e.g., change from 'rare' to 'epic')
4. Save

### Update Item Image

1. Replace image file in `public/images/items/{category}/`
2. Update `imageUrl` field in database to match new path

### Change Item Category

In Appwrite Console:
1. Go to Databases → `tarkov_items` collection
2. Find the item document
3. Update `category` field (e.g., 'medical', 'electronics', 'consumables', 'valuables', 'keycards')
4. Save

Category icon mapping (in code):
```typescript
const categoryIcons = {
  medical: '🏥',
  electronics: '💻',
  consumables: '🍖',
  valuables: '💰',
  keycards: '🗝️'
}
```

## Visual Effects & Styling

### Rarity Colors

Defined in `packages/frontend/src/components/games/CaseOpeningCarousel.tsx` (around line 23):

```typescript
const rarityColors = {
  common: {
    border: 'border-gray-400',
    glow: 'shadow-gray-400/50',
    bg: 'bg-gray-400/10',
    shadowColor: 'gray-400'
  },
  uncommon: {
    border: 'border-green-400',
    glow: 'shadow-green-400/50',
    bg: 'bg-green-400/10',
    shadowColor: 'green-400'
  },
  rare: {
    border: 'border-blue-400',
    glow: 'shadow-blue-400/50',
    bg: 'bg-blue-400/10',
    shadowColor: 'blue-400'
  },
  epic: {
    border: 'border-purple-400',
    glow: 'shadow-purple-400/50',
    bg: 'bg-purple-400/10',
    shadowColor: 'purple-400'
  },
  legendary: {
    border: 'border-yellow-400',
    glow: 'shadow-yellow-400/50',
    bg: 'bg-yellow-400/10',
    shadowColor: 'yellow-400'
  }
}
```

### Particle Effects

Defined in `ItemReveal.tsx` (around line 41):

```typescript
const rarityConfig = {
  common: {
    particleCount: 6,
    particles: ['✨', '💫', '⚪'],
    intensity: 1
  },
  uncommon: {
    particleCount: 8,
    particles: ['💚', '🟢', '✅'],
    intensity: 1.2
  },
  rare: {
    particleCount: 10,
    particles: ['💎', '🔷', '🔵'],
    intensity: 1.5
  },
  epic: {
    particleCount: 12,
    particles: ['🔮', '💜', '🟣'],
    intensity: 2
  },
  legendary: {
    particleCount: 16,
    particles: ['⭐', '🌟', '✨', '💫'],
    intensity: 3
  }
}
```

To modify particle effects:
1. Open `packages/frontend/src/components/games/ItemReveal.tsx`
2. Find the `rarityConfig` object (around line 41)
3. Update the `particleCount` and `particles` array for the desired rarity
4. Reload the app to see changes

### Animation Timing

Carousel timing is defined in `packages/frontend/src/utils/carousel.ts` (around line 189):

```typescript
export const CAROUSEL_TIMING = {
  SPIN: 4000,              // Base spin duration (ms)
  DECELERATE: 800,         // Slowdown phase (ms)
  TOTAL: 4800,             // Total animation (ms)
  
  EASING: {
    spin: [0.25, 0.46, 0.45, 0.94],  // Spinning curve
    decel: [0.55, 0, 0.55, 1]         // Deceleration curve
  }
} as const
```

To speed up/slow down animations:
1. Open `packages/frontend/src/utils/carousel.ts`
2. Modify `CAROUSEL_TIMING` constants
3. Test on multiple devices to ensure smooth performance

## Icon Guidelines

### Item Icons

**Best Practices**:
- **Size**: 128x128 pixels (will scale to fit)
- **Format**: PNG with transparent background
- **Style**: Match Tarkov aesthetic (dark, military, realistic)
- **Naming**: Use kebab-case: `ledx-transilluminator.png`

**Category-Specific Notes**:
- **Medical**: Bandages, pills, medical devices
- **Electronics**: CPUs, GPUs, circuit boards
- **Consumables**: Food, drinks, injectors
- **Valuables**: Gold, chains, artifacts
- **Keycards**: Card designs, keys on keyrings

### Case Icons

**Best Practices**:
- **Size**: 400x300 pixels (landscape)
- **Format**: PNG or JPG
- **Style**: Military crate/box aesthetic
- **Naming**: Use kebab-case: `scav-case.png`

**Design Elements**:
- Wooden crates for Starter cases
- Metal military boxes for Military cases
- Hi-tech containers for Premium/Legendary cases
- Add case-specific decals or markings

### Fallback Icons

If no image is provided, the system displays emoji fallbacks:

```typescript
// From ItemReveal.tsx and CaseOpeningCarousel.tsx
const categoryIcons = {
  medical: '🏥',
  electronics: '💻',
  consumables: '🍖',
  valuables: '💰',
  keycards: '🗝️'
}
```

To change fallback icons:
1. Open both files listed above
2. Update the `categoryIcons` object
3. Use unicode emoji or custom SVG

## Code Examples

### Selecting an Item (Backend)

```typescript
// From case-opening-appwrite.ts:229-291

// Step 1: Get case type
const caseType = await this.getCaseType(caseTypeId)

// Step 2: Get item pool
const itemPool = await this.getItemPool(caseTypeId)

// Step 3: Select random rarity tier
const rarityDistribution = caseType.rarity_distribution
const random = await this.randomGenerator.generateSecureRandom()
const selectedValue = random * 100

// Step 4: Determine selected rarity (cumulative approach)
let selectedRarity: ItemRarity
let cumulativePercentage = 0

cumulativePercentage += rarityDistribution.common
if (selectedValue <= cumulativePercentage) {
  selectedRarity = 'common'
} else {
  cumulativePercentage += rarityDistribution.uncommon
  if (selectedValue <= cumulativePercentage) {
    selectedRarity = 'uncommon'
  } else {
    cumulativePercentage += rarityDistribution.rare
    if (selectedValue <= cumulativePercentage) {
      selectedRarity = 'rare'
    } else {
      cumulativePercentage += rarityDistribution.epic
      if (selectedValue <= cumulativePercentage) {
        selectedRarity = 'epic'
      } else {
        selectedRarity = 'legendary'
      }
    }
  }
}

// Step 5: Filter items by rarity
const itemsOfRarity = itemPool.filter(wi => wi.item.rarity === selectedRarity)

// Step 6: Pick random item from filtered list
const secureRandom = await this.randomGenerator.generateSecureRandom()
const randomItemIndex = Math.floor(secureRandom * itemsOfRarity.length)
return itemsOfRarity[randomItemIndex]
```

### Opening a Case (Frontend Hook)

```typescript
// From useCaseOpeningGame.ts:215-364

const openCase = async (caseType?: CaseType) => {
  // Validate balance
  if (balance < selectedCase.price) {
    throw new Error('Insufficient balance')
  }
  
  // Transition to loading
  transitionToPhase('loading')
  
  // Call API with monitoring
  const openingResponse = await monitorAPICall(
    '/api/games/cases/open',
    'POST',
    () => optimisticCaseOpening.mutateAsync({
      caseType: selectedCase,
      currentBalance: balance,
      userId: user.id,
      delayCredit: true
    })
  )
  
  // Store transaction ID for later reference
  setGameState(prev => ({
    ...prev,
    transactionId: openingResponse.transaction_id
  }))
  
  // Store winnings (credited after animation completes)
  setPendingWinnings(openingResponse.opening_result.currency_awarded)
  
  // Start animation phase
  transitionToPhase('opening')
}
```

### Displaying Item with Effects

```typescript
// From ItemReveal.tsx

const rarityConfig = {
  legendary: {
    color: 'text-yellow-400',
    glowColor: 'shadow-yellow-400/50',
    particleCount: 16,
    intensity: 3,
    particles: ['⭐', '🌟', '✨', '💫']
  }
}

// Render particles
{[...Array(particleCount)].map((_, i) => (
  <motion.div
    animate={{
      opacity: [0, 0.8, 0],
      y: [0, -30, -60],
      x: [0, config.randomX],
      scale: [0.5, 1, 0.3],
      rotate: [0, 180, 360]
    }}
  >
    {particles[i % particles.length]}
  </motion.div>
))}
```

## Testing Cases and Items

### Test Case Opening

```bash
# Open dev server
bun run dev

# Navigate to game
# Open browser console
# Open cases and verify item distribution
```

### Verify Drop Rates

```typescript
// Create test script
const testCaseOpening = async () => {
  const results = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 }
  
  for (let i = 0; i < 1000; i++) {
    const result = await openCase('starter-case')
    results[result.item_won.rarity]++
  }
  
  console.log('Results over 1000 openings:', results)
}

// Expected for Starter Case:
// common: 700, uncommon: 250, rare: 50, epic: 0, legendary: 0
```

## Troubleshooting

### Items Not Appearing

1. **Check item is active**: `isActive: true`
2. **Check item has valid data**: `name`, `rarity`, `base_value`, `category`
3. **Clear cache**: Backend caches item pools for 3 minutes
4. **Check console errors**: Look for API errors in browser console

### Cases Not Showing

1. **Check case is active**: `isActive: true`
2. **Check API response**: Open network tab, check `/api/games/cases/types`
3. **Verify case has items**: Case needs at least one item in pool

### Animation Issues

1. **Performance**: Check FPS in browser devtools
2. **Missing items**: Verify item data structure is complete
3. **Carousel stuck**: Check `winningIndex` is within bounds

### Database Issues

1. **Connection**: Verify Appwrite connection string
2. **Collections**: Ensure `case_types`, `tarkov_items`, `case_item_pools` exist
3. **Permissions**: Check collection read/write permissions
4. **Caching**: Backend caches for 3-5 minutes - wait or restart server

## Performance Considerations

### Item Pool Caching

Backend caches item pools for 3 minutes:
```typescript
return withCache(
  `case_item_pool_${caseTypeId}`,
  async () => { /* ... */ },
  3 * 60 * 1000 // 3 minutes
)
```

### Animation Optimization

- **Virtualization**: Only 7 items rendered at once in carousel
- **Hardware acceleration**: Uses `transform` for smooth 60 FPS
- **Particle limits**: Scaled per rarity to prevent lag
- **Lazy loading**: Heavy components loaded on demand

### Database Queries

- **Batch requests**: Items fetched in parallel
- **Selective fields**: Only needed data retrieved
- **Connection pooling**: Reuses database connections

## Advanced: Custom Rarity Distribution

You can create custom distributions beyond the standard tiers:

```json
{
  "rarityDistribution": "{\"common\":80,\"special\":10,\"epic\":8,\"legendary\":2}"
}
```

**Implementation**:
1. Update `ItemRarity` type to include new rarity
2. Add rarity to `rarityColors` mapping
3. Update frontend components to handle new rarity
4. Ensure visual effects are defined

## API Reference

### Endpoints

**GET** `/api/games/cases/types`
- Returns list of active case types
- Response: `CaseType[]`

**GET** `/api/games/cases/:id/items`
- Returns item pool for case
- Response: `TarkovItem[]`

**POST** `/api/games/cases/open`
- Opens a case for user
- Body: `{ caseTypeId, userId }`
- Response: `{ transaction_id, opening_result }`

### Data Transformations

Appwrite → Application Format:

```typescript
// Case Type transformation (line 472-484)
private static transformCaseType(appwriteCase: AppwriteCaseType): CaseType {
  return {
    id: appwriteCase.$id,
    name: appwriteCase.name,
    price: appwriteCase.price,
    description: appwriteCase.description,
    image_url: appwriteCase.imageUrl,
    rarity_distribution: JSON.parse(appwriteCase.rarityDistribution),
    value_multiplier: 1.0,
    is_active: appwriteCase.isActive,
    created_at: appwriteCase.createdAt,
    updated_at: appwriteCase.updatedAt
  }
}
```

## Complete Workflow: Adding a New Case End-to-End

This section walks you through creating a complete new case with real examples.

### Example: Creating a "Raid Case"

Let's say you want to create a new "Raid Case" priced at 3,500 roubles with balanced drop rates.

**Step 1: Plan Your Case**

```javascript
// Decision: What should this case be?
name: "Raid Case"
price: 3500  // Mid-tier pricing between Premium (2500) and Legendary (5500)
description: "High-risk case from successful raids"

// Rarity distribution (must total 100)
common: 35%      // Lower than Premium (40%), good variety
uncommon: 35%    // Same as Premium
rare: 20%        // Same as Premium
epic: 10%        // Higher than Premium (8%)
legendary: 5%    // Between Premium (0%) and Legendary (5%)

// Total: 35 + 35 + 20 + 10 + 5 = 105% (system will normalize)
```

**Step 2: Create in Appwrite Console**

1. Navigate to Appwrite Console: `https://cloud.appwrite.io/console`
2. Select your project
3. Go to **Databases** → `main_db` → `case_types` collection
4. Click **"Create Document"**
5. Fill in:

```json
{
  "$id": null,  // Will be auto-generated
  "name": "Raid Case",
  "price": 3500,
  "description": "High-risk case from successful raids",
  "imageUrl": null,
  "rarityDistribution": "{\"common\":35,\"uncommon\":35,\"rare\":20,\"epic\":10,\"legendary\":5}",
  "valueMultiplier": 1,
  "isActive": true
}
```

**Step 3: Save and Verify**

- Click "Create"
- Case appears with auto-generated ID (e.g., `67abc123def456`)
- Wait ~30 seconds for cache to refresh
- Navigate to `/games/case-opening` in your app
- New case should appear in the selector

**Step 4: Test Drop Rates**

Open 10-20 test cases and verify:
- ~35% are common items
- ~35% are uncommon items
- ~20% are rare items
- ~10% are epic items
- ~5% are legendary items

**That's it!** Your case is live.

### Example: Creating an Item for Existing Category

Let's add a "Propital" medical item:

**Plan**:
- Rarity: `epic` (high-value medical item)
- Value: ~9,000₽ (fits in epic range 8,250-11,000₽)
- Category: `medical` (existing category, no code changes needed)

**Create in Appwrite**:

1. Go to Databases → `tarkov_items` collection
2. Click "Create Document"
3. Fill in:

```json
{
  "$id": null,
  "name": "Propital",
  "rarity": "epic",
  "baseValue": 9000,
  "category": "medical",
  "imageUrl": "/images/items/medical/propital.png",
  "description": "Powerful painkiller and healing stimulant",
  "isActive": true
}
```

4. Save
5. Item is immediately available in ALL cases (weighted by rarity)

**That's it!** The item will now drop from cases according to each case's rarity distribution.

## Summary

- **Cases**: Define price, description, rarity distribution, and image
- **Items**: Define name, rarity, base_value, category, and image (use actual DB ranges)
- **Categories**: 5 built-in categories (medical, electronics, consumables, valuables, keycards) or add new ones
- **Item Pools**: Use `case_item_pools` for case-specific items (optional)
- **Icons**: 128x128 for items, 400x300 for cases
- **Effects**: Rarity colors and particles defined in frontend components
- **Caching**: Backend caches cases (5 min) and item pools (3 min)

**Key Files**:
- `packages/backend/src/services/case-opening-appwrite.ts` - Backend logic & item selection
- `packages/frontend/src/components/games/` - Frontend components
- `packages/frontend/src/hooks/useCaseOpeningGame.ts` - State management
- `packages/backend/src/config/collections.ts` - Type definitions
- `packages/frontend/src/components/games/ItemReveal.tsx` - Visual effects & category icons

---

## Troubleshooting

### New case/item not appearing

**Problem**: Created case/item in Appwrite but it doesn't show up in the game

**Possible Causes & Solutions**:

1. **Cache hasn't refreshed** (most common)
   - Cases cache: 5 minutes
   - Item pools cache: 3 minutes
   - **Solution**: Wait 3-5 minutes or restart the dev server

2. **`isActive` flag not set**
   - **Solution**: In Appwrite Console, edit document → set `isActive: true`

3. **Wrong collection**
   - Cases must be in: `case_types` collection
   - Items must be in: `tarkov_items` collection
   - **Solution**: Verify collection ID

4. **Typos in field names**
   - Use **exact** field names: `name`, `price`, `rarity`, `baseValue` (camelCase in JSON)
   - **Solution**: Compare with working documents

### Drop rates not matching distribution

**Problem**: Opening 100 cases shows wrong rarity percentages

**Causes**:
- Statistically normal with small sample sizes (<1000)
- Item pool doesn't have enough items for that rarity
- Cache issue causing old distribution to be used

**Solutions**:
```typescript
// Check item pool sizes
const itemsByRarity = {
  common: itemPool.filter(i => i.rarity === 'common').length,
  uncommon: itemPool.filter(i => i.rarity === 'uncommon').length,
  // ... etc
}
// If any count is 0, that rarity can't drop
```

### "Insufficient balance" error

**Problem**: User has enough rubles but can't open case

**Causes**:
- Balance not refreshed after purchase
- Transaction pending on backend
- Cache issue showing stale balance

**Solution**: Check `packages/frontend/src/hooks/useCaseOpeningGame.ts` line ~215

### Animation glitches or stuttering

**Problem**: Case opening animation is choppy or particles don't show

**Causes**:
- Too many particles for rarity tier
- Browser performance issues
- Framer Motion animation conflicts

**Solution**: See `ItemReveal.tsx` around line 125-200, adjust `particleCount` in `rarityConfig`

---

## Advanced Topics

### Understanding Field Naming Conventions

**Important**: Appwrite uses camelCase consistently across JSON and API

| TypeScript Interface | Appwrite Document Field | Usage |
|----------------------|------------------------|-------|
| `imageUrl` | `imageUrl` | Case and item image URL |
| `baseValue` | `baseValue` | Item base value in rubles |
| `isActive` | `isActive` | Enable/disable flag for cases and items |
| `rarityDistribution` | `rarityDistribution` | JSON string of rarity percentages |
| `caseTypeId` | `caseTypeId` | Case type reference |
| `itemId` | `itemId` | Item reference |

**Rule**: Always use **camelCase** in Appwrite Console UI. The SDK handles field naming automatically.

**Example Document Structure** (in Appwrite Console):
```json
{
  "name": "Starter Case",
  "price": 500,
  "description": "A basic case",
  "imageUrl": "/images/cases/starter.png",
  "rarityDistribution": "{\"common\":70,\"uncommon\":25,\"rare\":5}",
  "isActive": true
}
```

### Calculating Expected Value (EV) for New Cases

Before creating a case, calculate if it's profitable:

```typescript
const casePrice = 3500;
const distribution = { common: 35, uncommon: 35, rare: 20, epic: 10, legendary: 5 };
const avgValues = {
  common: 224,
  uncommon: 628,
  rare: 3135,
  epic: 9488,
  legendary: 31875
};

let expectedValue = 0;
for (const [rarity, percentage] of Object.entries(distribution)) {
  expectedValue += (percentage / 100) * avgValues[rarity];
}

const houseEdge = (1 - (expectedValue / casePrice)) * 100;
// houseEdge should be between 5-15% for profitability
```

### Performance Optimization

**Backend Caching Strategy**:
```typescript
// packages/backend/src/services/case-opening-appwrite.ts

// Cache cases for 5 minutes
let casesCache: CacheEntry<CaseType[]>
const CACHE_TTL_CASES = 5 * 60 * 1000; // 5 min

// Cache item pools for 3 minutes
let itemPoolsCache: Record<string, CacheEntry<WeightedItem[]>>
const CACHE_TTL_POOLS = 3 * 60 * 1000; // 3 min
```

**Frontend Virtualization**:
- Carousel uses virtual scrolling for performance
- See `packages/frontend/src/utils/carousel.ts`

### Adding Custom Animation Effects

To add new particle effects for a rarity tier:

```typescript
// packages/frontend/src/components/games/ItemReveal.tsx

const rarityConfig = {
  custom: {  // New tier
    color: 'text-purple-400',
    glowColor: 'shadow-purple-400/50',
    particleCount: 20,
    intensity: 4,
    particles: ['💜', '💎', '✨', '⭐']
  }
}
```

Then add to `packages/frontend/src/components/games/CaseOpeningCarousel.tsx`:

```typescript
const rarityColors = {
  custom: '#a855f7'  // purple
}
```

### Debugging Secure Random Number Generation

The system uses cryptographically secure randomness. To debug:

```typescript
// packages/backend/src/services/secure-random.ts

const random = await SecureRandomGenerator.generateSecureRandom()
console.log(`Secure random value: ${random}`)
// Should be between 0.0 and 100.0
```

---

## Related Resources

- **User Guide**: [CASE_OPENING_USER_GUIDE.md](./CASE_OPENING_USER_GUIDE.md)
- **Frontend Components**: `packages/frontend/src/components/games/`
- **Backend Services**: `packages/backend/src/services/case-opening-appwrite.ts`
- **Database Config**: `packages/backend/src/config/collections.ts`
- **Appwrite Dashboard**: https://cloud.appwrite.io/console

---

## Contributing

Found an issue or have a suggestion? Update this guide as you make changes. When modifying the system, ensure:

1. Update this document's "Last Updated" date
2. Add new troubleshooting items if you encounter issues
3. Update code examples if files/lines change
4. Test all workflows before marking complete

**Remember**: This guide is for both developers and Cursor IDE. Keep it accurate and comprehensive.

