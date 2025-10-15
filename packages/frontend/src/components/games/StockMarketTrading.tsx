/**
 * Stock Market Trading Interface
 * 
 * Buy/Sell interface with position management
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { buyShares, sellShares, getUserPosition, type Position } from '../../services/stock-market-api';
import { useAuth } from '../../hooks/useAuth';
import { useBalance } from '../../hooks/useBalance';
import { appwriteClient } from '../../lib/appwrite';
import { TrendingUp, TrendingDown, DollarSign, Package, AlertCircle, CheckCircle2 } from 'lucide-react';

interface StockMarketTradingProps {
  currentPrice: number
}

export function StockMarketTrading({ currentPrice }: StockMarketTradingProps) {
  const { user } = useAuth()
  const { balance, refetch: refreshBalance } = useBalance()
  const [position, setPosition] = useState<Position | null>(null)
  const [shares, setShares] = useState<string>('1')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID!;

  // Load position on mount
  useEffect(() => {
    loadPosition()
  }, [])

  // Set up real-time subscription for position updates
  useEffect(() => {
    if (!user) return

    console.log('🔔 Setting up real-time position subscription for user:', user.id)

    const channel = `databases.${DATABASE_ID}.collections.stock_market_positions.documents`
    const unsubscribe = appwriteClient.subscribe(
      channel,
      (response: any) => {
        console.log('[STOCK_MARKET_POSITION] Received update:', response)
        
        // Check for update events
        if (response.events && (
          response.events.includes('databases.*.collections.*.documents.*.update') ||
          response.events.includes('databases.*.collections.*.documents.*.create')
        )) {
          const updatedPosition = response.payload
          // Only update if this position belongs to the current user
          if (updatedPosition.user_id === user.id) {
            console.log('📊 Position updated via real-time:', updatedPosition)
            setPosition({
              shares: updatedPosition.shares,
              avg_price: updatedPosition.avg_price,
              unrealized_pnl: updatedPosition.unrealized_pnl
            })
          }
        }
      }
    )

    return () => {
      console.log('🔕 Unsubscribing from real-time position updates')
      unsubscribe()
    }
  }, [user, DATABASE_ID])

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
      
      // Refresh balance (position will be updated via real-time subscription)
      await refreshBalance()
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
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
      
      // Refresh balance (position will be updated via real-time subscription)
      await refreshBalance()
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
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

  // Quick action handlers
  const buyMax = () => {
    const maxShares = Math.floor(balance / currentPrice)
    setShares(maxShares.toString())
  }

  const setPresetShares = (amount: number) => {
    setShares(amount.toString())
  }

  const sellHalf = () => {
    if (!position) return
    setShares((position.shares / 2).toFixed(2))
  }

  const sell75 = () => {
    if (!position) return
    setShares((position.shares * 0.75).toFixed(2))
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
            <Badge variant={position.unrealized_pnl >= 0 ? 'default' : 'destructive'}>
              {position.unrealized_pnl >= 0 ? '+' : ''}{position.unrealized_pnl.toFixed(2)} P&L
            </Badge>
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
          {/* Quick Action Buttons */}
          <div className="space-y-2">
            <Label className="text-tarkov-text text-xs uppercase tracking-wide">⚡ Quick Buy</Label>
            <div className="grid grid-cols-4 gap-2">
              <Button
                onClick={() => setPresetShares(10)}
                variant="outline"
                size="sm"
                className="bg-tarkov-darker border-tarkov-accent/30 text-tarkov-accent hover:bg-tarkov-accent/10 text-xs font-bold"
              >
                10
              </Button>
              <Button
                onClick={() => setPresetShares(50)}
                variant="outline"
                size="sm"
                className="bg-tarkov-darker border-tarkov-accent/30 text-tarkov-accent hover:bg-tarkov-accent/10 text-xs font-bold"
              >
                50
              </Button>
              <Button
                onClick={() => setPresetShares(100)}
                variant="outline"
                size="sm"
                className="bg-tarkov-darker border-tarkov-accent/30 text-tarkov-accent hover:bg-tarkov-accent/10 text-xs font-bold"
              >
                100
              </Button>
              <Button
                onClick={buyMax}
                variant="outline"
                size="sm"
                className="bg-tarkov-accent/20 border-tarkov-accent text-tarkov-accent hover:bg-tarkov-accent/30 text-xs font-bold"
              >
                MAX
              </Button>
            </div>
          </div>

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
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle2 />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
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
            <div className="space-y-2">
              <Label className="text-tarkov-text text-xs uppercase tracking-wide">⚡ Quick Sell</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  onClick={sellHalf}
                  variant="outline"
                  size="sm"
                  className="bg-tarkov-darker border-tarkov-danger/30 text-tarkov-danger hover:bg-tarkov-danger/10 text-xs font-bold"
                >
                  50%
                </Button>
                <Button
                  onClick={sell75}
                  variant="outline"
                  size="sm"
                  className="bg-tarkov-darker border-tarkov-danger/30 text-tarkov-danger hover:bg-tarkov-danger/10 text-xs font-bold"
                >
                  75%
                </Button>
                <Button
                  onClick={handleSellAll}
                  variant="outline"
                  size="sm"
                  className="bg-tarkov-danger/20 border-tarkov-danger text-tarkov-danger hover:bg-tarkov-danger/30 text-xs font-bold"
                >
                  ALL
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

