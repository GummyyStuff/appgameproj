/**
 * Game engine result types for Tarkov Casino
 */

// Game-specific result data types
export type GameResultData = RouletteResult | BlackjackResult | CaseOpeningResult | WheelOfChanceResult

export interface RouletteResult {
  bet_type: 'number' | 'red' | 'black' | 'odd' | 'even' | 'low' | 'high' | 'dozen' | 'column'
  bet_value: number | string
  winning_number: number
  multiplier: number
}

export type WheelSegmentType = 'multiplier' | 'free_spin' | 'double_bet' | 'double_winnings' | 'jackpot'

export interface WheelSegment {
  index: number
  type: WheelSegmentType
  label: string
  multiplier: number
  color: string
  startAngle: number
  endAngle: number
  bettable: boolean
}

export interface WheelBetPlacement {
  segmentIndex: number
  amount: number
}

export interface WheelOfChanceVerification {
  server_seed: string
  server_seed_hash: string
  client_seed: string
  nonce: number
  random_value: number
}

export interface WheelOfChanceResult {
  wheel_layout: WheelSegment[]
  bets: WheelBetPlacement[]
  winning_segment: number
  segment_type: WheelSegmentType
  multiplier: number
  total_bet: number
  total_win: number
  special_triggered: WheelSegmentType | null
  verification?: WheelOfChanceVerification
}

export interface BlackjackResult {
  player_hand: Card[]
  dealer_hand: Card[]
  player_value?: number
  dealer_value?: number
  result: 'player_win' | 'dealer_win' | 'push' | 'blackjack' | 'dealer_blackjack' | 'bust'
  actions_taken?: string[] // ['hit', 'stand', 'double', 'split']
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

