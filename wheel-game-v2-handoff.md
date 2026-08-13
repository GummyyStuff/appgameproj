# Wheel of Chance v2 - Complete Implementation Plan

**Created**: 2026-08-12  
**Status**: Planning Complete, Ready for Implementation  
**Purpose**: Handoff document for AI model to implement Wheel of Chance v2

---

## Executive Summary

Redesigning the Wheel of Chance game to replace redundant bonus segments with:
1. **Environment System**: Per-player global modifiers that last 3 spins, randomly selected from a pool
2. **Bonus Wheel Segment**: Single rare segment that triggers automatic re-spin with all multipliers doubled
3. **Tarkov-themed environments**: 5 environment types inspired by Escape from Tarkov lore

---

## Current State Analysis

### Existing Implementation
- **Location**: `packages/backend/src/services/game-engine/wheel-of-chance-game.ts`
- **Layout**: 12 segments (9 base multipliers × 35° + 3 bonus segments × 15°)
- **Base Multipliers**: 0x, 0.5x, 1x, 1.5x, 2x, 3x, 5x, 10x, 50x (all bettable)
- **Bonus Types**: `free_spin`, `double_bet`, `double_winnings`, `jackpot` (non-bettable)

### Problems Identified
1. **Free Spin** is functionally identical to landing on 1x with all bets - redundant
2. **Double Bet** (total bet × 2) is confusingly similar to a 2x multiplier segment
3. **Double Winnings** (multiplier payouts × 2) is also confusing and overlaps with Double Bet
4. **Jackpot** (total bet × 100) is the only truly distinct bonus
5. Bonus segments are randomly distributed, creating no strategic depth or anticipation

### Key Insight
Players CAN bet on 0x and 1x segments (all 9 base segments have `bettable: true`). Only the 3 thin bonus segments between them are non-bettable.

---

## Design Decisions (All Confirmed)

### ✅ Confirmed Decisions

1. **Remove all old bonus types**: `free_spin`, `double_bet`, `double_winnings`
2. **Remove Jackpot**: Replace entirely with new system
3. **New layout**: 10 segments (9 base + 1 bonus wheel segment)
4. **Environment scope**: Per-player (not global server-wide)
5. **Environment duration**: 3 spins, then randomly select new environment
6. **Environment selection**: Random from pool (not cycling)
7. **Bonus wheel trigger**: Land on bonus wheel segment (non-bettable, rare)
8. **Bonus wheel effect**: Auto re-spin with all multipliers doubled
9. **Bonus wheel stacking**: Doubled multipliers stack with environment modifiers
10. **Bonus wheel auto-spin**: Automatic, no player interaction needed
11. **Betting on 0x/0.5x**: Keep bettable (players might want to for some reason)
12. **No Trader Favor**: Removed from environment pool
13. **Environment pool size**: 5 environments (Clear Skies, Scav Raid, EMP Strike, Thermal Scan, Blackout)

---

## Environment System Design

### Environment Types (Tarkov-Themed)

| Environment | Effect | Tarkov Inspiration | Visual Theme |
|---|---|---|---|
| **Clear Skies** | No modifier, baseline | Normal raid conditions | Neutral industrial |
| **Scav Raid** | 5 random segments get 2x-10x multipliers | Scavenger ambush chaos | Distorted, chaotic overlays |
| **EMP Strike** | 1-3 random segments get 5x-20x multipliers | Electronic warfare, power surge | Electric arcs, glitch effects |
| **Thermal Scan** | 1 random segment is "hot" - pays 10x | Thermal imaging highlight | Glowing heat signature on segment |
| **Blackout** | All multipliers shift up one tier (0.5x→1x, 1x→1.5x, etc.) | Night raid, limited visibility | Darkened wheel, shifted colors |

### Environment Mechanics

**State Structure**:
```typescript
interface EnvironmentState {
  type: 'clear_skies' | 'scav_raid' | 'emp_strike' | 'thermal_scan' | 'blackout'
  spins_remaining: number  // 3, 2, 1, then changes
  affected_segments?: number[]  // which segments are modified (for Scav Raid, EMP Strike, Thermal Scan)
}
```

