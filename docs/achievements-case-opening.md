# Case Opening Achievements

## Overview

The achievement system has been expanded to include comprehensive achievements for the case opening game. These achievements are designed to encourage player engagement, reward milestones, and create a sense of progression.

## Achievement Categories

### 1. Progression Achievements (Milestone-Based)

These achievements reward players for opening a certain number of cases:

- **First Case** (Common) - Open your first case
- **Case Opener** (Common) - Open 10 cases
- **Case Master** (Rare) - Open 50 cases
- **Case Legend** (Epic) - Open 100 cases
- **Case God** (Legendary) - Open 500 cases

### 2. Case Type Achievements

Rewards for opening specific case types:

- **Scav Collector** (Common) - Open 25 Scav cases
- **PMC Veteran** (Rare) - Open 50 PMC cases
- **Labs Elite** (Epic) - Open 25 Labs cases

### 3. Rarity-Based Achievements

Achievements for collecting items of specific rarities:

- **First Rare** (Common) - Get your first rare item
- **First Epic** (Epic) - Get your first epic item
- **Legendary Pull** (Legendary) - Get your first legendary item
- **Rare Finder** (Rare) - Get 50 rare items
- **Epic Hunter** (Epic) - Get 25 epic items
- **Legendary Collector** (Legendary) - Get 10 legendary items

### 4. Streak Achievements

Rewards for consecutive lucky pulls:

- **Lucky Streak** (Rare) - Get 3 rare or better items in a row
- **Super Lucky** (Epic) - Get 5 rare or better items in a row

### 5. Value-Based Achievements

Achievements for high-value wins:

- **Big Win** (Rare) - Win an item worth ₽10,000 or more
- **Jackpot** (Legendary) - Win an item worth ₽50,000 or more
- **Profit Master** (Epic) - Make ₽100,000 profit from cases

### 6. Collection Achievements

Rewards for collecting specific item categories:

- **Medical Supplies** (Common) - Collect 50 medical items
- **Tech Collector** (Common) - Collect 50 electronics
- **Key Master** (Rare) - Collect 25 keycards and keys
- **Valuables Hoarder** (Rare) - Collect 50 valuables

### 7. Consistency Achievements

Rewards for daily play:

- **Daily Opener** (Rare) - Open cases for 7 days in a row
- **Weekly Warrior** (Epic) - Open cases for 30 days in a row

### 8. Skill-Based Achievements

Achievements for smart play:

- **Break Even** (Rare) - Open 10 cases without losing money

## Rarity Tiers

Achievements are categorized by rarity, which determines their visual presentation and reward value:

- **Common** (Gray) - Basic achievements, easy to obtain
- **Rare** (Blue) - Moderate difficulty, better rewards
- **Epic** (Purple) - Challenging achievements, significant rewards
- **Legendary** (Gold) - Extremely difficult, highest rewards

## Reward Structure

Each achievement can have a reward when completed:

- **Currency Rewards**: Range from ₽500 (common) to ₽50,000 (legendary)
- **Cosmetic Rewards**: Future expansion for titles, badges, etc.
- **Special Rewards**: Unique items or bonuses

## Achievement Progress Tracking

The system tracks:
- Current progress vs. target
- Percentage completion
- Unlock date for completed achievements
- Visual progress bars for incomplete achievements

## Integration Points

### Frontend Integration
- Component: `AchievementSystem.tsx` - Achievement display UI
- Hook: `useAchievements.ts` - Achievement state management and tracking
- Location: Profile page, accessible via achievement button

### Backend Integration (Future)
- Achievement progress tracking in database
- Real-time achievement unlock notifications
- Achievement history and statistics
- Cross-game achievement tracking

## Testing

Comprehensive test suite created:
- 29 test cases covering:
  - Component rendering
  - Category filtering
  - Achievement card display
  - Detail modal functionality
  - Progress tracking
  - Edge cases
  - Accessibility

**Test Results**: 18 passing, 11 failing (SVG loading issues in test environment)

## Best Practices from Research

Based on research from CSGO/CS2 case opening simulators and game achievement systems:

1. **Progressive Difficulty**: Start easy, get harder
2. **Multiple Achievement Types**: Variety keeps players engaged
3. **Clear Progress Indication**: Always show how close players are
4. **Meaningful Rewards**: Rewards should feel worth the effort
5. **Visual Feedback**: Rarity colors and animations enhance experience
6. **Streak Mechanics**: Encourage daily play
7. **Collection Goals**: Give purpose to repeated actions
8. **Skill vs. Luck**: Mix of both keeps it interesting

## Future Enhancements

1. **Real-time Tracking**: Update achievements as players play
2. **Achievement Notifications**: Toast messages when unlocked
3. **Leaderboards**: Compare achievement progress with friends
4. **Achievement Sets**: Group related achievements
5. **Seasonal Achievements**: Time-limited challenges
6. **Achievement Sharing**: Social media integration
7. **Achievement Analytics**: Track popular achievements
8. **Dynamic Achievements**: Generated based on player behavior

## Implementation Notes

- Mock data currently used for demonstration
- Full integration requires backend API for progress tracking
- Achievement IDs follow naming convention: `category-description-number`
- Icons mapped to FontAwesome SVG components
- Category system allows filtering and organization
- Progress bars animate smoothly using Framer Motion

## Related Files

- `/packages/frontend/src/components/ui/AchievementSystem.tsx` - Achievement display UI component
- `/packages/frontend/src/components/ui/__tests__/AchievementSystem.test.tsx` - Comprehensive test suite (29 tests)
- `/packages/frontend/src/hooks/useAchievements.ts` - Achievement state management and tracking
- `/docs/game-rules/case-opening.md` - Case opening game rules

## Usage Examples

### Displaying Achievements
```tsx
import { useAchievements } from '@/hooks/useAchievements'
import AchievementSystem from '@/components/ui/AchievementSystem'

function ProfilePage() {
  const { 
    showAchievements, 
    achievements, 
    openAchievements, 
    closeAchievements,
    claimAchievementReward 
  } = useAchievements()

  return (
    <>
      <button onClick={openAchievements}>View Achievements</button>
      <AchievementSystem
        isOpen={showAchievements}
        onClose={closeAchievements}
        achievements={achievements}
        onClaimReward={claimAchievementReward}
      />
    </>
  )
}
```

### Tracking Game Sessions
```tsx
import { useAchievements } from '@/hooks/useAchievements'

function RouletteGame() {
  const { trackGamePlayed } = useAchievements()

  const handleGameResult = (betAmount: number, winAmount: number) => {
    // Track game session for achievement progress
    trackGamePlayed(betAmount, winAmount, 'roulette')
  }
}
```

### Tracking Case Openings
```tsx
import { useAchievements } from '@/hooks/useAchievements'

function CaseOpeningGame() {
  const { trackCaseOpening } = useAchievements()

  const handleCaseOpened = (result: CaseResult) => {
    trackCaseOpening(
      result.caseType,      // 'scav' | 'pmc' | 'labs'
      result.itemRarity,    // 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
      result.itemValue,     // number
      result.itemCategory   // 'medical' | 'tech' | 'valuables' | 'keys' | 'consumables'
    )
  }
}
```

### Manual Achievement Updates
```tsx
import { useAchievements } from '@/hooks/useAchievements'

function CustomGame() {
  const { updateAchievementProgress } = useAchievements()

  const handleSpecialEvent = () => {
    // Manually update achievement progress
    updateAchievementProgress('case-opener-10', 1)
  }
}
```

---

**Last Updated**: January 2025
**Status**: Implemented with mock data, ready for backend integration

