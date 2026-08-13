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
  uid?: string
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