**Application Order**:
1. Start with base wheel layout (9 multipliers + 1 bonus segment)
2. Apply environment modifiers to segment multipliers
3. Spin wheel (weighted by segment angles)
4. If bonus wheel segment hit → trigger bonus wheel transformation
5. Apply bonus wheel 2x multiplier to all segments
6. Calculate final payout

**Example**: 
- Base: 5x segment
- Scav Raid adds 3x boost → 15x
- Bonus wheel doubles → 30x
- Player bet ₽100 on 5x → wins ₽3000

### Environment Selection

**Provably Fair**: Environment selection uses the same provably fair system as spin outcomes
- Generate environment sequence at session start (or when current environment expires)
- Each environment lasts exactly 3 spins
- Random selection from pool of 5 environments
- Player can see current environment and spins remaining

**Visual Feedback**:
- Show environment name and icon above wheel
- Show "Spins remaining: X" counter
- Visual effects overlay on wheel during environment
- Transition animation when environment changes

---

## Bonus Wheel System Design

### Trigger Condition
- Main wheel lands on bonus wheel segment (1 of 10 segments, ~10% probability based on angle)
- Bonus segment is non-bettable

### Effect Sequence

1. **Hold Bets**: Player's current bets are held (not paid out)
2. **Transform Wheel**: All segment multipliers are doubled for next spin
3. **Auto Re-spin**: Automatic spin occurs with held bets on transformed wheel
4. **Calculate Payout**: Use transformed wheel multipliers
5. **Reset**: Return to normal wheel for next spin

### Example Flow

**Scenario**: Player bets ₽100 on 5x segment
1. Spin lands on bonus wheel segment
2. Wheel transforms: 5x → 10x, 2x → 4x, 0.5x → 1x, etc.
3. Auto re-spin lands on 5x segment (now 10x)
4. Player wins ₽100 × 10 = ₽1000

**With Environment Stacking**:
- Environment: Scav Raid (5x segment has +3x boost → 8x)
- Bonus wheel doubles → 16x
- Player wins ₽100 × 16 = ₽1600

### State Structure

```typescript
interface BonusWheelState {
  active: boolean
  held_bets?: WheelBetPlacement[]
  trigger_spin_result?: WheelOfChanceResult
}
```

### Animation Requirements

1. Bonus wheel segment hit → pause and show "BONUS WHEEL!" message
2. Wheel transformation animation (segments glow, multipliers update visually)
3. Brief pause for dramatic effect
4. Auto re-spin with transformed wheel
5. Show final payout with breakdown (base multiplier × environment × bonus wheel)

---

## New Wheel Layout

### Segment Configuration

**Total**: 10 segments (was 12)

**Base Segments**: 9 segments
- Angle: `(360 - BONUS_ANGLE) / 9` degrees each
- If BONUS_ANGLE = 15°, then each base = 38.33°
- All remain bettable
- Multipliers unchanged: 0x, 0.5x, 1x, 1.5x, 2x, 3x, 5x, 10x, 50x

**Bonus Segment**: 1 segment
- Angle: 15° (same as old bonus segments)
- Non-bettable
- Type: `bonus_wheel`
- Label: "BONUS" or "WHEEL"
- Color: Distinctive (gold/yellow to stand out)

### Layout Generation

**File**: `packages/frontend/src/utils/wheel-layout.ts`

**Changes**:
- Remove `SPECIAL_POOL` and all old bonus types
- New layout: 9 base segments + 1 bonus segment
- Bonus segment position: Can be fixed (e.g., position 9) or random
- Recommendation: Random position for variety

**Code Structure**:
```typescript
export function generateWheelLayout(seed?: number): WheelSegment[] {
  const rng = new SeededRandom(seed ?? Math.floor(Math.random() * 2147483647))
  
  // Generate 9 base segments
  const baseSegments = BASE_SEGMENTS.map((config, index) => ({
    index,
    type: 'multiplier' as const,
    label: config.label,
    multiplier: config.multiplier,
    color: config.color,
    // Calculate angles based on BONUS_ANGLE
    startAngle: 0, // Will be calculated
    endAngle: 0,   // Will be calculated
    bettable: true
  }))
  
  // Insert bonus segment at random position
  const bonusPosition = rng.nextInt(0, 9)
  const bonusSegment: WheelSegment = {
    index: bonusPosition,
    type: 'bonus_wheel' as const,
    label: 'BONUS',
    multiplier: 0,
    color: '#fbbf24', // Gold
    startAngle: 0,
    endAngle: 0,
    bettable: false
  }
  
  // Calculate angles and return
  return calculateAngles([...baseSegments, bonusSegment])
}
```

