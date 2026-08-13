export type WheelSegmentType = 'multiplier' | 'bonus_wheel'

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

export type EnvironmentType = 'clear_skies' | 'scav_raid' | 'emp_strike' | 'thermal_scan' | 'blackout'

export interface EnvironmentSegmentModifier {
  segmentIndex: number
  operation: 'add' | 'set'
  value: number
}

export interface EnvironmentState {
  type: EnvironmentType
  spins_remaining: number
  modifiers: EnvironmentSegmentModifier[]
}

export interface WheelOfChanceVerification {
  server_seed: string
  server_seed_hash: string
  client_seed: string
  nonce: number
  random_value: number
}

export interface WheelSpinSequenceEntry {
  winning_segment: number
  segment_type: WheelSegmentType
  multiplier: number
  verification: WheelOfChanceVerification
}

export interface WheelOfChanceResult {
  wheel_layout: WheelSegment[]
  bonus_wheel_layout?: WheelSegment[]
  bets: WheelBetPlacement[]
  winning_segment: number
  segment_type: WheelSegmentType
  multiplier: number
  total_bet: number
  total_win: number
  special_triggered: WheelSegmentType | null
  spin_sequence: WheelSpinSequenceEntry[]
  environment_state: EnvironmentState
  environment_verification?: WheelOfChanceVerification
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
