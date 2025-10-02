/**
 * Global Statistics API Service
 * Fetches website-wide statistics for the main page combat statistics component
 */

export interface GlobalStatistics {
  overview: {
    totalGames: number
    totalWagered: number
    totalWon: number
    netProfit: number
    winRate: number
    biggestWin: number
    biggestLoss: number
    averageBet: number
    averageWin: number
    profitMargin: number
  }
  gameBreakdown: Array<{
    gameType: string
    statistics: {
      totalGames: number
      totalWagered: number
      totalWon: number
      netProfit: number
      winRate: number
      biggestWin: number
      biggestLoss: number
      averageBet: number
      averageWin: number
      profitMargin: number
    }
    recentTrend: 'up' | 'down' | 'stable'
    popularityRank: number
  }>
  timeSeriesData: Array<{
    date: string
    games: number
    wagered: number
    won: number
    profit: number
  }>
  totalUsers: number
  period: string
}

export interface GlobalStatsResponse {
  success: boolean
  global_statistics: GlobalStatistics
  generated_at: string
}

/**
 * Global Statistics API Service
 */
export class GlobalStatsApiService {
  /**
   * Fetch global statistics for the website
   */
  static async getGlobalStatistics(days: number = 30): Promise<GlobalStatistics> {
    try {
      const response = await fetch(`/api/statistics/global?days=${days}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch global statistics: ${response.status} ${response.statusText}`)
      }

      const result: GlobalStatsResponse = await response.json()

      if (!result.success) {
        throw new Error('Failed to fetch global statistics')
      }

      return result.global_statistics
    } catch (error) {
      console.error('Error fetching global statistics:', error)
      throw error
    }
  }

  /**
   * Format currency for display
   */
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  /**
   * Format currency with symbol
   */
  static formatCurrencyWithSymbol(amount: number, symbol: string = '₽'): string {
    return `${symbol}${this.formatCurrency(amount)}`
  }

  /**
   * Calculate wins and losses from game statistics
   */
  static calculateWinsAndLosses(overview: GlobalStatistics['overview']): {
    wins: number
    losses: number
  } {
    const totalGames = overview.totalGames
    const winRate = overview.winRate
    const wins = Math.round((totalGames * winRate) / 100)
    const losses = totalGames - wins

    return { wins, losses }
  }
}

export default GlobalStatsApiService