---

## Complete Spin Flow (New)

```
1. Player sees current environment + spins remaining
2. Player places bets on base segments (0x through 50x)
3. Player clicks SPIN
4. Frontend sends to backend:
   - amount (total bet)
   - bets (array of {segmentIndex, amount})
   - wheel_layout (current 10-segment layout)
   - environment_state (current environment)
   - bonus_wheel_state (if bonus wheel is active)

5. Backend processes:
   a. Validate bet and layout
   b. Check if bonus wheel is active (auto re-spin mode)
      - If YES: Use transformed layout (all multipliers ×2)
      - If NO: Apply environment modifiers to layout
   c. Spin wheel (provably fair, weighted by segment angles)
   d. Determine winning segment
   e. Calculate payout:
      - If multiplier segment: bet_amount × modified_multiplier
      - If bonus wheel segment: Trigger bonus wheel flow
   f. If bonus wheel triggered:
      - Hold bets
      - Set bonus_wheel_state.active = true
      - Return result with bonus_wheel_state
      - Frontend will auto-spin again
   g. Decrement environment spins_remaining
   h. If spins_remaining == 0:
      - Generate new environment (provably fair)
      - Set spins_remaining = 3
   i. Return result with updated environment_state

6. Frontend receives result:
   - If bonus wheel triggered:
     - Show "BONUS WHEEL!" animation
     - Transform wheel visually (all ×2)
     - Auto-spin again (send new request with bonus_wheel_state.active = true)
   - If normal result:
     - Show payout
     - Update environment display
     - Clear bets for next spin

7. If bonus wheel auto-spin:
   - Backend uses transformed layout (all ×2)
   - Calculate final payout
   - Reset bonus_wheel_state.active = false
   - Return final result
```

---

## Type Definitions (New)

### Backend Types

**File**: `packages/backend/src/types/database.ts`

```typescript
// New environment types
export type EnvironmentType = 'clear_skies' | 'scav_raid' | 'emp_strike' | 'thermal_scan' | 'blackout'

export interface EnvironmentState {
  type: EnvironmentType
  spins_remaining: number
  affected_segments?: number[]  // For Scav Raid, EMP Strike, Thermal Scan
}

export interface BonusWheelState {
  active: boolean
  held_bets?: WheelBetPlacement[]
}

// Updated segment type
export type WheelSegmentType = 'multiplier' | 'bonus_wheel'

// Updated result
export interface WheelOfChanceResult {
  wheel_layout: WheelSegment[]
  bets: WheelBetPlacement[]
  winning_segment: number
  segment_type: WheelSegmentType
  multiplier: number
  total_bet: number
  total_win: number
  special_triggered: WheelSegmentType | null
  environment_state: EnvironmentState
  bonus_wheel_state: BonusWheelState
  is_bonus_spin: boolean  // True if this is the auto re-spin from bonus wheel
}

// Updated bet structure
export interface WheelBet extends GameBet {
  gameType: 'wheel_of_chance'
  bets: WheelBetPlacement[]
  wheel_layout?: WheelSegment[]
  environment_state?: EnvironmentState
  bonus_wheel_state?: BonusWheelState
}
```

### Frontend Types

**File**: `packages/frontend/src/types/wheel.ts`

