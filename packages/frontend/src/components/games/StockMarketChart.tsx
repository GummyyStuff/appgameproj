/**
 * Stock Market Chart Component
 * 
 * Displays real-time price chart with candlestick visualization
 * Uses TradingView Lightweight Charts for professional stock market charts
 */

import { useEffect, useRef, useState } from 'react';
import { 
  createChart, 
  ColorType,
  CandlestickSeries,
  HistogramSeries,
  CrosshairMode,
  LineStyle,
  type IChartApi, 
  type ISeriesApi, 
  type CandlestickData,
  type IPriceLine,
  type Time 
} from 'lightweight-charts';
import type { Candle } from '../../services/stock-market-api';

interface StockMarketChartProps {
  candles: Candle[]
  currentPrice: number
  trend: 'up' | 'down' | 'neutral'
  onCandleClick?: (candle: Candle) => void
}

export function StockMarketChart({ candles, currentPrice, trend }: StockMarketChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const priceLineRef = useRef<IPriceLine | null>(null) // Store reference to current price line (v5 API)
  const [stats, setStats] = useState({ high: 0, low: 0, volume: 0 })

  useEffect(() => {
    if (!chartContainerRef.current) return

    try {
      // Create chart instance with dark theme
      const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#1a1d29' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: '#374151' },
        horzLines: { color: '#374151' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 500,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#374151',
      },
      rightPriceScale: {
        borderColor: '#374151',
      },
      crosshair: {
        mode: CrosshairMode.Normal, // v5 API: Use enum instead of number
        vertLine: {
          color: '#6b7280',
          labelBackgroundColor: '#374151',
        },
        horzLine: {
          color: '#6b7280',
          labelBackgroundColor: '#374151',
        },
      },
    })

    chartRef.current = chart

    // Add candlestick series (v5 API: addSeries with type parameter)
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    })
    candlestickSeriesRef.current = candlestickSeries

    // Add volume series as histogram (v5 API)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#6b7280',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    })
    volumeSeriesRef.current = volumeSeries

    // Set volume series to the left
    chart.priceScale('').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    })

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ 
          width: chartContainerRef.current.clientWidth 
        })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (chartRef.current) {
        try {
          chartRef.current.remove()
        } catch (error) {
          console.error('Error removing chart:', error)
        }
      }
    }
    } catch (error) {
      console.error('Error initializing chart:', error)
    }
  }, [])

  useEffect(() => {
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current || candles.length === 0) return

    try {
      // Validate and transform candles data with strict checks
      const validCandles = candles
        .filter(candle => {
          // Filter out invalid candles
          if (!candle || !candle.timestamp) return false
          const timestamp = new Date(candle.timestamp).getTime()
          if (isNaN(timestamp)) return false
          // Check all OHLC values are valid numbers
          if (typeof candle.open !== 'number' || isNaN(candle.open)) return false
          if (typeof candle.high !== 'number' || isNaN(candle.high)) return false
          if (typeof candle.low !== 'number' || isNaN(candle.low)) return false
          if (typeof candle.close !== 'number' || isNaN(candle.close)) return false
          if (typeof candle.volume !== 'number' || isNaN(candle.volume)) return false
          // Validate OHLC relationships (high >= low, etc.)
          if (candle.high < candle.low) return false
          return true
        })
        .map(candle => ({
          ...candle,
          timeNum: Math.floor(new Date(candle.timestamp).getTime() / 1000)
        }))
        // Sort by time ascending (required by lightweight-charts)
        .sort((a, b) => a.timeNum - b.timeNum)
        // Remove duplicates (keep last entry for each timestamp)
        .filter((candle, index, arr) => {
          if (index === arr.length - 1) return true
          return candle.timeNum !== arr[index + 1].timeNum
        })

      if (validCandles.length === 0) {
        console.warn('No valid candles to display')
        return
      }

      // Transform to lightweight-charts format
      const candlestickData: CandlestickData[] = validCandles.map(candle => ({
        time: candle.timeNum as Time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      }))

      // Transform volume data
      const volumeData = validCandles.map(candle => ({
        time: candle.timeNum as Time,
        value: candle.volume,
        color: candle.close >= candle.open ? '#10b98133' : '#ef444433',
      }))

      // Calculate statistics
      const high = Math.max(...validCandles.map(c => c.high))
      const low = Math.min(...validCandles.map(c => c.low))
      const totalVolume = validCandles.reduce((sum, c) => sum + c.volume, 0)
      
      setStats({ high, low, volume: totalVolume })

      // Set data (lightweight-charts expects sorted data)
      candlestickSeriesRef.current.setData(candlestickData)
      volumeSeriesRef.current.setData(volumeData)

      // Fit content to view
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent()
      }
    } catch (error) {
      console.error('Error updating chart data:', error)
      // Don't crash the app, just log the error
    }
  }, [candles])

  // Update current price line (v5 API compliant)
  useEffect(() => {
    if (!candlestickSeriesRef.current || !chartRef.current) return
    
    // Validate current price
    if (typeof currentPrice !== 'number' || isNaN(currentPrice) || !isFinite(currentPrice)) {
      console.warn('Invalid current price:', currentPrice)
      return
    }

    try {
      // Remove existing price line before creating new one
      if (priceLineRef.current && candlestickSeriesRef.current) {
        candlestickSeriesRef.current.removePriceLine(priceLineRef.current)
      }

      // Create new price line for current price
      const priceLine = candlestickSeriesRef.current.createPriceLine({
        price: currentPrice,
        color: trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#6b7280',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed, // v5 API: Use enum instead of number
        axisLabelVisible: true,
        title: 'Current',
      })
      
      // Store reference to the price line
      priceLineRef.current = priceLine
    } catch (error) {
      console.error('Error updating price line:', error)
      // Don't crash the app
    }
  }, [currentPrice, trend])

  if (candles.length === 0) {
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

      {/* Chart Container */}
      <div ref={chartContainerRef} className="w-full" />

      {/* Statistics */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
        <div className="bg-tarkov-darker rounded-lg p-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-tarkov-text-secondary">24h High</span>
          </div>
          <p className="text-lg font-bold text-tarkov-text mt-1">${stats.high.toFixed(2)}</p>
        </div>
        <div className="bg-tarkov-darker rounded-lg p-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-tarkov-text-secondary">24h Low</span>
          </div>
          <p className="text-lg font-bold text-tarkov-text mt-1">${stats.low.toFixed(2)}</p>
        </div>
        <div className="bg-tarkov-darker rounded-lg p-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-tarkov-text-secondary">Total Volume</span>
          </div>
          <p className="text-lg font-bold text-tarkov-text mt-1">{stats.volume.toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}

