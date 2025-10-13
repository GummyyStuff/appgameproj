/**
 * Stock Market Chart Component
 * 
 * Displays real-time price chart with candlestick visualization
 * Uses Recharts for rendering
 */

import { useEffect, useRef, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { Candle } from '../../services/stock-market-api';

interface StockMarketChartProps {
  candles: Candle[]
  currentPrice: number
  trend: 'up' | 'down' | 'neutral'
  onCandleClick?: (candle: Candle) => void
}

export function StockMarketChart({ candles, currentPrice, trend }: StockMarketChartProps) {
  const [chartData, setChartData] = useState<any[]>([])

  useEffect(() => {
    // Transform candles data for chart
    const data = candles.map(candle => ({
      time: new Date(candle.timestamp).toLocaleTimeString(),
      timestamp: candle.timestamp,
      price: candle.close,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume
    }))

    setChartData(data)
  }, [candles])

  // Color based on trend
  const lineColor = trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#6b7280'

  if (chartData.length === 0) {
    return (
      <div className="w-full h-96 bg-tarkov-dark rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tarkov-accent mx-auto mb-4"></div>
          <p className="text-tarkov-text-secondary">Loading chart data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full bg-tarkov-dark rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-tarkov-text">Price Chart</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-tarkov-text-secondary">Current Price:</span>
          <span className={`text-xl font-bold ${trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-400'}`}>
            ${currentPrice.toFixed(2)}
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="time" 
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
            interval="preserveStartEnd"
          />
          <YAxis 
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
            domain={['dataMin - 5', 'dataMax + 5']}
            tickFormatter={(value) => `$${value.toFixed(0)}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#f3f4f6'
            }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
            labelStyle={{ color: '#9ca3af' }}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke={lineColor}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <ReferenceLine 
            y={currentPrice} 
            stroke={lineColor} 
            strokeDasharray="5 5"
            strokeOpacity={0.5}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-4 flex items-center justify-between text-sm text-tarkov-text-secondary">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>High: ${Math.max(...chartData.map(d => d.high)).toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Low: ${Math.min(...chartData.map(d => d.low)).toFixed(2)}</span>
          </div>
        </div>
        <div className="text-xs">
          {candles.length} candles loaded
        </div>
      </div>
    </div>
  )
}

