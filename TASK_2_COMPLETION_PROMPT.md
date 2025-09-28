# Task 2 Completion Prompt: Refactor useCaseOpeningGame Hook

## Context
Task 2 was marked as complete but analysis shows it doesn't meet all acceptance criteria. The current `useCaseOpeningGame` hook is 507 lines long, making it difficult to test and maintain. It needs to be refactored into smaller, focused hooks with proper error handling.

## Current Issues
1. **Hook too large**: 507 lines violates testability principle
2. **Complex async operations**: Nested setTimeout calls and multiple API requests
3. **Heavy dependencies**: Multiple hook dependencies make unit testing difficult
4. **Inconsistent error handling**: Basic error handling but not comprehensive
5. **Missing testability**: Cannot be easily unit tested due to complexity

## Required Actions

### 1. Break Down Large Hook
Split `useCaseOpeningGame` into focused hooks:

#### Create `useCaseData.ts`
```typescript
// packages/frontend/src/hooks/useCaseData.ts
export const useCaseData = () => {
  // Handle case types loading
  // Cache case data
  // Manage case selection
  // Return: { caseTypes, isLoadingCases, error, loadCaseTypes, selectCase }
}
```

#### Create `useCaseAnimation.ts`
```typescript
// packages/frontend/src/hooks/useCaseAnimation.ts
export const useCaseAnimation = () => {
  // Handle animation configuration
  // Manage animation state
  // Handle animation completion
  // Return: { animationConfig, startAnimation, completeAnimation, resetAnimation }
}
```

#### Create `useCaseOpening.ts`
```typescript
// packages/frontend/src/hooks/useCaseOpening.ts
export const useCaseOpening = () => {
  // Core case opening logic
  // API calls for case opening
  // Transaction handling
  // Return: { openCase, isOpening, openingError, resetOpening }
}
```

#### Refactor `useCaseOpeningGame.ts`
```typescript
// packages/frontend/src/hooks/useCaseOpeningGame.ts
export const useCaseOpeningGame = () => {
  // Orchestrate the smaller hooks
  // Manage overall game state
  // Handle state transitions
  // Return: { gameState, openCase, resetGame, completeAnimation }
}
```

### 2. Implement Comprehensive Error Handling

#### Create `useErrorHandling.ts`
```typescript
// packages/frontend/src/hooks/useErrorHandling.ts
export const useErrorHandling = () => {
  // Centralized error handling
  // Error recovery strategies
  // User-friendly error messages
  // Retry mechanisms
  // Return: { handleError, retryOperation, getErrorMessage }
}
```

#### Error Handling Strategy
- **Network Errors**: Auto-retry up to 3 times with exponential backoff
- **Animation Errors**: Fallback to reveal animation
- **Validation Errors**: Clear user messages with suggested fixes
- **Unexpected Errors**: Log and provide fallback experience

### 3. Simplify Async Operations
- Remove nested setTimeout calls
- Use proper async/await patterns
- Implement proper loading states
- Add cancellation support for long-running operations

### 4. Improve Testability
- Reduce hook dependencies through dependency injection
- Create mockable interfaces for external services
- Separate side effects from pure logic
- Add proper TypeScript types for all functions

### 5. Add Comprehensive Testing

#### Create Test Files
```typescript
// packages/frontend/src/hooks/__tests__/useCaseData.test.ts
// packages/frontend/src/hooks/__tests__/useCaseAnimation.test.ts
// packages/frontend/src/hooks/__tests__/useCaseOpening.test.ts
// packages/frontend/src/hooks/__tests__/useCaseOpeningGame.test.ts
// packages/frontend/src/hooks/__tests__/useErrorHandling.test.ts
```

#### Test Requirements
- Unit tests for each hook function
- Mock external dependencies
- Test error scenarios
- Test state transitions
- Test async operations

## Implementation Steps

### Step 1: Create Focused Hooks
1. Create `useCaseData.ts` with case data management
2. Create `useCaseAnimation.ts` with animation logic
3. Create `useCaseOpening.ts` with core opening logic
4. Create `useErrorHandling.ts` with error management

### Step 2: Refactor Main Hook
1. Refactor `useCaseOpeningGame.ts` to orchestrate smaller hooks
2. Remove complex async operations
3. Implement proper state management
4. Add comprehensive error handling

### Step 3: Update Component
1. Update `CaseOpeningGame.tsx` to use refactored hook
2. Ensure UI only handles rendering
3. Remove any remaining business logic

### Step 4: Add Testing
1. Create unit tests for each hook
2. Add integration tests for hook interactions
3. Test error scenarios and recovery
4. Ensure 90% test coverage

### Step 5: Update Types
1. Update `caseOpening.ts` types if needed
2. Add proper interfaces for all hooks
3. Ensure type safety throughout

## Acceptance Criteria Validation

### ✅ All game logic centralized in hook
- **Current**: ✅ Completed
- **Action**: Maintain this while improving structure

### ✅ Component only handles UI rendering  
- **Current**: ✅ Completed
- **Action**: Verify after refactoring

### ❌ Hook is easily testable
- **Current**: ❌ Failed (507 lines, complex dependencies)
- **Action**: Break into smaller hooks, reduce dependencies, add tests

### ❌ Error handling implemented
- **Current**: ⚠️ Partial (basic error handling exists)
- **Action**: Implement comprehensive error handling with recovery strategies

## Success Metrics
- [ ] Hook size reduced to <100 lines each
- [ ] All hooks have unit tests with >90% coverage
- [ ] Error handling covers all scenarios with proper recovery
- [ ] Async operations are simplified and testable
- [ ] Dependencies are minimized and mockable

## Files to Create
- `packages/frontend/src/hooks/useCaseData.ts`
- `packages/frontend/src/hooks/useCaseAnimation.ts`
- `packages/frontend/src/hooks/useCaseOpening.ts`
- `packages/frontend/src/hooks/useErrorHandling.ts`
- `packages/frontend/src/hooks/__tests__/useCaseData.test.ts`
- `packages/frontend/src/hooks/__tests__/useCaseAnimation.test.ts`
- `packages/frontend/src/hooks/__tests__/useCaseOpening.test.ts`
- `packages/frontend/src/hooks/__tests__/useCaseOpeningGame.test.ts`
- `packages/frontend/src/hooks/__tests__/useErrorHandling.test.ts`

## Files to Modify
- `packages/frontend/src/hooks/useCaseOpeningGame.ts` (refactor)
- `packages/frontend/src/components/games/CaseOpeningGame.tsx` (update usage)
- `packages/frontend/src/types/caseOpening.ts` (add new interfaces)

## Estimated Time
- **Refactoring**: 4 hours
- **Testing**: 3 hours
- **Error Handling**: 2 hours
- **Total**: 9 hours

## Priority
**HIGH** - This is blocking Task 3 (Animation System) and affects overall project quality.

---

**Note**: This refactoring is critical for the success of the entire case opening refactoring project. The current implementation violates several design principles and must be fixed before proceeding with other tasks.
