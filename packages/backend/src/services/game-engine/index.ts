/**
 * Game Engine Module Exports
 * Central export point for all game engine components
 */

// Core engine
export { CoreGameEngine } from './core-engine'

// Game implementations
export { RouletteGame } from './roulette-game'
export { BlackjackGame } from './blackjack-game'
export { PlinkoGame } from './plinko-game'

// Component classes
export { SecureRandomGenerator } from './random-generator'
export { PayoutCalculator } from './payout-calculator'
export { GameValidator } from './game-validator'
export { GameStateManager } from './game-state-manager'

// Types and interfaces
export * from './types'

// Create singleton instance for application use
export const gameEngine = new CoreGameEngine()