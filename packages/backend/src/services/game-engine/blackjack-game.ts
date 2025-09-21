/**
 * Blackjack game implementation with proper game mechanics
 * Supports hit, stand, double down, and split actions
 */

import { BaseGame, GameBet, GameResult } from './types'
import { SecureRandomGenerator } from './random-generator'
import { PayoutCalculator } from './payout-calculator'
import { Card, BlackjackResult, GameResultData } from '../../types/database'
import * as fs from 'fs'
import * as path from 'path'

export interface BlackjackBet extends GameBet {
  gameType: 'blackjack'
}

export interface BlackjackAction {
  userId: string
  gameId: string
  action: 'hit' | 'stand' | 'double' | 'split'
  handIndex?: number // For split hands
}

export interface BlackjackGameState {
  gameId: string
  userId: string
  betAmount: number
  deck: Card[]
  playerHands: Card[][]
  dealerHand: Card[]
  currentHandIndex: number
  handStatuses: ('playing' | 'stand' | 'bust' | 'blackjack')[]
  dealerRevealed: boolean
  gameStatus: 'waiting_for_action' | 'completed'
  canDouble: boolean[]
  canSplit: boolean[]
  totalBetAmount: number // Includes additional bets from double/split
}

export class BlackjackGame extends BaseGame {
  private randomGenerator: SecureRandomGenerator
  private payoutCalculator: PayoutCalculator
  private static activeGames: Map<string, BlackjackGameState> = new Map()
  private static readonly GAME_STATE_FILE = path.join(process.cwd(), '.tmp', 'blackjack-games.json')
  private static initialized = false

  constructor() {
    super('blackjack', 1, 10000)
    this.randomGenerator = new SecureRandomGenerator()
    this.payoutCalculator = new PayoutCalculator()
    
    if (!BlackjackGame.initialized) {
      this.loadGameState()
      BlackjackGame.initialized = true
    }
    
    // console.log('BlackjackGame constructor called, active games:', BlackjackGame.activeGames.size)
  }

  /**
   * Load game state from file (for development persistence)
   */
  private loadGameState(): void {
    try {
      // Ensure directory exists
      const dir = path.dirname(BlackjackGame.GAME_STATE_FILE)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      if (fs.existsSync(BlackjackGame.GAME_STATE_FILE)) {
        const data = fs.readFileSync(BlackjackGame.GAME_STATE_FILE, 'utf8')
        const gameStates = JSON.parse(data)
        
        // Convert back to Map and filter out old games (older than 1 hour)
        const now = Date.now()
        const oneHour = 60 * 60 * 1000
        
        for (const [gameId, gameState] of Object.entries(gameStates)) {
          const state = gameState as BlackjackGameState
          const gameAge = now - parseInt(gameId.split('-')[1] || '0')
          
          if (gameAge < oneHour) {
            BlackjackGame.activeGames.set(gameId, state)
          }
        }
        
        console.log('Loaded', BlackjackGame.activeGames.size, 'active blackjack games from file')
        
        // Save cleaned up state
        this.saveGameState()
      }
    } catch (error) {
      console.log('No existing game state file found or error loading, starting fresh:', error)
    }
  }

  /**
   * Save game state to file (for development persistence)
   */
  private saveGameState(): void {
    try {
      const gameStates = Object.fromEntries(BlackjackGame.activeGames)
      fs.writeFileSync(BlackjackGame.GAME_STATE_FILE, JSON.stringify(gameStates, null, 2))
    } catch (error) {
      console.error('Failed to save game state:', error)
    }
  }

