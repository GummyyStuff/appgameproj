# Case Opening Game Components Documentation

## Overview

This directory contains the refactored case opening game components that provide a clean, performant, and maintainable user experience. The components follow a simplified architecture with clear separation of concerns and unified state management.

## Component Architecture

```
CaseOpeningGame/
├── CaseOpeningGame.tsx          # Main container component
├── CaseSelector.tsx             # Case selection interface
├── CaseOpeningAnimation.tsx     # Unified animation system
├── CaseResult.tsx              # Result display component
├── CaseHistory.tsx             # Opening history display
├── CaseConfirmation.tsx        # Purchase confirmation dialog
├── ErrorBoundary.tsx           # Error handling component
├── VirtualizedCarousel.tsx     # Performance-optimized carousel
└── CaseOpeningCarousel.tsx     # Legacy carousel (deprecated)
```

## Core Components

### CaseOpeningGame

**Purpose**: Main container component that orchestrates the entire case opening experience.

**Key Features**:
- Simplified state management with clear phases
- Centralized error handling with user-friendly messages
- Performance monitoring and metrics collection
- Responsive design with mobile optimization

**Usage Example**:
```tsx
import CaseOpeningGame from './CaseOpeningGame'

function App() {
  return (
    <div className="app">
      <CaseOpeningGame />
    </div>
  )
}
```

**Props**: None (self-contained component)

**State Phases**:
- `idle`: Ready for case selection
- `loading`: Case opening request in progress
- `opening`: Setting up animation
- `animating`: Animation running
- `revealing`: Showing result (fallback)
- `complete`: Case opening finished
- `error`: Error state with recovery options

### CaseSelector

**Purpose**: Interface for selecting and purchasing cases.

**Key Features**:
- Visual case display with rarity indicators
- Price display with currency formatting
- Purchase confirmation with balance validation
- Responsive grid layout

**Usage Example**:
```tsx
import CaseSelector from './CaseSelector'

function CaseSelection() {
  const handleCaseSelect = (caseType) => {
    console.log('Selected case:', caseType)
  }

  return (
    <CaseSelector
      onCaseSelect={handleCaseSelect}
      availableCases={caseTypes}
      userBalance={1000}
    />
  )
}
```

**Props**:
- `onCaseSelect: (caseType: CaseType) => void` - Callback when case is selected
- `availableCases: CaseType[]` - Array of available case types
- `userBalance: number` - User's current balance
- `isLoading?: boolean` - Loading state for case data

### CaseOpeningAnimation

**Purpose**: Unified animation system supporting both carousel and reveal animations.

**Key Features**:
- Single interface for all animation types
- Performance-optimized carousel with virtualization
- Smooth phase transitions and completion callbacks
- Fallback to reveal animation on errors

**Usage Example**:
```tsx
import CaseOpeningAnimation from './CaseOpeningAnimation'

function AnimationContainer() {
  const animationConfig = {
    type: 'carousel',
    duration: 5000,
    easing: [0.25, 0.46, 0.45, 0.94],
    items: carouselItems,
    winningIndex: 15
  }

  const handleComplete = () => {
    console.log('Animation completed')
  }

  return (
    <CaseOpeningAnimation
      config={animationConfig}
      result={openingResult}
      onComplete={handleComplete}
      soundEnabled={true}
    />
  )
}
```

**Props**:
- `config: AnimationConfig` - Animation configuration
- `result?: CaseOpeningResult` - Case opening result
- `onComplete: () => void` - Completion callback
- `soundEnabled?: boolean` - Sound effects toggle

### CaseResult

**Purpose**: Displays the case opening result with celebration effects.

**Key Features**:
- Animated result reveal with particle effects
- Rarity-based color coding and effects
- Currency award display with formatting
- Action buttons for continuing or sharing

**Usage Example**:
```tsx
import CaseResult from './CaseResult'

function ResultDisplay() {
  const result = {
    itemWon: { name: 'AK-74', rarity: 'legendary', value: 500 },
    currencyAwarded: 100,
    caseType: { name: 'Weapon Case' }
  }

  const handleContinue = () => {
    console.log('Continue playing')
  }

  return (
    <CaseResult
      result={result}
      onContinue={handleContinue}
      onShare={() => {}}
      showCelebration={true}
    />
  )
}
```

**Props**:
- `result: CaseOpeningResult` - The case opening result
- `onContinue: () => void` - Continue playing callback
- `onShare?: () => void` - Share result callback
- `showCelebration?: boolean` - Show celebration effects

### CaseHistory

**Purpose**: Displays the user's case opening history.

