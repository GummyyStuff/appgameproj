import React from 'react'
import { motion } from 'framer-motion'
import { CaseOpeningResult } from '../../types/caseOpening'
import { formatCurrency } from '../../utils/currency'
import { TarkovCard } from '../ui/TarkovCard'

interface CaseHistoryProps {
  history: CaseOpeningResult[]
}

const CaseHistory: React.FC<CaseHistoryProps> = ({ history }) => {
  if (history.length === 0) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
    >
      <TarkovCard className="p-6 md:p-8">
        <motion.h3
          className="text-xl md:text-2xl font-tarkov font-bold text-tarkov-accent mb-6 text-center"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          🏆 Recent Openings
        </motion.h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {history.slice(0, 6).map((result, index) => {
            const rarityColors: Record<string, string> = {
              common: 'border-gray-400 text-gray-400 bg-gray-400/10',
              uncommon: 'border-green-400 text-green-400 bg-green-400/10',
              rare: 'border-blue-400 text-blue-400 bg-blue-400/10',
              epic: 'border-purple-400 text-purple-400 bg-purple-400/10',
              legendary: 'border-yellow-400 text-yellow-400 bg-yellow-400/10'
            }

            const profit = result.currency_awarded - result.case_type.price

            return (
              <motion.div
                key={result.opening_id}
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{
                  delay: index * 0.1,
                  type: "spring",
                  stiffness: 200,
                  damping: 20
                }}
                whileHover={{
                  scale: 1.05,
                  y: -5,
                  transition: { duration: 0.2 }
                }}
                className={`
                  p-4 md:p-5 rounded-xl border-2 backdrop-blur-sm
                  ${rarityColors[result.item_won.rarity]}
                  hover:shadow-lg transition-all duration-300
                `}
              >
                <div className="text-xs text-gray-400 mb-2 uppercase tracking-wide">
                  {result.case_type.name}
                </div>

                <div className="font-bold mb-3 text-sm md:text-base leading-tight">
                  {result.item_won.name}
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-tarkov-accent font-semibold">
                    {formatCurrency(result.currency_awarded, 'roubles')}
                  </div>

                  <div className={`text-xs font-medium ${
                    profit > 0
                      ? 'text-green-400'
                      : profit === 0
                        ? 'text-yellow-400'
                        : 'text-red-400'
                  }`}>
                    {profit > 0 && '📈 '}
                    {profit === 0 && '➖ '}
                    {profit < 0 && '📉 '}
                    {profit > 0
                      ? `+${formatCurrency(profit, 'roubles')}`
                      : profit === 0
                        ? 'Break Even'
                        : formatCurrency(Math.abs(profit), 'roubles')}
                  </div>
                </div>

                {/* Rarity indicator */}
                <div className="absolute top-2 right-2">
                  <div className={`
                    w-3 h-3 rounded-full border-2
                    ${rarityColors[result.item_won.rarity].split(' ')[0]}
                  `} />
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Show more button if there are more results */}
        {history.length > 6 && (
          <motion.div
            className="text-center mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <button className="text-tarkov-accent hover:text-tarkov-accent/80 text-sm font-semibold">
              View All History ({history.length} total)
            </button>
          </motion.div>
        )}
      </TarkovCard>
    </motion.div>
  )
}

export default CaseHistory