  /**
   * Start a new blackjack game
   */
  async play(bet: BlackjackBet): Promise<GameResult> {
    try {
      if (!this.validateGameSpecificBet(bet)) {
        return {
          success: false,
          winAmount: 0,
          resultData: {} as GameResultData,
          error: 'Invalid blackjack bet'
        }
      }

      const gameId = `blackjack-${Date.now()}-${bet.userId}`
      const deck = await this.createShuffledDeck()
      
      // Deal initial cards
      const playerHand = [deck.pop()!, deck.pop()!]
      const dealerHand = [deck.pop()!, deck.pop()!]

      const gameState: BlackjackGameState = {
        gameId,
        userId: bet.userId,
        betAmount: bet.amount,
        deck,
        playerHands: [playerHand],
        dealerHand,
        currentHandIndex: 0,
        handStatuses: ['playing'],
        dealerRevealed: false,
        gameStatus: 'waiting_for_action',
        canDouble: [true],
        canSplit: [this.canSplitHand(playerHand)],
        totalBetAmount: bet.amount
      }

      // Check for immediate blackjack
      const playerValue = this.calculateHandValue(playerHand)
      const dealerValue = this.calculateHandValue(dealerHand)

      if (playerValue === 21) {
        gameState.handStatuses[0] = 'blackjack'
        gameState.dealerRevealed = true
        gameState.gameStatus = 'completed'
        
        const result = this.determineGameResult(gameState)
        return {
          success: true,
          winAmount: result.winAmount,
          resultData: result.resultData,
          gameId
        }
      }

      // Store active game
      console.log('Storing game with ID:', gameId)
      BlackjackGame.activeGames.set(gameId, gameState)
      this.saveGameState()
      console.log('Active games after storing:', BlackjackGame.activeGames.size)

      // Return initial game state
      const resultData: BlackjackResult = {
        player_hand: playerHand,
        dealer_hand: [dealerHand[0]], // Only show first dealer card
        player_value: playerValue,
        dealer_value: this.getCardValue(dealerHand[0]),
        result: 'player_win', // Temporary, will be updated when game completes
        actions_taken: []
      }

      return {
        success: true,
        winAmount: 0, // Game not complete yet
        resultData,
        gameId
      }
    } catch (error) {
      console.error('Blackjack game error:', error)
      return {
        success: false,
        winAmount: 0,
        resultData: {} as GameResultData,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Process player action (hit, stand, double, split)
   */
  async processAction(action: BlackjackAction): Promise<GameResult> {
    console.log('Processing action:', action)
    console.log('Active games count:', BlackjackGame.activeGames.size)
    console.log('Active game IDs:', Array.from(BlackjackGame.activeGames.keys()))
    
    const gameState = BlackjackGame.activeGames.get(action.gameId)
    console.log('Found game state:', !!gameState)
    
    if (!gameState) {
      console.log('Game not found for ID:', action.gameId)
      return {
        success: false,
        winAmount: 0,
        resultData: {} as GameResultData,
        error: 'Game not found or unauthorized'
      }
    }
    
    if (gameState.userId !== action.userId) {
      console.log('User mismatch. Expected:', gameState.userId, 'Got:', action.userId)
      return {
        success: false,
        winAmount: 0,
        resultData: {} as GameResultData,
        error: 'Game not found or unauthorized'
      }
    }

    if (gameState.gameStatus === 'completed') {
      return {
        success: false,
        winAmount: 0,
        resultData: {} as GameResultData,
        error: 'Game already completed'
      }
    }

    const handIndex = action.handIndex ?? gameState.currentHandIndex
    const currentHand = gameState.playerHands[handIndex]

    try {
      switch (action.action) {
        case 'hit':
          return await this.processHit(gameState, handIndex)
        case 'stand':
          return await this.processStand(gameState, handIndex)
        case 'double':
          return await this.processDouble(gameState, handIndex)
        case 'split':
          return await this.processSplit(gameState, handIndex)
        default:
          return {
            success: false,
            winAmount: 0,
            resultData: {} as GameResultData,
            error: 'Invalid action'
          }
      }
    } catch (error) {
      console.error('Action processing error:', error)
      return {
        success: false,
        winAmount: 0,
        resultData: {} as GameResultData,
        error: error instanceof Error ? error.message : 'Action failed'
      }
    }
  }

  /**
   * Process hit action
   */
  private async processHit(gameState: BlackjackGameState, handIndex: number): Promise<GameResult> {
    const hand = gameState.playerHands[handIndex]
    const newCard = gameState.deck.pop()!
    hand.push(newCard)

    // Can't double after hitting
    gameState.canDouble[handIndex] = false

    const handValue = this.calculateHandValue(hand)
    if (handValue > 21) {
      gameState.handStatuses[handIndex] = 'bust'
    }

    return this.checkGameCompletion(gameState)
  }

  /**
   * Process stand action
   */
  private async processStand(gameState: BlackjackGameState, handIndex: number): Promise<GameResult> {
    gameState.handStatuses[handIndex] = 'stand'
    return this.checkGameCompletion(gameState)
  }

  /**
   * Process double down action
   */
  private async processDouble(gameState: BlackjackGameState, handIndex: number): Promise<GameResult> {
    if (!gameState.canDouble[handIndex]) {
      return {
        success: false,
        winAmount: 0,
        resultData: {} as GameResultData,
        error: 'Cannot double down'
      }
    }

    // Double the bet
    gameState.totalBetAmount += gameState.betAmount

    // Hit once and stand
    const hand = gameState.playerHands[handIndex]
    const newCard = gameState.deck.pop()!
    hand.push(newCard)

    const handValue = this.calculateHandValue(hand)
    gameState.handStatuses[handIndex] = handValue > 21 ? 'bust' : 'stand'
    gameState.canDouble[handIndex] = false

    return this.checkGameCompletion(gameState)
  }

  /**
   * Process split action
   */
  private async processSplit(gameState: BlackjackGameState, handIndex: number): Promise<GameResult> {
    const hand = gameState.playerHands[handIndex]
    
    if (!gameState.canSplit[handIndex] || !this.canSplitHand(hand)) {
      return {
        success: false,
        winAmount: 0,
        resultData: {} as GameResultData,
        error: 'Cannot split hand'
      }
    }

    // Double the bet for split
    gameState.totalBetAmount += gameState.betAmount

    // Split the hand
    const card1 = hand[0]
    const card2 = hand[1]
    
    gameState.playerHands[handIndex] = [card1, gameState.deck.pop()!]
    gameState.playerHands.push([card2, gameState.deck.pop()!])
    
    // Update game state for split
    gameState.handStatuses.push('playing')
    gameState.canDouble.push(true)
    gameState.canSplit.push(false) // Usually can't split again
    gameState.canSplit[handIndex] = false

    return this.checkGameCompletion(gameState)
  }

  /**
   * Check if game is complete and process dealer actions
   */
  private checkGameCompletion(gameState: BlackjackGameState): GameResult {
    // Check if all hands are complete
    const allHandsComplete = gameState.handStatuses.every(status => 
      status === 'stand' || status === 'bust' || status === 'blackjack'
    )

    if (!allHandsComplete) {
      // Move to next hand if current one is complete
      while (gameState.currentHandIndex < gameState.handStatuses.length && 
             gameState.handStatuses[gameState.currentHandIndex] !== 'playing') {
        gameState.currentHandIndex++
      }

      // Return current state if there are still hands to play
      if (gameState.currentHandIndex < gameState.handStatuses.length) {
        const resultData: BlackjackResult = {
          player_hand: gameState.playerHands.flat(),
          dealer_hand: gameState.dealerRevealed ? gameState.dealerHand : [gameState.dealerHand[0]],
          player_value: this.calculateHandValue(gameState.playerHands[gameState.currentHandIndex]),
          dealer_value: gameState.dealerRevealed ? 
            this.calculateHandValue(gameState.dealerHand) : 
            this.getCardValue(gameState.dealerHand[0]),
          result: 'player_win', // Temporary
          actions_taken: []
        }

        return {
          success: true,
          winAmount: 0,
          resultData,
          gameId: gameState.gameId
        }
      }
    }

    // All hands complete - play dealer
    gameState.dealerRevealed = true
    this.playDealer(gameState)
    gameState.gameStatus = 'completed'

    const result = this.determineGameResult(gameState)
    
    // Clean up active game
    BlackjackGame.activeGames.delete(gameState.gameId)
    this.saveGameState()

    return result
  }

  /**
   * Play dealer according to standard rules
   */
  private playDealer(gameState: BlackjackGameState): void {
    let dealerValue = this.calculateHandValue(gameState.dealerHand)
    
    // Dealer hits on soft 17
    while (dealerValue < 17 || (dealerValue === 17 && this.isSoftHand(gameState.dealerHand))) {
      gameState.dealerHand.push(gameState.deck.pop()!)
      dealerValue = this.calculateHandValue(gameState.dealerHand)
    }
  }

  /**
   * Determine final game result and calculate winnings
   */
  private determineGameResult(gameState: BlackjackGameState): GameResult {
    const dealerValue = this.calculateHandValue(gameState.dealerHand)
    const dealerBust = dealerValue > 21
    const dealerBlackjack = dealerValue === 21 && gameState.dealerHand.length === 2

    let totalWinAmount = 0
    let overallResult = 'dealer_win'

    // Evaluate each hand
    for (let i = 0; i < gameState.playerHands.length; i++) {
      const hand = gameState.playerHands[i]
      const handValue = this.calculateHandValue(hand)
      const handStatus = gameState.handStatuses[i]
      const betAmount = gameState.betAmount // Each hand has same bet amount

      let handResult: string
      let handWinAmount = 0

      if (handStatus === 'bust') {
        handResult = 'bust'
        handWinAmount = 0
        overallResult = 'bust' // Set overall result to bust for bust hands
      } else if (handStatus === 'blackjack' && !dealerBlackjack) {
        handResult = 'blackjack'
        handWinAmount = betAmount + (betAmount * 1.5) // Bet return + 3:2 winnings
      } else if (dealerBust) {
        handResult = 'player_win'
        handWinAmount = betAmount + betAmount // Bet return + 1:1 winnings
      } else if (handValue > dealerValue) {
        handResult = 'player_win'
        handWinAmount = betAmount + betAmount // Bet return + 1:1 winnings
      } else if (handValue === dealerValue) {
        handResult = 'push'
        handWinAmount = betAmount // Return bet only
      } else {
        handResult = 'dealer_win'
        handWinAmount = 0
      }

      totalWinAmount += handWinAmount

      // Set overall result based on hand outcomes
      if (handResult === 'blackjack' || handResult === 'player_win') {
        if (overallResult === 'dealer_win') {
          overallResult = handResult
        }
      } else if (handResult === 'push' && overallResult === 'dealer_win') {
        overallResult = 'push'
      } else if (handResult === 'bust' && i === 0) {
        // If first hand busts, set overall result to bust
        overallResult = 'bust'
      }
    }

    const resultData: BlackjackResult = {
      player_hand: gameState.playerHands.flat(),
      dealer_hand: gameState.dealerHand,
      player_value: this.calculateHandValue(gameState.playerHands[0]),
      dealer_value: dealerValue,
      result: overallResult as any,
      actions_taken: []
    }

    return {
      success: true,
      winAmount: totalWinAmount,
      resultData,
      gameId: gameState.gameId,
      betAmount: gameState.totalBetAmount
    }
  }

  /**
   * Create and shuffle a standard 52-card deck
   */
  private async createShuffledDeck(): Promise<Card[]> {
    const suits: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades']
    const values: Card['value'][] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
    
    const deck: Card[] = []
    for (const suit of suits) {
      for (const value of values) {
        deck.push({ suit, value })
      }
    }

    // Shuffle using Fisher-Yates algorithm with secure random
    for (let i = deck.length - 1; i > 0; i--) {
      const j = await this.randomGenerator.generateSecureRandomInt(0, i)
      ;[deck[i], deck[j]] = [deck[j], deck[i]]
    }

    return deck
  }

  /**
   * Calculate hand value with proper ace handling
   */
  private calculateHandValue(hand: Card[]): number {
    let value = 0
    let aces = 0

    for (const card of hand) {
      if (card.value === 'A') {
        aces++
        value += 11
      } else if (['J', 'Q', 'K'].includes(card.value)) {
        value += 10
      } else {
        value += parseInt(card.value)
      }
    }

    // Convert aces from 11 to 1 if needed
    while (value > 21 && aces > 0) {
      value -= 10
      aces--
    }

    return value
  }

  /**
   * Get numeric value of a single card
   */
  private getCardValue(card: Card): number {
    if (card.value === 'A') return 11
    if (['J', 'Q', 'K'].includes(card.value)) return 10
    return parseInt(card.value)
  }

  /**
   * Check if hand is soft (contains ace counted as 11)
   */
  private isSoftHand(hand: Card[]): boolean {
    let value = 0
    let aces = 0

    for (const card of hand) {
      if (card.value === 'A') {
        aces++
        value += 11
      } else if (['J', 'Q', 'K'].includes(card.value)) {
        value += 10
      } else {
        value += parseInt(card.value)
      }
    }

    return aces > 0 && value <= 21
  }

  /**
   * Check if hand can be split
   */
  private canSplitHand(hand: Card[]): boolean {
    if (hand.length !== 2) return false
    
    const value1 = this.getCardValue(hand[0])
    const value2 = this.getCardValue(hand[1])
    
    // Can split if same value or both face cards
    return value1 === value2 || 
           (value1 >= 10 && value2 >= 10 && hand[0].value !== 'A' && hand[1].value !== 'A')
  }

  /**
   * Get active game state
   */
  getGameState(gameId: string): BlackjackGameState | undefined {
    return BlackjackGame.activeGames.get(gameId)
  }

  /**
   * Clear all active games (for testing)
   */
  static clearActiveGames(): void {
    BlackjackGame.activeGames.clear()
    // Also clear the file in test environment
    try {
      if (fs.existsSync(BlackjackGame.GAME_STATE_FILE)) {
        fs.unlinkSync(BlackjackGame.GAME_STATE_FILE)
      }
    } catch (error) {
      // Ignore errors in test cleanup
    }
  }

  /**
   * Validate blackjack-specific bet
   */
  validateGameSpecificBet(bet: GameBet): boolean {
    return this.validateBaseBet(bet) && bet.gameType === 'blackjack'
  }

  /**
   * Calculate payout for completed game
   */
  calculatePayout(bet: GameBet, result: GameResultData): number {
    const blackjackResult = result as BlackjackResult
    return this.payoutCalculator.calculateBlackjackPayout(
      blackjackResult.result,
      bet.amount
    )
  }

  /**
   * Get game information
   */
  static getGameInfo() {
    return {
      name: 'Blackjack',
      description: 'Classic blackjack with standard rules',
      rules: {
        dealer_hits_soft_17: true,
        blackjack_pays: '3:2',
        double_after_split: false,
        surrender: false,
        max_splits: 1
      },
      actions: ['hit', 'stand', 'double', 'split'],
      min_bet: 1,
      max_bet: 10000
    }
  }
}