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
      // Create chart instance with professional dark theme
      const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0f1116' },
        textColor: '#d1d4dc',
        fontSize: 12,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      },
      grid: {
        vertLines: { 
          color: '#1e222d',
          style: 1, // Solid lines
          visible: true,
        },
        horzLines: { 
          color: '#1e222d',
          style: 1,
          visible: true,
        },
      },
      width: chartContainerRef.current.clientWidth,
      height: 500,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#2a2e39',
        barSpacing: 12,
        minBarSpacing: 8,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      rightPriceScale: {
        borderColor: '#2a2e39',
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
        autoScale: true,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#758696',
          width: 1,
          style: 3, // Dashed
          labelBackgroundColor: '#363a45',
        },
        horzLine: {
          color: '#758696',
          width: 1,
          style: 3, // Dashed
          labelBackgroundColor: '#363a45',
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

    // Add candlestick series with professional colors
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',        // Professional teal/green for bullish
      downColor: '#ef5350',      // Professional red for bearish
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      borderUpColor: '#26a69a',
      borderDownColor: '#ef5350',
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
          color: candle.close >= candle.open ? 'rgba(38, 166, 154, 0.3)' : 'rgba(239, 83, 80, 0.3)',
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
          color: latestCandle.close >= latestCandle.open ? 'rgba(38, 166, 154, 0.3)' : 'rgba(239, 83, 80, 0.3)',
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
          color: latestCandle.close >= latestCandle.open ? 'rgba(38, 166, 154, 0.3)' : 'rgba(239, 83, 80, 0.3)',
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

      // Create new price line for current price with professional colors
      const priceLine = candlestickSeriesRef.current.createPriceLine({
        price: currentPrice,
        color: trend === 'up' ? '#26a69a' : trend === 'down' ? '#ef5350' : '#758696',
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
          <span className={`text-xl font-bold ${trend === 'up' ? 'text-[#26a69a]' : trend === 'down' ? 'text-[#ef5350]' : 'text-gray-400'}`}>
            ${currentPrice.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Chart Container */}
      <div ref={chartContainerRef} className="w-full" />

      {/* Statistics */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
        <div className="bg-tarkov-darker rounded-lg p-3 border border-[#1e222d]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#26a69a]"></div>
            <span className="text-[#d1d4dc] text-xs">24h High</span>
          </div>
          <p className="text-lg font-bold text-[#26a69a] mt-1">${stats.high.toFixed(2)}</p>
        </div>
        <div className="bg-tarkov-darker rounded-lg p-3 border border-[#1e222d]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ef5350]"></div>
            <span className="text-[#d1d4dc] text-xs">24h Low</span>
          </div>
          <p className="text-lg font-bold text-[#ef5350] mt-1">${stats.low.toFixed(2)}</p>
        </div>
        <div className="bg-tarkov-darker rounded-lg p-3 border border-[#1e222d]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#758696]"></div>
            <span className="text-[#d1d4dc] text-xs">Total Volume</span>
          </div>
          <p className="text-lg font-bold text-[#758696] mt-1">{stats.volume.toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}

