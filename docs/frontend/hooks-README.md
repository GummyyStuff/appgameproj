# Case Opening Game Hooks API Documentation

## Overview

This directory contains custom React hooks that provide centralized logic for the case opening game system. The hooks follow a clean architecture with clear separation of concerns and comprehensive error handling.

## Hook Architecture

```
hooks/
├── useCaseOpeningGame.ts    # Centralized game state management
├── useCaseAnimation.ts      # Animation control and management
├── useCaseData.ts          # Data fetching and caching
├── useCaseOpening.ts       # API integration for case opening
├── useErrorHandling.ts     # Centralized error handling
└── usePerformanceMonitoring.ts # Performance metrics collection
```

## Core Hooks

### useCaseOpeningGame

**Purpose**: Centralized hook for managing case opening game state and logic.

**Features**:
- Simplified state machine with clear phases
- Centralized error handling and recovery
- Performance monitoring integration
- Optimistic updates for better UX

**API**:
```typescript
interface UseCaseOpeningGameReturn {
  gameState: SimplifiedGameState
  caseTypes: CaseType[]
  isLoadingCases: boolean
  error: string | null
  openCase: (caseType?: CaseType) => Promise<void>
  resetGame: () => void
  completeAnimation: (result: CaseOpeningResult) => void
  loadCaseTypes: () => Promise<void>
}
```

**Usage Example**:
```tsx
import { useCaseOpeningGame } from '../hooks/useCaseOpeningGame'

function CaseOpeningComponent() {
  const {
    gameState,
    caseTypes,
    isLoadingCases,
    error,
    openCase,
    resetGame,
    completeAnimation
  } = useCaseOpeningGame()

  const handleOpenCase = async (caseType) => {
    try {
      await openCase(caseType)
    } catch (error) {
      console.error('Failed to open case:', error)
    }
  }

  return (
    <div>
      {gameState.phase === 'idle' && (
        <CaseSelector
          cases={caseTypes}
          onSelect={handleOpenCase}
          loading={isLoadingCases}
        />
      )}
      {gameState.phase === 'error' && (
        <ErrorMessage error={error} onRetry={resetGame} />
      )}
    </div>
  )
}
```

**State Phases**:
- `idle`: Initial state, ready for case selection
- `loading`: Case opening request in progress
- `opening`: Setting up animation
- `animating`: Animation running
- `revealing`: Showing result (fallback)
- `complete`: Case opening finished successfully
- `error`: Error state with recovery options

### useCaseAnimation

**Purpose**: Manages animation state and provides animation control functions.

**Features**:
- Animation phase management
- Performance monitoring
- Fallback animation support
- Completion callbacks

**API**:
```typescript
interface UseCaseAnimationReturn {
  animationPhase: AnimationPhase
  startAnimation: (config: AnimationConfig) => Promise<void>
  stopAnimation: () => void
  isAnimating: boolean
  animationProgress: number
}
```

**Usage Example**:
```tsx
import { useCaseAnimation } from '../hooks/useCaseAnimation'

function AnimationController() {
  const {
    animationPhase,
    startAnimation,
    stopAnimation,
    isAnimating,
    animationProgress
  } = useCaseAnimation()

  const handleStartAnimation = async () => {
    const config = {
      type: 'carousel',
      duration: 5000,
      easing: [0.25, 0.46, 0.45, 0.94],
      items: carouselItems,
      winningIndex: 15
    }

    await startAnimation(config)
  }

  return (
    <div>
      <button onClick={handleStartAnimation} disabled={isAnimating}>
        Start Animation
      </button>
      <div>Phase: {animationPhase}</div>
      <div>Progress: {Math.round(animationProgress * 100)}%</div>
    </div>
  )
}
```

### useCaseData

**Purpose**: Manages case data fetching, caching, and state management.

**Features**:
- Intelligent caching with TTL
- Optimistic updates
- Request deduplication
- Error handling and retry logic

**API**:
```typescript
interface UseCaseDataReturn {
  caseTypes: CaseType[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  getCaseType: (id: string) => CaseType | undefined
  invalidateCache: () => void
}
```

**Usage Example**:
```tsx
import { useCaseData } from '../hooks/useCaseData'

function CaseDataManager() {
  const {
    caseTypes,
    isLoading,
    error,
    refetch,
    getCaseType,
    invalidateCache
  } = useCaseData()

  const handleRefresh = async () => {
    await refetch()
  }

  const handleInvalidateCache = () => {
    invalidateCache()
  }

  return (
    <div>
      {isLoading && <div>Loading cases...</div>}
      {error && <div>Error: {error}</div>}
      <button onClick={handleRefresh}>Refresh Cases</button>
      <button onClick={handleInvalidateCache}>Clear Cache</button>
      {caseTypes.map(caseType => (
        <div key={caseType.id}>{caseType.name}</div>
      ))}
    </div>
  )
}
```

