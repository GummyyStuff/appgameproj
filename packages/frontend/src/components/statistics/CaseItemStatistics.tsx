import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer 
} from 'recharts'
import { 
  type CaseStatistics, 
  type CaseItemStats,
  RARITY_COLORS, 
  CATEGORY_COLORS,
  CATEGORY_ICONS 
} from '../../types/caseStatistics'
import { formatCurrency } from '../../utils/currency'
import { FontAwesomeSVGIcons } from '../ui'

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
  const [statistics, setStatistics] = useState<CaseStatistics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'frequency' | 'value' | 'rarity' | 'category'>('frequency')

  useEffect(() => {
    fetchStatistics()
  }, [])

  const fetchStatistics = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/case-statistics', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch statistics: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success && data.statistics) {
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
        {/* Top Items Chart */}
        {(viewMode === 'frequency' || viewMode === 'value') && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-tarkov-dark rounded-lg p-6"
          >
            <h3 className="text-xl font-semibold text-white mb-4">
              {viewMode === 'frequency' ? 'Most Frequently Won Items' : 'Highest Value Items'}
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart 
                data={viewMode === 'frequency' ? topItemsByFrequency : topItemsByValue}
                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis 
                  dataKey="item_name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={100}
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                />
                <YAxis tick={{ fill: '#9CA3AF' }} />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: '#1a1a1a', 
                    border: '1px solid #f59e0b',
                    borderRadius: '8px'
                  }}
                  formatter={(value: any, name: string) => {
                    if (name === 'count') return [value, 'Times Won']
                    if (name === 'total_value') return [formatCurrency(value, 'roubles'), 'Total Value']
                    return [value, name]
                  }}
                />
                <Legend />
                <Bar 
                  dataKey={viewMode === 'frequency' ? 'count' : 'total_value'} 
                  fill="#f59e0b"
                  name={viewMode === 'frequency' ? 'Times Won' : 'Total Value'}
                />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Rarity Distribution */}
        {viewMode === 'rarity' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-tarkov-dark rounded-lg p-6 lg:col-span-2"
          >
            <h3 className="text-xl font-semibold text-white mb-4">Rarity Distribution</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statistics.rarity_distribution}
                    dataKey="count"
                    nameKey="rarity"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${entry.rarity}: ${entry.count} (${entry.percentage.toFixed(1)}%)`}
                  >
                    {statistics.rarity_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={RARITY_COLORS[entry.rarity] || '#999'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: '#1a1a1a', 
                      border: '1px solid #f59e0b',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="space-y-3">
                {statistics.rarity_distribution.map((rarity) => (
                  <div key={rarity.rarity} className="bg-tarkov-secondary rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span 
                        className="font-semibold capitalize"
                        style={{ color: RARITY_COLORS[rarity.rarity] }}
                      >
                        {rarity.rarity}
                      </span>
                      <span className="text-gray-400 text-sm">
                        {rarity.count} items ({rarity.percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${rarity.percentage}%`,
                          backgroundColor: RARITY_COLORS[rarity.rarity]
                        }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Total Value: {formatCurrency(rarity.total_value, 'roubles')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Category Distribution */}
        {viewMode === 'category' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-tarkov-dark rounded-lg p-6 lg:col-span-2"
          >
            <h3 className="text-xl font-semibold text-white mb-4">Category Distribution</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statistics.category_distribution}
                    dataKey="count"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${CATEGORY_ICONS[entry.category]} ${entry.category}: ${entry.count}`}
                  >
                    {statistics.category_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.category] || '#999'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: '#1a1a1a', 
                      border: '1px solid #f59e0b',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="space-y-3">
                {statistics.category_distribution.map((category) => (
                  <div key={category.category} className="bg-tarkov-secondary rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold capitalize flex items-center gap-2">
                        <span>{CATEGORY_ICONS[category.category]}</span>
                        <span style={{ color: CATEGORY_COLORS[category.category] }}>
                          {category.category}
                        </span>
                      </span>
                      <span className="text-gray-400 text-sm">
                        {category.count} items ({category.percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${category.percentage}%`,
                          backgroundColor: CATEGORY_COLORS[category.category]
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Notable Items Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statistics.most_common_item && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-tarkov-dark rounded-lg p-6 border-2 border-blue-500/30"
          >
            <div className="text-center">
              <div className="text-3xl mb-2">🏆</div>
              <h4 className="text-lg font-semibold text-blue-500 mb-2">Most Common</h4>
              <p className="text-white font-medium">{statistics.most_common_item.item_name}</p>
              <p className="text-gray-400 text-sm mt-1">
                Won {statistics.most_common_item.count} times ({statistics.most_common_item.percentage.toFixed(1)}%)
              </p>
            </div>
          </motion.div>
        )}

        {statistics.highest_value_item && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-tarkov-dark rounded-lg p-6 border-2 border-yellow-500/30"
          >
            <div className="text-center">
              <div className="text-3xl mb-2">💎</div>
              <h4 className="text-lg font-semibold text-yellow-500 mb-2">Highest Value</h4>
              <p className="text-white font-medium">{statistics.highest_value_item.item_name}</p>
              <p className="text-gray-400 text-sm mt-1">
                {formatCurrency(statistics.highest_value_item.total_value, 'roubles')} total
              </p>
            </div>
          </motion.div>
        )}

        {statistics.rarest_item && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-tarkov-dark rounded-lg p-6 border-2 border-purple-500/30"
          >
            <div className="text-center">
              <div className="text-3xl mb-2">✨</div>
              <h4 className="text-lg font-semibold text-purple-500 mb-2">Rarest</h4>
              <p className="text-white font-medium">{statistics.rarest_item.item_name}</p>
              <p className="text-gray-400 text-sm mt-1">
                Only {statistics.rarest_item.count} time{statistics.rarest_item.count !== 1 ? 's' : ''} ({statistics.rarest_item.percentage.toFixed(1)}%)
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default CaseItemStatistics