```typescript
// Mirror backend types
export type EnvironmentType = 'clear_skies' | 'scav_raid' | 'emp_strike' | 'thermal_scan' | 'blackout'

export interface EnvironmentState {
  type: EnvironmentType
  spins_remaining: number
  affected_segments?: number[]
}

export interface BonusWheelState {
  active: boolean
  held_bets?: WheelBetPlacement[]
}

export type WheelSegmentType = 'multiplier' | 'bonus_wheel'

export interface WheelOfChanceResult {
  wheel_layout: WheelSegment[]
  bets: WheelBetPlacement[]
  winning_segment: number
  segment_type: WheelSegmentType
  multiplier: number
  total_bet: number
  total_win: number
  special_triggered: WheelSegmentType | null
  environment_state: EnvironmentState
  bonus_wheel_state: BonusWheelState
  is_bonus_spin: boolean
}

export interface WheelGameResponse {
  success: boolean
  game_result: WheelOfChanceResult
  bet_amount: number
  win_amount: number
  net_result: number
  new_balance: number
  game_id: string
  error?: string
}
```

---

## Files to Modify

### Backend Changes

#### 1. `packages/backend/src/types/database.ts`
- Add `EnvironmentType`, `EnvironmentState`, `BonusWheelState`
- Update `WheelSegmentType` to include `'bonus_wheel'`
- Update `WheelOfChanceResult` to include environment and bonus state
- Update `WheelBet` to include environment and bonus state

#### 2. `packages/backend/src/services/game-engine/wheel-of-chance-game.ts`
**Complete rewrite of `play()` method**:
- Handle environment state (apply modifiers, decrement spins, generate new environments)
- Handle bonus wheel state (transform layout, calculate bonus spin)
- Remove all old bonus type logic
- New method: `applyEnvironmentModifiers(layout, environment)`
- New method: `transformLayoutForBonusWheel(layout)`
- New method: `generateNewEnvironment(provablyFair)`

#### 3. `packages/backend/src/routes/games.ts`
**Update spin endpoint**:
- Accept `environment_state` and `bonus_wheel_state` in request
- Return updated environment and bonus state in response
- Handle bonus wheel auto-spin flow

#### 4. New File: `packages/backend/src/services/game-engine/wheel-environment.ts`
**Environment logic**:
- `applyEnvironmentModifiers(layout, environment)`: Modify segment multipliers based on environment
- `generateNewEnvironment(provablyFair, seed)`: Provably fair environment selection
- Environment-specific logic (Scav Raid: pick 5 segments, EMP Strike: pick 1-3, etc.)

### Frontend Changes

#### 1. `packages/frontend/src/types/wheel.ts`
- Mirror backend type updates

#### 2. `packages/frontend/src/utils/wheel-layout.ts`
**Complete rewrite**:
- Remove `SPECIAL_POOL` and old bonus types
- New layout: 9 base + 1 bonus segment
- Random bonus segment position
- New function: `applyEnvironmentModifiers(layout, environment)`: Apply modifiers for display

#### 3. `packages/frontend/src/pages/WheelOfChancePage.tsx`
**Major updates**:
- Add `environmentState` state
- Add `bonusWheelState` state
- Handle bonus wheel auto-spin flow (detect bonus trigger, auto-spin again)
- Display environment info (name, spins remaining)
- Pass environment and bonus state to backend
- Handle environment transitions

#### 4. `packages/frontend/src/components/games/WheelSpinner.tsx`
**Visual updates**:
- Bonus wheel transformation animation (segments glow, multipliers update)
- Environment visual effects overlay
- Different visual for bonus segment (gold, distinctive)

#### 5. `packages/frontend/src/components/games/WheelBettingPanel.tsx`
**Minor updates**:
- Show environment info if relevant
- No changes to betting logic (all segments remain bettable except bonus)

#### 6. New File: `packages/frontend/src/components/games/WheelEnvironmentBar.tsx`
**Environment display**:
- Show current environment name and icon
- Show "Spins remaining: X" counter
- Visual theme matching environment
- Transition animation when environment changes

#### 7. New File: `packages/frontend/src/components/games/WheelBonusAnimation.tsx`
**Bonus wheel animation**:
- "BONUS WHEEL!" message
- Wheel transformation sequence
- Dramatic pause
- Auto re-spin animation

### Documentation Updates

#### 1. `docs/game-rules/wheel-of-chance.md`
**Complete rewrite**:
- Remove all old bonus type descriptions
- Document environment system
- Document bonus wheel mechanics
- Update examples and scenarios

---

## Implementation Order (Recommended)

