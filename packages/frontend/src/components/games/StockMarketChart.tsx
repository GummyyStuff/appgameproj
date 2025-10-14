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
      // Create chart instance with TARKOV military tactical theme
      const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#171923' }, // tarkov-darker
        textColor: '#9ca3af', // Muted gray - easy on eyes
        fontSize: 12,
        fontFamily: '"Roboto Condensed", "Arial", sans-serif', // Tarkov font
      },
      grid: {
        vertLines: { 
          color: '#2D3748', // Subtle grid lines
          style: 1,
          visible: true,
        },
        horzLines: { 
          color: '#2D3748',
          style: 1,
          visible: true,
        },
      },
      width: chartContainerRef.current.clientWidth,
      height: 500,
      timeScale: {
        timeVisible: true,
        secondsVisible: true, // Show seconds for fast trading
        borderColor: '#4A5568', // Tarkov gray
        barSpacing: 15,
        minBarSpacing: 10,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      rightPriceScale: {
        borderColor: '#4A5568',
        scaleMargins: {
          top: 0.12,
          bottom: 0.25,
        },
        autoScale: true,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#F6AD55', // Tarkov accent (tan)
          width: 1,
          style: 3, // Dashed - subtle
          labelBackgroundColor: '#2D3748',
        },
        horzLine: {
          color: '#F6AD55', // Tarkov accent
          width: 1,
          style: 3, // Dashed
          labelBackgroundColor: '#2D3748',
        },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    })

    chartRef.current = chart

    // Add candlestick series with Tarkov military colors
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#38A169',        // Tarkov success green
      downColor: '#E53E3E',      // Tarkov danger red
      borderVisible: false,
      wickUpColor: '#38A169',
      wickDownColor: '#E53E3E',
      borderUpColor: '#38A169',
      borderDownColor: '#E53E3E',
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

  // Track previous candles length for update vs setData decision
  const prevCandlesLengthRef = useRef(0)

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

      // Calculate statistics
      const high = Math.max(...validCandles.map(c => c.high))
      const low = Math.min(...validCandles.map(c => c.low))
      const totalVolume = validCandles.reduce((sum, c) => sum + c.volume, 0)
      
      setStats({ high, low, volume: totalVolume })

      // Determine if this is initial load or real-time update
      const isInitialLoad = prevCandlesLengthRef.current === 0
      const isNewCandle = validCandles.length > prevCandlesLengthRef.current

      if (isInitialLoad) {
        // Initial load: use setData for all candles
        const candlestickData: CandlestickData[] = validCandles.map(candle => ({
          time: candle.timeNum as Time,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        }))

        const volumeData = validCandles.map(candle => ({
          time: candle.timeNum as Time,
          value: candle.volume,
          color: candle.close >= candle.open ? 'rgba(56, 161, 105, 0.35)' : 'rgba(229, 62, 62, 0.35)', // Tarkov colors
        }))

        candlestickSeriesRef.current.setData(candlestickData)
        volumeSeriesRef.current.setData(volumeData)

        // Fit content to view on initial load
        if (chartRef.current) {
          chartRef.current.timeScale().fitContent()
        }

        console.log('📊 Chart initialized with', validCandles.length, 'candles')
      } else if (isNewCandle) {
        // Real-time update: use update() for the latest candle
        const latestCandle = validCandles[validCandles.length - 1]
        
        const candlestickUpdate: CandlestickData = {
          time: latestCandle.timeNum as Time,
          open: latestCandle.open,
          high: latestCandle.high,
          low: latestCandle.low,
          close: latestCandle.close,
        }

        const volumeUpdate = {
          time: latestCandle.timeNum as Time,
          value: latestCandle.volume,
          color: latestCandle.close >= latestCandle.open ? 'rgba(56, 161, 105, 0.35)' : 'rgba(229, 62, 62, 0.35)',
        }

        candlestickSeriesRef.current.update(candlestickUpdate)
        volumeSeriesRef.current.update(volumeUpdate)

        console.log('📊 Chart updated with new candle at', new Date(latestCandle.timeNum * 1000).toISOString())
      } else {
        // Update existing candle (price changes within the same time period)
        const latestCandle = validCandles[validCandles.length - 1]
        
        const candlestickUpdate: CandlestickData = {
          time: latestCandle.timeNum as Time,
          open: latestCandle.open,
          high: latestCandle.high,
          low: latestCandle.low,
          close: latestCandle.close,
        }

        const volumeUpdate = {
          time: latestCandle.timeNum as Time,
          value: latestCandle.volume,
          color: latestCandle.close >= latestCandle.open ? 'rgba(56, 161, 105, 0.35)' : 'rgba(229, 62, 62, 0.35)',
        }

        candlestickSeriesRef.current.update(candlestickUpdate)
        volumeSeriesRef.current.update(volumeUpdate)

        console.log('📊 Chart updated existing candle at', new Date(latestCandle.timeNum * 1000).toISOString())
      }

      // Store the current length for next comparison
      prevCandlesLengthRef.current = validCandles.length
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

      // Create new price line for current price with Tarkov colors
      const priceLine = candlestickSeriesRef.current.createPriceLine({
        price: currentPrice,
        color: trend === 'up' ? '#38A169' : trend === 'down' ? '#E53E3E' : '#F6AD55', // Tarkov accent for neutral
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
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
    <div className="w-full bg-tarkov-dark rounded-lg p-4 border border-tarkov-secondary">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-tarkov-text font-tarkov">LIVE PRICE CHART</h3>
        <div className="flex items-center gap-3 px-4 py-2 rounded bg-tarkov-darker border" style={{
          borderColor: trend === 'up' ? '#38A169' : trend === 'down' ? '#E53E3E' : '#F6AD55'
        }}>
          <span className="text-xs text-tarkov-text-secondary uppercase tracking-wider">Current:</span>
          <span className="text-xl font-bold font-tarkov" style={{
            color: trend === 'up' ? '#38A169' : trend === 'down' ? '#E53E3E' : '#F6AD55'
          }}>
            ${currentPrice.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Chart Container */}
      <div ref={chartContainerRef} className="w-full rounded border border-tarkov-secondary" />

      {/* Statistics - Tarkov Military Style */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
        <div className="bg-tarkov-darker rounded p-3 border border-tarkov-secondary">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-tarkov-success"></div>
            <span className="text-tarkov-text-secondary text-xs uppercase tracking-wide">High</span>
          </div>
          <p className="text-lg font-bold text-tarkov-success font-tarkov">${stats.high.toFixed(2)}</p>
        </div>
        
        <div className="bg-tarkov-darker rounded p-3 border border-tarkov-secondary">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-tarkov-danger"></div>
            <span className="text-tarkov-text-secondary text-xs uppercase tracking-wide">Low</span>
          </div>
          <p className="text-lg font-bold text-tarkov-danger font-tarkov">${stats.low.toFixed(2)}</p>
        </div>
        
        <div className="bg-tarkov-darker rounded p-3 border border-tarkov-secondary">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-tarkov-accent"></div>
            <span className="text-tarkov-text-secondary text-xs uppercase tracking-wide">Volume</span>
          </div>
          <p className="text-lg font-bold text-tarkov-accent font-tarkov">{stats.volume.toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}

