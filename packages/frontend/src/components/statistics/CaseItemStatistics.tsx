import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  type CaseStatistics, 
  type CaseItemStats,
  RARITY_COLORS, 
  CATEGORY_COLORS,
  CATEGORY_ICONS 
} from '../../types/caseStatistics'
import { formatCurrency } from '../../utils/currency'
import { FontAwesomeSVGIcons } from '../ui'
import { useAuth } from '../../hooks/useAuth'
import PieChartView from './PieChartView'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

interface CaseItemStatisticsProps {
  isLoading?: boolean
}

/**
 * CaseItemStatistics Component
 * 
 * Displays comprehensive statistics about items won from case openings including:
 * - Item win frequency
 * - Rarity distribution
 * - Category distribution
 * - Value statistics
 * - Notable items (most common, rarest, highest value)
 * 
 * Uses Recharts for data visualization
 */
const CaseItemStatistics: React.FC<CaseItemStatisticsProps> = ({ isLoading: isLoadingProp }) => {
  const { user } = useAuth()
  const [statistics, setStatistics] = useState<CaseStatistics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'frequency' | 'value' | 'rarity' | 'category'>('frequency')

  useEffect(() => {
    if (user) {
      fetchStatistics()
    }
  }, [user])

  const fetchStatistics = async () => {
    if (!user?.id) {
      console.warn('CaseItemStatistics: User not ready yet')
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      console.log('Fetching case statistics for user:', user.id)

      const response = await fetch('/api/case-statistics', {
        credentials: 'include', // Send session cookies
        headers: {
          'Content-Type': 'application/json',
          'X-Appwrite-User-Id': user.id // Required by backend auth middleware
        }
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText)
        console.error('Case statistics API error:', response.status, errorText)
        
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in again.')
        }
        
        throw new Error(`Failed to fetch statistics: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success && data.statistics) {
        console.log('Case statistics loaded successfully:', {
          total_cases: data.statistics.total_cases_opened,
          unique_items: data.statistics.items_by_frequency?.length
        })
        setStatistics(data.statistics)
      } else {
        throw new Error('Invalid statistics response')
      }
    } catch (err) {
      console.error('Error fetching case statistics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load statistics')
    } finally {
      setIsLoading(false)
    }
  }

  // Don't render if user isn't authenticated
  if (!user) {
    return null
  }

  if (isLoading || isLoadingProp) {
    return (
      <div className="bg-tarkov-dark rounded-lg p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-tarkov-accent"></div>
          <span className="ml-4 text-gray-400">Loading case opening statistics...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-tarkov-dark rounded-lg p-6">
        <div className="text-center py-8">
          <FontAwesomeSVGIcons.AlertCircle className="text-red-500 mx-auto mb-4" size={48} />
          <h3 className="text-xl font-semibold text-red-500 mb-2">Error Loading Statistics</h3>
          <p className="text-gray-400">{error}</p>
          <button
            onClick={fetchStatistics}
            className="mt-4 px-6 py-2 bg-tarkov-accent text-white rounded-md hover:bg-tarkov-accent-dark transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!statistics || statistics.total_cases_opened === 0) {
    return (
      <div className="bg-tarkov-dark rounded-lg p-6">
        <div className="text-center py-12">
          <FontAwesomeSVGIcons.Package className="text-gray-500 mx-auto mb-4" size={64} />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">No Case Openings Yet</h3>
          <p className="text-gray-500">Start opening cases to see your item statistics here!</p>
        </div>
      </div>
    )
  }

  // Prepare data for charts
  const topItemsByFrequency = statistics.items_by_frequency.slice(0, 10)
  const topItemsByValue = statistics.items_by_value.slice(0, 10)

  // Prepare chart data with fill colors for all views
  const frequencyChartData = topItemsByFrequency.map((item, index) => ({
    ...item,
    fill: RARITY_COLORS[item.rarity] || `hsl(${index * 36}, 70%, 50%)`
  }))

  const valueChartData = topItemsByValue.map((item, index) => ({
    ...item,
    fill: RARITY_COLORS[item.rarity] || `hsl(${index * 36}, 70%, 50%)`
  }))

  const rarityChartData = statistics.rarity_distribution.map((item) => ({
    ...item,
    name: item.rarity,
    value: item.count,
    fill: RARITY_COLORS[item.rarity] || '#999'
  }))

  const categoryChartData = statistics.category_distribution.map((item) => ({
    ...item,
    name: item.category,
    value: item.count,
    fill: CATEGORY_COLORS[item.category] || '#999'
  }))

  // Chart configs for shadcn charts
  const createChartConfig = (data: any[], labelKey: string = 'name') => {
    const config: any = {}
    data.forEach((item) => {
      const key = item[labelKey] || item.item_name || item.name
      config[key] = {
        label: key,
        color: item.fill
      }
    })
    return config
  }

  return (
    <div className="space-y-6">
      {/* Header with Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-tarkov-dark rounded-lg p-4 border border-tarkov-accent/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Cases Opened</p>
              <p className="text-2xl font-bold text-white">{statistics.total_cases_opened}</p>
            </div>
            <FontAwesomeSVGIcons.Package className="text-tarkov-accent" size={32} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-tarkov-dark rounded-lg p-4 border border-green-500/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Value Won</p>
              <p className="text-2xl font-bold text-green-500">
                {formatCurrency(statistics.total_value_won, 'roubles')}
              </p>
            </div>
            <FontAwesomeSVGIcons.TrendingUp className="text-green-500" size={32} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-tarkov-dark rounded-lg p-4 border border-blue-500/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Avg Case Value</p>
              <p className="text-2xl font-bold text-blue-500">
                {formatCurrency(statistics.average_case_value, 'roubles')}
              </p>
            </div>
            <FontAwesomeSVGIcons.ChartBar className="text-blue-500" size={32} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-tarkov-dark rounded-lg p-4 border border-purple-500/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Unique Items</p>
              <p className="text-2xl font-bold text-purple-500">
                {statistics.items_by_frequency.length}
              </p>
            </div>
            <FontAwesomeSVGIcons.Star className="text-purple-500" size={32} />
          </div>
        </motion.div>
      </div>

      {/* View Mode Toggle */}
      <div className="bg-tarkov-dark rounded-lg p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setViewMode('frequency')}
            className={`px-4 py-2 rounded-md transition-colors ${
              viewMode === 'frequency'
                ? 'bg-tarkov-accent text-white'
                : 'bg-tarkov-secondary text-gray-400 hover:text-white'
            }`}
          >
            📊 By Frequency
          </button>
          <button
            onClick={() => setViewMode('value')}
            className={`px-4 py-2 rounded-md transition-colors ${
              viewMode === 'value'
                ? 'bg-tarkov-accent text-white'
                : 'bg-tarkov-secondary text-gray-400 hover:text-white'
            }`}
          >
            💰 By Value
          </button>
          <button
            onClick={() => setViewMode('rarity')}
            className={`px-4 py-2 rounded-md transition-colors ${
              viewMode === 'rarity'
                ? 'bg-tarkov-accent text-white'
                : 'bg-tarkov-secondary text-gray-400 hover:text-white'
            }`}
          >
            ⭐ By Rarity
          </button>
          <button
            onClick={() => setViewMode('category')}
            className={`px-4 py-2 rounded-md transition-colors ${
              viewMode === 'category'
                ? 'bg-tarkov-accent text-white'
                : 'bg-tarkov-secondary text-gray-400 hover:text-white'
            }`}
          >
            📦 By Category
          </button>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Frequency */}
        {viewMode === 'frequency' && (
          <PieChartView
            title="Most Frequently Won Items"
            data={frequencyChartData}
            dataKey="count"
            nameKey="item_name"
            chartConfig={createChartConfig(frequencyChartData, 'item_name')}
            formatLabel={(entry) => `${entry.item_name}: ${entry.count} (${entry.percentage.toFixed(1)}%)`}
            renderDetails={(item) => (
              <div key={item.item_name} className="bg-tarkov-secondary rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span 
                    className="font-semibold text-sm"
                    style={{ color: item.fill }}
                  >
                    {item.item_name}
                  </span>
                  <span className="text-gray-400 text-sm">
                    {item.count} ({item.percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${item.percentage}%`,
                      backgroundColor: item.fill
                    }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1 capitalize">
                  {item.rarity} • {item.category}
                </div>
              </div>
            )}
          />
        )}

        {/* By Value */}
        {viewMode === 'value' && (
          <PieChartView
            title="Highest Value Items"
            data={valueChartData}
            dataKey="total_value"
            nameKey="item_name"
            chartConfig={createChartConfig(valueChartData, 'item_name')}
            formatLabel={(entry) => `${entry.item_name}: ${formatCurrency(entry.total_value, 'roubles')}`}
            renderDetails={(item) => {
              const maxValue = Math.max(...valueChartData.map(i => i.total_value))
              const percentage = (item.total_value / maxValue) * 100
              return (
                <div key={item.item_name} className="bg-tarkov-secondary rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span 
                      className="font-semibold text-sm"
                      style={{ color: item.fill }}
                    >
                      {item.item_name}
                    </span>
                    <span className="text-gray-400 text-sm">
                      {formatCurrency(item.total_value, 'roubles')}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: item.fill
                      }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1 capitalize">
                    {item.rarity} • {item.category} • {item.count} won
                  </div>
                </div>
              )
            }}
          />
        )}

        {/* By Rarity */}
        {viewMode === 'rarity' && (
          <PieChartView
            title="Rarity Distribution"
            data={rarityChartData}
            dataKey="value"
            nameKey="name"
            chartConfig={createChartConfig(rarityChartData)}
            formatLabel={(entry) => `${entry.name}: ${entry.value} (${entry.percentage.toFixed(1)}%)`}
            renderDetails={(item) => (
              <div key={item.rarity} className="bg-tarkov-secondary rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span 
                    className="font-semibold capitalize"
                    style={{ color: item.fill }}
                  >
                    {item.rarity}
                  </span>
                  <span className="text-gray-400 text-sm">
                    {item.count} items ({item.percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${item.percentage}%`,
                      backgroundColor: item.fill
                    }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Total Value: {formatCurrency(item.total_value, 'roubles')}
                </div>
              </div>
            )}
          />
        )}

        {/* By Category */}
        {viewMode === 'category' && (
          <PieChartView
            title="Category Distribution"
            data={categoryChartData}
            dataKey="value"
            nameKey="name"
            chartConfig={createChartConfig(categoryChartData)}
            formatLabel={(entry) => `${CATEGORY_ICONS[entry.category]} ${entry.category}: ${entry.count}`}
            renderDetails={(item) => (
              <div key={item.category} className="bg-tarkov-secondary rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold capitalize flex items-center gap-2">
                    <span>{CATEGORY_ICONS[item.category]}</span>
                    <span style={{ color: item.fill }}>
                      {item.category}
                    </span>
                  </span>
                  <span className="text-gray-400 text-sm">
                    {item.count} items ({item.percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${item.percentage}%`,
                      backgroundColor: item.fill
                    }}
                  />
                </div>
              </div>
            )}
          />
        )}
      </div>

      {/* Notable Items Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statistics.most_common_item && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-tarkov-dark border-blue-500/30 border-2 text-center">
              <CardHeader className="items-center pb-2">
                <div className="text-4xl mb-2">🏆</div>
                <CardTitle className="text-blue-500">Most Common</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-white font-medium text-lg">{statistics.most_common_item.item_name}</p>
                <CardDescription className="text-gray-400">
                  Won {statistics.most_common_item.count} times ({statistics.most_common_item.percentage.toFixed(1)}%)
                </CardDescription>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {statistics.highest_value_item && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-tarkov-dark border-yellow-500/30 border-2 text-center">
              <CardHeader className="items-center pb-2">
                <div className="text-4xl mb-2">💎</div>
                <CardTitle className="text-yellow-500">Highest Value</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-white font-medium text-lg">{statistics.highest_value_item.item_name}</p>
                <CardDescription className="text-gray-400">
                  {formatCurrency(statistics.highest_value_item.total_value, 'roubles')} total
                </CardDescription>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {statistics.rarest_item && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-tarkov-dark border-purple-500/30 border-2 text-center">
              <CardHeader className="items-center pb-2">
                <div className="text-4xl mb-2">✨</div>
                <CardTitle className="text-purple-500">Rarest</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-white font-medium text-lg">{statistics.rarest_item.item_name}</p>
                <CardDescription className="text-gray-400">
                  Only {statistics.rarest_item.count} time{statistics.rarest_item.count !== 1 ? 's' : ''} ({statistics.rarest_item.percentage.toFixed(1)}%)
                </CardDescription>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default CaseItemStatistics

