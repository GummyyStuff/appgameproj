# Tarkov Casino Carousel Management Guide

This comprehensive guide covers how to manage all aspects of the case opening carousel system, including text customization, item management, image handling, and case configuration.

## Table of Contents

1. [Overview](#overview)
2. [Changing Text and Labels](#changing-text-and-labels)
3. [Managing Carousel Items](#managing-carousel-items)
4. [Managing Item Images](#managing-item-images)
5. [Managing Cases](#managing-cases)
6. [Managing Case Images](#managing-case-images)
7. [Database Management](#database-management)
8. [Configuration Options](#configuration-options)
9. [Troubleshooting](#troubleshooting)

## Overview

The carousel system consists of several interconnected components:

- **Frontend Components**: React components that display the carousel
- **Database Tables**: Store cases, items, and their relationships
- **API Endpoints**: Handle case opening and data retrieval
- **Image Assets**: Visual representations of cases and items

### Key Files

- `packages/frontend/src/components/games/CaseOpeningCarousel.tsx` - Main carousel component
- `packages/frontend/src/components/games/CaseSelector.tsx` - Case selection interface
- `packages/frontend/src/components/games/ItemReveal.tsx` - Item reveal animations
- `packages/backend/src/database/case_opening_schema.sql` - Database schema
- `packages/backend/src/database/seeds/002_case_opening_data.sql` - Sample data

## Changing Text and Labels

### 1. Carousel Interface Text

**File**: `packages/frontend/src/components/games/CaseOpeningCarousel.tsx`

#### Animation Status Messages

```typescript
// Lines 380-390 - Status indicator text
<span className="font-semibold uppercase tracking-wide text-sm">
  {animationPhase === 'spinning' && 'Spinning...'}
  {animationPhase === 'decelerating' && 'Slowing down...'}
  {animationPhase === 'settling' && 'Landing...'}
  {animationPhase === 'complete' && 'Complete!'}
</span>
```

**To change these messages:**
1. Locate the status text section around line 380
2. Modify the text strings:
   - `'Spinning...'` → Your custom spinning message
   - `'Slowing down...'` → Your custom deceleration message
   - `'Landing...'` → Your custom settling message
   - `'Complete!'` → Your custom completion message

#### Carousel Title

```typescript
// In CaseOpeningGame.tsx around line 400
<motion.h3 
  className="text-xl md:text-2xl font-tarkov font-bold text-tarkov-accent mb-6 text-center"
>
  🎰 Opening {gameState.selectedCase?.name}...
</motion.h3>
```

### 2. Case Selector Text

**File**: `packages/frontend/src/components/games/CaseSelector.tsx`

#### Main Heading

```typescript
// Line 85
<motion.h3 className="text-xl md:text-2xl font-tarkov font-bold text-tarkov-accent mb-6 text-center">
  Select a Case
</motion.h3>
```

#### Loading State Text

```typescript
// Line 70
<motion.h3>
  Loading Cases...
</motion.h3>
```

#### Drop Rates Label

```typescript
// Line 180
<div className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wide">
  Drop Rates:
</div>
```

#### Confirmation Dialog Text

```typescript
// Lines 280-290
<h3 className="text-xl md:text-2xl font-tarkov font-bold text-tarkov-accent mb-2">
  Open Case?
</h3>
<p className="text-gray-300">
  Are you sure you want to open this case?
</p>
```

### 3. Item Categories and Rarity Labels

**File**: `packages/frontend/src/components/games/CaseOpeningCarousel.tsx`

#### Category Icons

```typescript
// Lines 45-51
const categoryIcons = {
  medical: '🏥',
  electronics: '💻',
  consumables: '🍖',
  valuables: '💰',
  keycards: '🗝️'
}
```

#### Rarity Colors and Labels

```typescript
// Lines 25-43
const rarityColors = {
  common: {
    border: 'border-gray-400',
    glow: 'shadow-gray-400/50',
    bg: 'bg-gray-400/10'
  },
  // ... other rarities
}
```

## Managing Carousel Items

### 1. Adding New Items to Database

Items are stored in the `tarkov_items` table. To add new items:

```sql
INSERT INTO tarkov_items (name, rarity, base_value, category, description, image_url) VALUES
('New Item Name', 'rare', 500, 'medical', 'Item description', '/images/items/new-item.png');
```

**Required Fields:**
- `name`: Unique item name
- `rarity`: One of: `common`, `uncommon`, `rare`, `epic`, `legendary`
- `base_value`: Numeric value (currency amount)
- `category`: One of: `medical`, `electronics`, `consumables`, `valuables`, `keycards`

**Optional Fields:**
- `description`: Item description text
- `image_url`: Path to item image

### 2. Modifying Existing Items

```sql
-- Update item name
UPDATE tarkov_items SET name = 'New Name' WHERE name = 'Old Name';

-- Update item value
UPDATE tarkov_items SET base_value = 750 WHERE name = 'Item Name';

-- Update item rarity
UPDATE tarkov_items SET rarity = 'epic' WHERE name = 'Item Name';

-- Update item description
UPDATE tarkov_items SET description = 'New description' WHERE name = 'Item Name';
```

### 3. Removing Items

```sql
-- Disable item (recommended - preserves history)
UPDATE tarkov_items SET is_active = false WHERE name = 'Item Name';

-- Permanently delete item (not recommended)
DELETE FROM tarkov_items WHERE name = 'Item Name';
```

### 4. Adding Items to Case Pools

Items must be added to case pools to appear in specific cases:

```sql
INSERT INTO case_item_pools (case_type_id, item_id, weight, value_multiplier) VALUES
(
  (SELECT id FROM case_types WHERE name = 'Case Name'),
  (SELECT id FROM tarkov_items WHERE name = 'Item Name'),
  5.0,  -- Weight (higher = more likely to appear)
  1.5   -- Value multiplier (affects currency reward)
);
```

## Managing Item Images

### 1. Image Storage Location

Item images should be stored in the `public/images/items/` directory:

```
public/
  images/
    items/
      medical/
        bandage.png
        salewa-kit.png
      electronics/
        gpu.png
        cpu.png
      consumables/
        vodka.png
        mre.png
      valuables/
        bitcoin.png
        rolex.png
      keycards/
        red-keycard.png
        labs-keycard.png
```

### 2. Image Requirements

- **Format**: PNG or JPG recommended
- **Size**: 128x128 pixels optimal (will be displayed at various sizes)
- **Background**: Transparent PNG preferred
- **Naming**: Use kebab-case (lowercase with hyphens)

### 3. Adding Images to Items

#### Method 1: Database Update

```sql
UPDATE tarkov_items 
SET image_url = '/images/items/medical/new-item.png' 
WHERE name = 'New Item Name';
```

#### Method 2: During Item Creation

```sql
INSERT INTO tarkov_items (name, rarity, base_value, category, image_url) VALUES
('New Item', 'rare', 500, 'medical', '/images/items/medical/new-item.png');
```

### 4. Fallback Icons

If no image is provided, the system uses category-based emoji icons:

```typescript
const categoryIcons = {
  medical: '🏥',
  electronics: '💻', 
  consumables: '🍖',
  valuables: '💰',
  keycards: '🗝️'
}
```

To change these fallback icons, edit the `categoryIcons` object in:
- `CaseOpeningCarousel.tsx` (line 45)
- `ItemReveal.tsx` (line 65)

## Managing Cases

### 1. Adding New Cases

```sql
INSERT INTO case_types (name, price, description, image_url, rarity_distribution) VALUES
(
  'New Case Name',
  2000,
  'Description of the new case and what players can expect',
  '/images/cases/new-case.png',
  '{
    "common": 50,
    "uncommon": 30,
    "rare": 15,
    "epic": 4,
    "legendary": 1
  }'::jsonb
);
```

### 2. Modifying Case Properties

```sql
-- Update case price
UPDATE case_types SET price = 1500 WHERE name = 'Case Name';

-- Update case description
UPDATE case_types SET description = 'New description' WHERE name = 'Case Name';

-- Update rarity distribution
UPDATE case_types SET rarity_distribution = '{
  "common": 40,
  "uncommon": 35,
  "rare": 20,
  "epic": 4,
  "legendary": 1
}'::jsonb WHERE name = 'Case Name';
```

### 3. Case Rarity Distribution

The `rarity_distribution` field controls the probability of getting items of each rarity:

```json
{
  "common": 60,     // 60% chance
  "uncommon": 25,   // 25% chance  
  "rare": 10,       // 10% chance
  "epic": 4,        // 4% chance
  "legendary": 1    // 1% chance
}
```

**Note**: Percentages should add up to 100.

### 4. Disabling Cases

```sql
-- Temporarily disable a case
UPDATE case_types SET is_active = false WHERE name = 'Case Name';

-- Re-enable a case
UPDATE case_types SET is_active = true WHERE name = 'Case Name';
```

## Managing Case Images

### 1. Image Storage Location

Case images should be stored in `public/images/cases/`:

```
public/
  images/
    cases/
      scav-case.png
      pmc-case.png
      labs-case.png
      new-case.png
```

### 2. Image Requirements

- **Format**: PNG or JPG
- **Size**: 400x300 pixels recommended
- **Style**: Should match the Tarkov aesthetic
- **Background**: Can be transparent or themed

### 3. Adding Images to Cases

```sql
UPDATE case_types 
SET image_url = '/images/cases/new-case.png' 
WHERE name = 'New Case Name';
```

### 4. Fallback Display

If no image is provided, cases display a default box emoji (📦).

## Database Management

### 1. Current Database Schema

The system uses three main tables:

#### `case_types` Table
- `id`: UUID primary key
- `name`: Unique case name
- `price`: Case opening cost
- `description`: Case description
- `image_url`: Path to case image
- `rarity_distribution`: JSON object with rarity percentages
- `is_active`: Boolean to enable/disable case

#### `tarkov_items` Table
- `id`: UUID primary key
- `name`: Unique item name
- `rarity`: Item rarity level
- `base_value`: Base currency value
- `category`: Item category
- `image_url`: Path to item image
- `description`: Item description
- `is_active`: Boolean to enable/disable item

#### `case_item_pools` Table
- `case_type_id`: Reference to case
- `item_id`: Reference to item
- `weight`: Probability weight
- `value_multiplier`: Currency multiplier

### 2. Viewing Current Data

```sql
-- View all active cases
SELECT name, price, description FROM case_types WHERE is_active = true;

-- View all items by category
SELECT name, rarity, base_value, category FROM tarkov_items 
WHERE is_active = true ORDER BY category, rarity;

-- View case-item relationships
SELECT ct.name as case_name, ti.name as item_name, cip.weight, cip.value_multiplier
FROM case_item_pools cip
JOIN case_types ct ON cip.case_type_id = ct.id
JOIN tarkov_items ti ON cip.item_id = ti.id
ORDER BY ct.name, ti.rarity;
```

### 3. Backup and Restore

```bash
# Backup case data
pg_dump -h your-host -U your-user -d your-db -t case_types -t tarkov_items -t case_item_pools > case_backup.sql

# Restore case data
psql -h your-host -U your-user -d your-db < case_backup.sql
```

## Configuration Options

### 1. Carousel Animation Settings

**File**: `packages/frontend/src/components/games/CaseOpeningCarousel.tsx`

```typescript
// Animation timing configuration (lines 90-95)
const animationConfig: CarouselAnimationConfig = {
  totalItems: items.length,
  itemWidth,
  winningIndex: safeWinningIndex,
  spinDuration: 2000,        // 2 seconds fast spin
  decelerationDuration: 3000, // 3 seconds deceleration
  finalPosition: -(safeWinningIndex * itemWidth - centerOffset),
  easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
}
```

### 2. Carousel Display Settings

```typescript
// Carousel dimensions (lines 60-65)
const itemWidth = 120        // Width of each item in pixels
const visibleItems = 5       // Number of items visible at once
const viewportWidth = visibleItems * itemWidth
const centerOffset = viewportWidth / 2 - itemWidth / 2
```

### 3. Particle Effects

```typescript
// Rarity-based particle counts (ItemReveal.tsx lines 45-65)
const rarityConfig = {
  common: {
    particles: ['✨', '💫', '⚪'],
    particleCount: 6
  },
  legendary: {
    particles: ['⭐', '🌟', '✨', '💫'],
    particleCount: 16
  }
}
```

## Troubleshooting

### 1. Items Not Appearing in Carousel

**Check:**
1. Item is active: `SELECT * FROM tarkov_items WHERE name = 'Item Name' AND is_active = true;`
2. Item is in case pool: `SELECT * FROM case_item_pools WHERE item_id = (SELECT id FROM tarkov_items WHERE name = 'Item Name');`
3. Case is active: `SELECT * FROM case_types WHERE name = 'Case Name' AND is_active = true;`

### 2. Images Not Loading

**Check:**
1. Image file exists in correct directory
2. Image path in database is correct
3. Image file permissions are readable
4. Image format is supported (PNG, JPG, WebP)

### 3. Carousel Animation Issues

**Common fixes:**
1. Clear browser cache
2. Check browser console for JavaScript errors
3. Verify item data structure is complete
4. Check that winning index is within bounds

### 4. Database Connection Issues

**Check:**
1. Database credentials in environment variables
2. Network connectivity to database
3. Database permissions for user account
4. Table existence and structure

### 5. Case Opening Failures

**Check:**
1. User has sufficient balance
2. Case is active and available
3. Case has items in its pool
4. API endpoints are responding correctly

## Example Workflows

### Adding a Complete New Case

1. **Create the case:**
```sql
INSERT INTO case_types (name, price, description, image_url, rarity_distribution) VALUES
('Elite Case', 3000, 'Premium case with high-value items', '/images/cases/elite-case.png', 
'{"common": 35, "uncommon": 30, "rare": 20, "epic": 12, "legendary": 3}'::jsonb);
```

2. **Add items to the case pool:**
```sql
INSERT INTO case_item_pools (case_type_id, item_id, weight, value_multiplier)
SELECT 
  (SELECT id FROM case_types WHERE name = 'Elite Case'),
  ti.id,
  CASE ti.rarity
    WHEN 'common' THEN 4.0
    WHEN 'uncommon' THEN 6.0
    WHEN 'rare' THEN 8.0
    WHEN 'epic' THEN 5.0
    WHEN 'legendary' THEN 1.5
  END,
  CASE ti.rarity
    WHEN 'common' THEN 1.5
    WHEN 'uncommon' THEN 2.0
    WHEN 'rare' THEN 3.0
    WHEN 'epic' THEN 4.0
    WHEN 'legendary' THEN 6.0
  END
FROM tarkov_items ti WHERE ti.is_active = true;
```

3. **Add case image to filesystem:**
```bash
# Copy image to correct location
cp elite-case.png public/images/cases/
```

### Adding a New Item Category

1. **Update database constraint:**
```sql
ALTER TABLE tarkov_items 
DROP CONSTRAINT tarkov_items_category_check;

ALTER TABLE tarkov_items 
ADD CONSTRAINT tarkov_items_category_check 
CHECK (category IN ('medical', 'electronics', 'consumables', 'valuables', 'keycards', 'weapons'));
```

2. **Add category icon:**
```typescript
// In CaseOpeningCarousel.tsx and ItemReveal.tsx
const categoryIcons = {
  medical: '🏥',
  electronics: '💻',
  consumables: '🍖',
  valuables: '💰',
  keycards: '🗝️',
  weapons: '🔫'  // New category
}
```

3. **Create items in new category:**
```sql
INSERT INTO tarkov_items (name, rarity, base_value, category, description) VALUES
('AK-74', 'rare', 800, 'weapons', 'Assault rifle'),
('Glock 17', 'uncommon', 300, 'weapons', 'Pistol');
```

This guide provides comprehensive coverage of managing all aspects of the carousel system. For additional help, refer to the source code comments and database schema documentation.