### useCaseOpening

**Purpose**: Handles API integration for case opening operations.

**Features**:
- Single API endpoint integration
- Atomic transaction handling
- Request deduplication
- Error handling with retry logic

**API**:
```typescript
interface UseCaseOpeningReturn {
  openCase: (caseTypeId: string, previewOnly?: boolean) => Promise<CaseOpeningResponse>
  isOpening: boolean
  error: string | null
  lastResult: CaseOpeningResult | null
  retryOpening: () => Promise<void>
}
```

**Usage Example**:
```tsx
import { useCaseOpening } from '../hooks/useCaseOpening'

function CaseOpeningManager() {
  const {
    openCase,
    isOpening,
    error,
    lastResult,
    retryOpening
  } = useCaseOpening()

  const handleOpenCase = async (caseTypeId: string) => {
    try {
      const result = await openCase(caseTypeId)
      console.log('Case opened:', result)
    } catch (error) {
      console.error('Failed to open case:', error)
    }
  }

  const handleRetry = async () => {
    await retryOpening()
  }

  return (
    <div>
      <button 
        onClick={() => handleOpenCase('case-123')} 
        disabled={isOpening}
      >
        {isOpening ? 'Opening...' : 'Open Case'}
      </button>
      {error && (
        <div>
          <div>Error: {error}</div>
          <button onClick={handleRetry}>Retry</button>
        </div>
      )}
      {lastResult && (
        <div>Last result: {lastResult.itemWon.name}</div>
      )}
    </div>
  )
}
```

### useErrorHandling

**Purpose**: Centralized error handling with user-friendly messages and recovery strategies.

**Features**:
- Error classification and strategy selection
- User-friendly error messages
- Automatic retry mechanisms
- Recovery action suggestions

**API**:
```typescript
interface UseErrorHandlingReturn {
  handleError: (error: Error, context: string) => void
  getErrorStrategy: (error: Error, context: string) => ErrorStrategy
  getUserFriendlyMessage: (error: Error, context: string) => string
  isRecoverableError: (error: Error, context: string) => boolean
  retryOperation: (operation: () => Promise<void>) => Promise<void>
}
```

**Usage Example**:
```tsx
import { useErrorHandling } from '../hooks/useErrorHandling'

function ErrorHandler() {
  const {
    handleError,
    getErrorStrategy,
    getUserFriendlyMessage,
    isRecoverableError,
    retryOperation
  } = useErrorHandling()

  const handleOperation = async () => {
    try {
      await someAsyncOperation()
    } catch (error) {
      handleError(error, 'case opening')
    }
  }

  const handleRetryableOperation = async () => {
    await retryOperation(async () => {
      await someAsyncOperation()
    })
  }

  return (
    <div>
      <button onClick={handleOperation}>Perform Operation</button>
      <button onClick={handleRetryableOperation}>Retryable Operation</button>
    </div>
  )
}
```

## Performance Hooks

### usePerformanceMonitoring

**Purpose**: Collects and reports performance metrics for the case opening system.

**Features**:
- Frame rate monitoring
- Memory usage tracking
- API response time measurement
- User experience metrics

**API**:
```typescript
interface UsePerformanceMonitoringReturn {
  startTiming: (label: string) => void
  endTiming: (label: string) => void
  reportMetric: (label: string, value: number) => void
  getMetrics: () => PerformanceMetrics
  clearMetrics: () => void
}
```

**Usage Example**:
```tsx
import { usePerformanceMonitoring } from '../hooks/usePerformanceMonitoring'

function PerformanceTracker() {
  const {
    startTiming,
    endTiming,
    reportMetric,
    getMetrics,
    clearMetrics
  } = usePerformanceMonitoring()

  const handleTimedOperation = async () => {
    startTiming('case-opening-operation')
    
    try {
      await performCaseOpening()
    } finally {
      endTiming('case-opening-operation')
    }
  }

  const metrics = getMetrics()

  return (
    <div>
      <button onClick={handleTimedOperation}>Timed Operation</button>
      <div>Metrics: {JSON.stringify(metrics)}</div>
      <button onClick={clearMetrics}>Clear Metrics</button>
    </div>
  )
}
```

## Utility Hooks

### useCache

**Purpose**: Provides caching functionality with TTL and invalidation.