**Key Features**:
- Chronological list of recent openings
- Item rarity indicators and values
- Responsive grid layout
- Performance-optimized rendering

**Usage Example**:
```tsx
import CaseHistory from './CaseHistory'

function HistoryView() {
  const history = [
    { itemWon: { name: 'AK-74', rarity: 'legendary' }, timestamp: new Date() },
    { itemWon: { name: 'M4A1', rarity: 'rare' }, timestamp: new Date() }
  ]

  return (
    <CaseHistory
      history={history}
      maxItems={10}
      onItemClick={(item) => console.log('Clicked:', item)}
    />
  )
}
```

**Props**:
- `history: CaseOpeningResult[]` - Array of case opening results
- `maxItems?: number` - Maximum items to display
- `onItemClick?: (item: CaseOpeningResult) => void` - Item click callback

## Performance Components

### VirtualizedCarousel

**Purpose**: High-performance carousel component with virtualization for smooth animations.

**Key Features**:
- Renders only 7 visible items at a time
- Hardware-accelerated animations
- Smooth 60 FPS performance
- Memory-efficient rendering

**Usage Example**:
```tsx
import VirtualizedCarousel from './VirtualizedCarousel'

function CarouselContainer() {
  const items = generateCarouselItems(100)
  const winningIndex = 15

  return (
    <VirtualizedCarousel
      items={items}
      winningIndex={winningIndex}
      phase="spinning"
      onComplete={() => console.log('Carousel complete')}
    />
  )
}
```

**Props**:
- `items: CarouselItemData[]` - Array of carousel items
- `winningIndex: number` - Index of the winning item
- `phase: AnimationPhase` - Current animation phase
- `onComplete?: () => void` - Completion callback

## Error Handling Components

### ErrorBoundary

**Purpose**: Catches and handles errors in the case opening game with graceful degradation.

**Key Features**:
- Catches JavaScript errors in component tree
- Displays user-friendly error messages
- Provides recovery options
- Logs errors for debugging

**Usage Example**:
```tsx
import CaseOpeningErrorBoundary from './ErrorBoundary'

function App() {
  return (
    <CaseOpeningErrorBoundary>
      <CaseOpeningGame />
    </CaseOpeningErrorBoundary>
  )
}
```

**Props**:
- `children: React.ReactNode` - Child components to wrap
- `fallback?: React.ComponentType` - Custom fallback component
- `onError?: (error: Error) => void` - Error callback

## Styling and Animation

### Animation Variants

The components use Framer Motion for animations with predefined variants:

```tsx
import { animationVariants } from '../../styles/animationVariants'

// Available variants:
animationVariants.fadeIn
animationVariants.slideUp
animationVariants.scaleIn
animationVariants.staggerChildren
```

### Responsive Design

All components are fully responsive with:
- Mobile-first design approach
- Touch-friendly interactions
- Adaptive layouts for different screen sizes
- Optimized performance on mobile devices

## Best Practices

### Component Usage

1. **State Management**: Use the `useCaseOpeningGame` hook for centralized state
2. **Error Handling**: Wrap components in `ErrorBoundary` for error recovery
3. **Performance**: Use `VirtualizedCarousel` for large item lists
4. **Accessibility**: All components support keyboard navigation and screen readers

### Performance Optimization

1. **Virtualization**: Use virtualized components for large datasets
2. **Memoization**: Components use React.memo where appropriate
3. **Lazy Loading**: Heavy components are lazy-loaded
4. **Animation Optimization**: Hardware-accelerated animations with 60 FPS target

### Testing

Each component includes comprehensive tests:
- Unit tests for component logic
- Integration tests for user workflows
- Performance tests for animation smoothness
- Accessibility tests for keyboard navigation

## Migration Guide

### From Legacy Components

The refactored components maintain backward compatibility while providing improved performance and maintainability:

1. **CaseOpeningGame**: Drop-in replacement for the old component
2. **CaseOpeningAnimation**: Unified interface replacing separate animation components
3. **VirtualizedCarousel**: Performance-optimized replacement for the old carousel

### Breaking Changes

- State management simplified from multiple boolean flags to single phase state
- Animation configuration now uses a unified interface
- Error handling centralized with user-friendly messages

## Troubleshooting

### Common Issues

1. **Animation Performance**: Ensure `VirtualizedCarousel` is used for large item lists
2. **State Management**: Use the centralized `useCaseOpeningGame` hook
3. **Error Handling**: Wrap components in `ErrorBoundary` for error recovery
4. **Mobile Performance**: Test on actual devices for performance validation

### Debug Tools

- State transition logging in development mode
- Performance monitoring with frame rate tracking
- Error logging with detailed context information
- User experience metrics collection
