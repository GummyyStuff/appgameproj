/**
 * Stock Market Trading Interface
 * 
 * Buy/Sell interface with position management
 */

import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { buyShares, sellShares, getUserPosition, type Position } from '../../services/stock-market-api';
import { useAuth } from '../../hooks/useAuth';
import { useCurrency } from '../../hooks/useCurrency';
import { TrendingUp, TrendingDown, DollarSign, Package } from 'lucide-react';

interface StockMarketTradingProps {
  currentPrice: number
  onTradeSuccess?: () => void
}

export function StockMarketTrading({ currentPrice, onTradeSuccess }: StockMarketTradingProps) {
  const { user } = useAuth()
  const { balance, refreshBalance } = useCurrency()
  const [position, setPosition] = useState<Position | null>(null)
  const [shares, setShares] = useState<string>('1')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Load position on mount
  useEffect(() => {
    loadPosition()
  }, [])

  const loadPosition = async () => {
    try {
      const pos = await getUserPosition()
      setPosition(pos)
    } catch (err) {
      console.error('Failed to load position:', err)
    }
  }

  const handleBuy = async () => {
    if (!user) return

    const sharesNum = parseFloat(shares)
    if (isNaN(sharesNum) || sharesNum <= 0) {
      setError('Please enter a valid number of shares')
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const totalCost = sharesNum * currentPrice
      
      if (balance < totalCost) {
        setError('Insufficient balance')
        setIsLoading(false)
        return
      }

      await buyShares(sharesNum)
      setSuccess(`Successfully bought ${sharesNum} shares at $${currentPrice.toFixed(2)}`)
      
      // Refresh data
      await Promise.all([loadPosition(), refreshBalance()])
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
      
      if (onTradeSuccess) {
        onTradeSuccess()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute buy order')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSell = async () => {
    if (!user || !position) return

    const sharesNum = parseFloat(shares)
    if (isNaN(sharesNum) || sharesNum <= 0) {
      setError('Please enter a valid number of shares')
      return
    }

    if (sharesNum > position.shares) {
      setError('Insufficient shares')
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      await sellShares(sharesNum)
      const proceeds = sharesNum * currentPrice
      setSuccess(`Successfully sold ${sharesNum} shares for $${proceeds.toFixed(2)}`)
      
      // Refresh data
      await Promise.all([loadPosition(), refreshBalance()])
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
      
      if (onTradeSuccess) {
        onTradeSuccess()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute sell order')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSellAll = () => {
    if (!position) return
    setShares(position.shares.toString())
  }

  const sharesNum = parseFloat(shares) || 0
  const totalCost = sharesNum * currentPrice
  const canBuy = balance >= totalCost && sharesNum > 0
  const canSell = position && position.shares >= sharesNum && sharesNum > 0

  return (
    <div className="space-y-6">
      {/* Position Display */}
      {position && position.shares > 0 && (
        <Card className="p-6 bg-tarkov-dark border-tarkov-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-tarkov-text flex items-center gap-2">
              <Package className="w-5 h-5" />
              Current Position
            </h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-tarkov-text-secondary mb-1">Shares Owned</p>
              <p className="text-2xl font-bold text-tarkov-text">{position.shares.toFixed(2)}</p>
            </div>
            
            <div>
              <p className="text-sm text-tarkov-text-secondary mb-1">Avg Price</p>
              <p className="text-2xl font-bold text-tarkov-text">${position.avg_price.toFixed(2)}</p>
            </div>
            
            <div>
              <p className="text-sm text-tarkov-text-secondary mb-1">Current Value</p>
              <p className="text-2xl font-bold text-tarkov-text">
                ${(position.shares * currentPrice).toFixed(2)}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-tarkov-text-secondary mb-1">Unrealized P&L</p>
              <p className={`text-2xl font-bold ${position.unrealized_pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {position.unrealized_pnl >= 0 ? '+' : ''}
                ${position.unrealized_pnl.toFixed(2)}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Trading Panel */}
      <Card className="p-6 bg-tarkov-dark border-tarkov-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-tarkov-text">Place Order</h3>
          <div className="text-right">
            <p className="text-sm text-tarkov-text-secondary">Balance</p>
            <p className="text-xl font-bold text-tarkov-accent flex items-center gap-1">
              <DollarSign className="w-5 h-5" />
              {balance.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="shares" className="text-tarkov-text">
              Number of Shares
            </Label>
            <Input
              id="shares"
              type="number"
              min="0.01"
              step="0.01"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              className="mt-1 bg-tarkov-darker border-tarkov-border text-tarkov-text"
              placeholder="Enter shares"
            />
            <p className="text-xs text-tarkov-text-secondary mt-1">
              Total Cost: ${totalCost.toFixed(2)}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-500/10 border border-green-500/50 rounded-lg text-green-400 text-sm">
              {success}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={handleBuy}
              disabled={!canBuy || isLoading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Buy
            </Button>
            
            <Button
              onClick={handleSell}
              disabled={!canSell || isLoading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              <TrendingDown className="w-4 h-4 mr-2" />
              Sell
            </Button>
          </div>

          {position && position.shares > 0 && (
            <Button
              onClick={handleSellAll}
              variant="outline"
              className="w-full border-tarkov-border text-tarkov-text hover:bg-tarkov-darker"
            >
              Sell All ({position.shares.toFixed(2)} shares)
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}

