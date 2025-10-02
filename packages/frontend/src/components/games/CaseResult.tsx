import React from 'react'
import { motion } from 'framer-motion'
import { CaseOpeningResult } from '../../types/caseOpening'
import { formatCurrency } from '../../utils/currency'
import { animationVariants } from '../../styles/animationVariants'

interface CaseResultProps {
  result: CaseOpeningResult
}

const CaseResult: React.FC<CaseResultProps> = ({ result }) => {
  const rarityClass = `rarity-${result.item_won.rarity}`

  return (
    <>
      <motion.h3
        className="result-title text-green-400"
        {...animationVariants.result.congratulations}
      >
        🎉 Congratulations! 🎉
      </motion.h3>

      <motion.div
        className="result-container"
        {...animationVariants.result.prize}
      >
        <div className="result-prize-name">
          {result.item_won.name}
        </div>
        <div className={`result-prize-rarity ${rarityClass}`}>
          {result.item_won.rarity.toUpperCase()}
        </div>
        <div className="result-currency">
          +{formatCurrency(result.currency_awarded, 'roubles')}
        </div>
      </motion.div>
    </>
  )
}

export default CaseResult