### Phase 1: Backend Foundation
1. Update `packages/backend/src/types/database.ts` with new types
2. Create `packages/backend/src/services/game-engine/wheel-environment.ts` with environment logic
3. Rewrite `packages/backend/src/services/game-engine/wheel-of-chance-game.ts` to handle environments + bonus wheel
4. Update `packages/backend/src/routes/games.ts` spin endpoint
5. Write tests for new logic

### Phase 2: Frontend Foundation
1. Update `packages/frontend/src/types/wheel.ts` with new types
2. Rewrite `packages/frontend/src/utils/wheel-layout.ts` with new layout
3. Create `packages/frontend/src/components/games/WheelEnvironmentBar.tsx`
4. Update `packages/frontend/src/pages/WheelOfChancePage.tsx` with environment state + bonus wheel flow
5. Update `packages/frontend/src/components/games/WheelSpinner.tsx` with bonus wheel animation

### Phase 3: Polish
1. Create `packages/frontend/src/components/games/WheelBonusAnimation.tsx`
2. Add environment visual effects to WheelSpinner
3. Update `docs/game-rules/wheel-of-chance.md`
4. Test full flow end-to-end

---

## Key Implementation Details

### Environment Modifier Logic

**Scav Raid** (5 random segments get 2x-10x):
```typescript
function applyScavRaid(layout: WheelSegment[], rng: SeededRandom): WheelSegment[] {
  const baseSegments = layout.filter(s => s.type === 'multiplier')
  const selectedIndices = selectRandomIndices(baseSegments, 5, rng)
  
  return layout.map((segment, index) => {
    if (selectedIndices.includes(index)) {
      const boost = rng.nextInt(2, 10)
      return { ...segment, multiplier: segment.multiplier + boost }
    }
    return segment
  })
}
```

**EMP Strike** (1-3 random segments get 5x-20x):
```typescript
function applyEmpStrike(layout: WheelSegment[], rng: SeededRandom): WheelSegment[] {
  const baseSegments = layout.filter(s => s.type === 'multiplier')
  const count = rng.nextInt(1, 3)
  const selectedIndices = selectRandomIndices(baseSegments, count, rng)
  
  return layout.map((segment, index) => {
    if (selectedIndices.includes(index)) {
      const boost = rng.nextInt(5, 20)
      return { ...segment, multiplier: segment.multiplier + boost }
    }
    return segment
  })
}
```

**Thermal Scan** (1 segment becomes 10x):
```typescript
function applyThermalScan(layout: WheelSegment[], rng: SeededRandom): WheelSegment[] {
  const baseSegments = layout.filter(s => s.type === 'multiplier')
  const selectedIndex = selectRandomIndex(baseSegments, rng)
  
  return layout.map((segment, index) => {
    if (index === selectedIndex) {
      return { ...segment, multiplier: 10 }
    }
    return segment
  })
}
```

**Blackout** (all multipliers shift up one tier):
```typescript
function applyBlackout(layout: WheelSegment[]): WheelSegment[] {
  const tierMap = [0, 0.5, 1, 1.5, 2, 3, 5, 10, 50]
  
  return layout.map(segment => {
    if (segment.type !== 'multiplier') return segment
    const currentIndex = tierMap.indexOf(segment.multiplier)
    const nextIndex = Math.min(currentIndex + 1, tierMap.length - 1)
    return { ...segment, multiplier: tierMap[nextIndex] }
  })
}
```

### Bonus Wheel Transformation

```typescript
function transformLayoutForBonusWheel(layout: WheelSegment[]): WheelSegment[] {
  return layout.map(segment => {
    if (segment.type !== 'multiplier') return segment
    return { ...segment, multiplier: segment.multiplier * 2 }
  })
}
```

### Environment Generation (Provably Fair)

```typescript
async function generateNewEnvironment(
  provablyFair: ProvablyFairService
): Promise<EnvironmentState> {
  const context = await provablyFair.createContext()
  const outcome = await provablyFair.generateOutcome(context)
  
  const environments: EnvironmentType[] = [
    'clear_skies', 'scav_raid', 'emp_strike', 'thermal_scan', 'blackout'
  ]
  
  const envIndex = Math.floor(outcome.randomValue * environments.length)
  const envType = environments[envIndex]
  
  // For environments that affect specific segments, generate affected indices
  let affectedSegments: number[] | undefined
  if (envType === 'scav_raid' || envType === 'emp_strike' || envType === 'thermal_scan') {
    // Generate affected segment indices using the same outcome
    affectedSegments = generateAffectedSegments(outcome, envType)
  }
  
  return {
    type: envType,
    spins_remaining: 3,
    affected_segments: affectedSegments
  }
}
```

