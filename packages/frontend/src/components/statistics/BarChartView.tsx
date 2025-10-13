import React from 'react'
import { Bar, BarChart, XAxis, YAxis, LabelList } from 'recharts'
import { motion } from 'framer-motion'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

interface BarChartDataItem {
  name: string
  value: number
  fill: string
  [key: string]: any
}

interface BarChartViewProps {
  title: string
  data: BarChartDataItem[]
  dataKey: string
  nameKey: string
  chartConfig: ChartConfig
  formatValue?: (value: number) => string
  renderDetails: (item: any, index: number) => React.ReactNode
}

/**
 * Reusable Horizontal Bar Chart View Component
 * 
 * Provides a horizontal bar chart visualization better suited for:
 * - Comparing values across categories
 * - Ranking items from highest to lowest
 * - Displaying items with long names
 * 
 * Much more effective than pie charts for frequency and value comparisons.
 * Based on shadcn/ui patterns for charts.
 */
const BarChartView: React.FC<BarChartViewProps> = ({
  title,
  data,
  dataKey,
  nameKey,
  chartConfig,
  formatValue,
  renderDetails
}) => {
  // Calculate dynamic height based on number of items
  // Each bar needs about 40px of space (bar + gap)
  const chartHeight = Math.max(400, data.length * 40)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-tarkov-dark rounded-lg p-6 lg:col-span-2"
    >
      <h3 className="text-xl font-semibold text-white mb-4">{title}</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Horizontal Bar Chart */}
        <div className="w-full max-h-[600px] overflow-y-auto">
          <div style={{ height: `${chartHeight}px`, minHeight: '400px' }}>
            <ChartContainer
              config={chartConfig}
              className="w-full h-full"
            >
              <BarChart 
                data={data} 
                layout="horizontal"
                margin={{ top: 20, right: 60, left: 10, bottom: 20 }}
                barSize={16}
                barGap={8}
                barCategoryGap="20%"
              >
                <XAxis type="number" stroke="#9ca3af" fontSize={11} />
                <YAxis 
                  dataKey={nameKey} 
                  type="category" 
                  width={110}
                  stroke="#9ca3af" 
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => {
                    // Truncate long names
                    return value.length > 14 ? value.substring(0, 14) + '...' : value
                  }}
                />
                <ChartTooltip 
                  cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
                  content={
                    <ChartTooltipContent 
                      hideLabel
                      className="bg-tarkov-secondary border-tarkov-primary"
                      formatter={(value, name, props) => {
                        const displayValue = formatValue ? formatValue(Number(value)) : value
                        return [displayValue, props.payload[nameKey]]
                      }}
                    />
                  } 
                />
                <Bar 
                  dataKey={dataKey} 
                  radius={[0, 4, 4, 0]}
                >
                  <LabelList 
                    dataKey={dataKey} 
                    position="right" 
                    formatter={(value: number) => formatValue ? formatValue(value) : value}
                    className="fill-gray-300 text-[10px]"
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        </div>

        {/* Details List */}
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
          {data.map((item, index) => renderDetails(item, index))}
        </div>
      </div>
    </motion.div>
  )
}

export default BarChartView