**Features**:
- TTL-based cache expiration
- Cache invalidation strategies
- Memory-efficient storage
- Cache statistics

**API**:
```typescript
interface UseCacheReturn<T> {
  get: (key: string) => T | undefined
  set: (key: string, value: T, ttl?: number) => void
  has: (key: string) => boolean
  delete: (key: string) => void
  clear: () => void
  getStats: () => CacheStats
}
```

**Usage Example**:
```tsx
import { useCache } from '../hooks/useCache'

function CacheManager() {
  const cache = useCache<CaseType[]>()

  const handleCacheData = () => {
    cache.set('case-types', caseTypes, 300000) // 5 minutes TTL
  }

  const handleGetCachedData = () => {
    const cached = cache.get('case-types')
    if (cached) {
      console.log('Using cached data:', cached)
    }
  }

  const stats = cache.getStats()

  return (
    <div>
      <button onClick={handleCacheData}>Cache Data</button>
      <button onClick={handleGetCachedData}>Get Cached Data</button>
      <div>Cache Stats: {JSON.stringify(stats)}</div>
    </div>
  )
}
```

## Type Definitions

### Core Types

```typescript
type GamePhase = 'idle' | 'loading' | 'opening' | 'animating' | 'revealing' | 'complete' | 'error'

interface SimplifiedGameState {
  phase: GamePhase
  selectedCase: CaseType | null
  result: CaseOpeningResult | null
  history: CaseOpeningResult[]
  error: string | null
  animationConfig?: AnimationConfig
}

interface CaseType {
  id: string
  name: string
  description: string
  price: number
  items: CaseItem[]
  rarity: Rarity
}

interface CaseOpeningResult {
  caseType: CaseType
  itemWon: CaseItem
  currencyAwarded: number
  openingId: string
  timestamp: Date
}

interface AnimationConfig {
  type: 'carousel' | 'reveal'
  duration: number
  easing: number[]
  items?: CarouselItemData[]
  winningIndex?: number
}
```

### Error Types

```typescript
interface ErrorStrategy {
  type: 'network' | 'animation' | 'authentication' | 'validation' | 'unknown'
  retry: boolean
  fallback: 'simple' | 'offline' | 'reveal' | 'none'
  userMessage: string
  recoveryActions: string[]
}

interface PerformanceMetrics {
  frameRate: number
  memoryUsage: number
  apiResponseTime: number
  animationDuration: number
  userExperienceScore: number
}
```

## Best Practices

### Hook Usage

1. **State Management**: Use `useCaseOpeningGame` as the primary state management hook
2. **Data Fetching**: Use `useCaseData` for all case-related data operations
3. **Error Handling**: Always wrap operations in `useErrorHandling` for consistent error management
4. **Performance**: Use `usePerformanceMonitoring` to track and optimize performance

### Error Handling

1. **Centralized Handling**: Use `useErrorHandling` for all error scenarios
2. **User-Friendly Messages**: Always provide clear, actionable error messages
3. **Recovery Strategies**: Implement retry mechanisms for recoverable errors
4. **Logging**: Log errors with sufficient context for debugging

### Performance Optimization

1. **Caching**: Use `useCache` for expensive data operations
2. **Monitoring**: Use `usePerformanceMonitoring` to identify bottlenecks
3. **Optimistic Updates**: Use optimistic updates for better perceived performance
4. **Request Deduplication**: Prevent duplicate API calls

### Testing

Each hook includes comprehensive tests:
- Unit tests for hook logic and state management
- Integration tests for hook interactions
- Performance tests for optimization validation
- Error scenario testing for robustness

## Migration Guide

### From Legacy Hooks

The refactored hooks provide improved functionality while maintaining compatibility:

1. **State Management**: `useCaseOpeningGame` replaces multiple state management hooks
2. **Animation Control**: `useCaseAnimation` provides unified animation management
3. **Data Management**: `useCaseData` centralizes all data operations
4. **Error Handling**: `useErrorHandling` provides consistent error management

### Breaking Changes

- Simplified state management with single phase state
- Centralized error handling with user-friendly messages
- Performance monitoring integrated into core hooks
- Optimistic updates for better user experience

## Troubleshooting

### Common Issues

1. **State Management**: Ensure `useCaseOpeningGame` is used as the primary state hook
2. **Error Handling**: Wrap all operations in `useErrorHandling` for consistent error management
3. **Performance**: Use `usePerformanceMonitoring` to identify performance issues
4. **Caching**: Use `useCache` for expensive operations to improve performance

### Debug Tools

- State transition logging in development mode
- Performance metrics collection and reporting
- Error logging with detailed context information
- Cache statistics and invalidation tracking