---

## Testing Considerations

### Backend Tests

1. **Environment modifier tests**: Verify each environment correctly modifies multipliers
2. **Bonus wheel transformation tests**: Verify all multipliers double correctly
3. **Bonus wheel auto-spin tests**: Verify held bets are used, transformed layout is applied
4. **Environment expiration tests**: Verify new environment generated after 3 spins
5. **Provably fair tests**: Verify environment selection is deterministic and verifiable
6. **Stacking tests**: Verify environment + bonus wheel stack correctly

### Frontend Tests

1. **Layout generation tests**: Verify 10-segment layout with 1 bonus segment
2. **Environment display tests**: Verify environment info shows correctly
3. **Bonus wheel animation tests**: Verify transformation animation triggers
4. **Auto-spin flow tests**: Verify bonus wheel triggers auto re-spin
5. **Environment transition tests**: Verify smooth transition when environment changes

---

## Potential Issues & Solutions

### Issue 1: Bonus Wheel Segment Position
**Problem**: Should bonus segment be at fixed position or random?  
**Solution**: Random position for variety. Use provably fair RNG to determine position during layout generation.

### Issue 2: Environment Visual Clarity
**Problem**: Players might not notice environment modifiers on segments.  
**Solution**: 
- Highlight affected segments with glowing borders
- Show tooltip on hover explaining modifier
- Display environment name prominently above wheel

### Issue 3: Bonus Wheel Auto-Spin Timing
**Problem**: Auto re-spin might feel jarring if too fast.  
**Solution**: 
- 1 second pause after bonus trigger
- 0.5 second transformation animation
- Normal spin duration for re-spin
- Clear visual feedback throughout

### Issue 4: Environment State Synchronization
**Problem**: Frontend and backend environment state might drift.  
**Solution**: 
- Backend is source of truth
- Frontend sends current state with each spin request
- Backend validates and corrects if needed
- Return updated state in response

### Issue 5: Provably Fair for Environments
**Problem**: Environment selection needs to be verifiable.  
**Solution**: 
- Use same provably fair system as spin outcomes
- Generate environment sequence at session start
- Store in user session or generate deterministically from seed
- Allow verification of environment choices

---

## Success Criteria

1. ✅ All old bonus types removed
2. ✅ New 10-segment layout working
3. ✅ Environment system functional (5 environments, 3 spins each)
4. ✅ Bonus wheel triggers and auto re-spins correctly
5. ✅ Environment + bonus wheel stacking works
6. ✅ Visual feedback clear for environments and bonus wheel
7. ✅ Provably fair for both spins and environment selection
8. ✅ All tests passing
9. ✅ Documentation updated
10. ✅ No breaking changes to existing game flow

---

## Questions for Implementation

**None remaining** - all questions resolved during planning.

---

## Notes for Implementing AI

1. **Start with backend**: Get the logic working before frontend
2. **Test incrementally**: Test each environment type individually
3. **Provably fair is critical**: Ensure environment selection uses the same system as spins
4. **Animation timing**: Bonus wheel sequence needs careful timing (not too fast, not too slow)
5. **State management**: Environment and bonus wheel state need to be tracked carefully
6. **Backward compatibility**: Old game results in database won't have environment/bonus state - handle gracefully
7. **Performance**: Environment modifier application should be fast (no complex calculations)
8. **Mobile responsive**: Environment bar and bonus animations must work on mobile

---

## Contact

If you have questions during implementation, refer to:
- `docs/game-rules/wheel-of-chance.md` (after update)
- `packages/backend/src/services/game-engine/provably-fair-service.ts` (provably fair system)
- `packages/frontend/src/utils/wheel-layout.ts` (layout generation)
- `packages/backend/src/services/game-engine/wheel-of-chance-game.ts` (game logic)

---

**End of Handoff Document**
