/**
 * Database types for Tarkov Casino Website
 * These types match the database schema defined in migrations
 */

export interface UserProfile {
  id: string // UUID from auth.users
  username: string
  display_name?: string
  balance: number
  total_wagered: number
  total_won: number
  games_played: number
  last_daily_bonus?: string // Date string
  created_at: string
  updated_at: string
  is_active: boolean
}

export interface GameHistory {
  id: string // UUID
  user_id: string // UUID
  game_type: 'roulette' | 'blackjack' | 'case_opening'
  bet_amount: number
  win_amount: number
  result_data: GameResultData
  game_duration?: number // milliseconds
  created_at: string
}

export interface DailyBonus {
  id: string // UUID
  user_id: string // UUID
  bonus_amount: number
  claimed_at: string
}

// Game-specific result data types
export type GameResultData = RouletteResult | BlackjackResult | CaseOpeningResult | PlinkoResult

export interface RouletteResult {
  bet_type: 'number' | 'red' | 'black' | 'odd' | 'even' | 'low' | 'high' | 'dozen' | 'column'
  bet_value: number | string
  winning_number: number
  multiplier: number
}

export interface BlackjackResult {
  player_hand: Card[]
  dealer_hand: Card[]
  player_value?: number
  dealer_value?: number
  result: 'player_win' | 'dealer_win' | 'push' | 'blackjack' | 'dealer_blackjack' | 'bust'
  actions_taken?: string[] // ['hit', 'stand', 'double', 'split']
}


export interface PlinkoResult {
  risk_level: 'low' | 'medium' | 'high'
  ball_path: (0 | 1)[]
  multiplier: number
  landing_slot: number
}



export interface CaseOpeningResult {
  case_type_id: string
  case_name: string
  case_price: number
  item_id: string
  item_name: string
  item_rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  item_category: 'medical' | 'electronics' | 'consumables' | 'valuables' | 'keycards'
  item_value: number
  currency_awarded: number
  opening_id: string
}

export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades'
  value: 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'
}

// RPC Function response types
export interface GameTransactionResult {
  success: boolean
  game_id?: string
  previous_balance: number
  new_balance: number
  bet_amount: number
  win_amount: number
  error?: string
}

export interface DailyBonusResult {
  success: boolean
  bonus_amount?: number
  previous_balance?: number
  new_balance?: number
  next_bonus_available?: string
  error?: string
}

export interface UserStatistics {
  balance: number
  total_wagered: number
  total_won: number
  games_played: number
  net_profit: number
  member_since: string
  last_daily_bonus?: string
  can_claim_bonus: boolean
  game_statistics: {
    [gameType: string]: {
      games_played: number
      total_wagered: number
      total_won: number
      biggest_win: number
      win_rate: number
    }
  }
}

export interface GameHistoryResponse {
  games: GameHistory[]
  total_count: number
  limit: number
  offset: number
  has_more: boolean
}

// Database table names for type safety
export const TABLE_NAMES = {
  USER_PROFILES: 'user_profiles',
  GAME_HISTORY: 'game_history',
  DAILY_BONUSES: 'daily_bonuses'
} as const

// RPC function names for type safety
export const RPC_FUNCTIONS = {
  GET_USER_BALANCE: 'get_user_balance',
  PROCESS_GAME_TRANSACTION: 'process_game_transaction',
  CLAIM_DAILY_BONUS: 'claim_daily_bonus',
  GET_USER_STATISTICS: 'get_user_statistics',
  GET_GAME_HISTORY: 'get_game_history',
  GET_LEADERBOARD: 'get_leaderboard'
} as const

// Game configuration constants
export const GAME_CONFIG = {
  STARTING_BALANCE: 10000,
  DAILY_BONUS_AMOUNT: 1000,
  MIN_BET_AMOUNT: 1,
  MAX_BET_AMOUNT: 10000,
  GAME_TYPES: ['roulette', 'blackjack', 'case_opening'] as const
} as const

// Validation helpers
export function isValidGameType(gameType: string): gameType is GameHistory['game_type'] {
  return GAME_CONFIG.GAME_TYPES.includes(gameType as any)
}

export function isValidBetAmount(amount: number): boolean {
  return amount >= GAME_CONFIG.MIN_BET_AMOUNT && 
         amount <= GAME_CONFIG.MAX_BET_AMOUNT && 
         amount > 0
}