import React, { useEffect } from 'react'
import { motion } from 'framer-motion'
import { CaseOpeningResult } from '../../types/caseOpening'
import { formatCurrency } from '../../utils/currency'
import { animationVariants } from '../../styles/animationVariants'

interface CaseResultProps {
  result: CaseOpeningResult
  onCreditWinnings?: (result: CaseOpeningResult, transactionId: string) => Promise<void>
  transactionId?: string
}

const CaseResult: React.FC<CaseResultProps> = ({ result, onCreditWinnings, transactionId }) => {
  const rarityClass = `rarity-${result.item_won.rarity}`

  // Credit winnings with animation delay when component mounts
  useEffect(() => {
    if (onCreditWinnings && transactionId && result.currency_awarded > 0) {
      // Delay the credit to coincide with the congratulations animation
      const creditTimer = setTimeout(async () => {
        try {
          await onCreditWinnings(result, transactionId)
        } catch (error) {
          console.error('Failed to credit winnings in component:', error)
        }
      }, 1500) // Delay to match animation timing

      return () => clearTimeout(creditTimer)
    }
  }, [onCreditWinnings, transactionId, result])

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
