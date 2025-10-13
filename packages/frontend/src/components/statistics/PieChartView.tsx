import React from 'react'
import { Pie, PieChart } from 'recharts'
import { motion } from 'framer-motion'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

interface PieChartDataItem {
  name: string
  value: number
  fill: string
  [key: string]: any
}

interface PieChartViewProps {
  title: string
  data: PieChartDataItem[]
  dataKey: string
  nameKey: string
  chartConfig: ChartConfig
  formatLabel?: (entry: any) => string
  renderDetails: (item: any, index: number) => React.ReactNode
}

/**
 * Reusable Pie Chart View Component
 * 
 * Provides a consistent layout for all pie chart visualizations with:
 * - Left: Pie chart visualization using shadcn/ui ChartContainer
 * - Right: Detailed item list with progress bars
 * 
 * Based on shadcn/ui patterns for charts
 */
const PieChartView: React.FC<PieChartViewProps> = ({
  title,
  data,
  dataKey,
  nameKey,
  chartConfig,
  formatLabel,
  renderDetails
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-tarkov-dark rounded-lg p-6 lg:col-span-2"
    >
      <h3 className="text-xl font-semibold text-white mb-4">{title}</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart Container */}
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[300px]"
        >
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={data}
              dataKey={dataKey}
              nameKey={nameKey}
              label={formatLabel}
            />
          </PieChart>
        </ChartContainer>

        {/* Details List */}
        <div className="space-y-3">
          {data.map((item, index) => renderDetails(item, index))}
        </div>
      </div>
    </motion.div>
  )
}

export default PieChartView

