import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useBalance } from '../../hooks/useBalance'
import { useAdvancedFeatures } from '../../hooks/useAdvancedFeatures'
import { supabase } from '../../lib/supabase'
import BlackjackHand from './BlackjackHand'
import BlackjackActions from './BlackjackActions'
import BlackjackBetting from './BlackjackBetting'
import BlackjackResult from './BlackjackResult'
import { Card } from './BlackjackCard'

interface BlackjackGameState {
  gameId: string
  playerHands: Card[][]
  dealerHand: Card[]
  currentHandIndex: number
  handStatuses: ('playing' | 'stand' | 'bust' | 'blackjack')[]
  dealerRevealed: boolean
  gameStatus: 'waiting_for_action' | 'completed'
  canDouble: boolean[]
  canSplit: boolean[]
  totalBetAmount: number
}

interface BlackjackGameResult {
  success: boolean
  game_result: {
    player_hand: Card[]
    dealer_hand: Card[]
    player_value: number
    dealer_value: number
    result: 'player_win' | 'dealer_win' | 'push' | 'blackjack' | 'dealer_blackjack' | 'bust'
    actions_taken: string[]
  }
  bet_amount: number
  win_amount: number
  net_result: number
  new_balance: number
  game_id: string
}

const BlackjackGame: React.FC = () => {
  const { balance, refetch: refreshBalance } = useBalance()
  const { trackGamePlayed, updateAchievementProgress } = useAdvancedFeatures()
  
  // Game state
  const [gameState, setGameState] = useState<BlackjackGameState | null>(null)
  const [betAmount, setBetAmount] = useState(50)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [gameResult, setGameResult] = useState<BlackjackGameResult | null>(null)

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  const calculateHandValue = (hand: Card[]): number => {
    let value = 0
    let aces = 0

    for (const card of hand) {
      if (card.value === 'A') {
        aces++
        value += 11
      } else if (['J', 'Q', 'K'].includes(card.value)) {
        value += 10
      } else {
        value += parseInt(card.value)
      }
    }

    // Convert aces from 11 to 1 if needed
    while (value > 21 && aces > 0) {
      value -= 10
      aces--
    }

    return value
  }

  const startNewGame = async () => {
    if (betAmount > balance) {
      setError('Insufficient balance for this bet')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token

      if (!token) {
        throw new Error('Please log in to place bets')
      }

      const response = await fetch('/api/games/blackjack/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: betAmount })
      })

      const data = await response.json()
      console.log('Blackjack start response:', data)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start game')
      }

      if (!data.success) {
        throw new Error(data.error || 'Game start failed')
      }

      // Validate response structure
      if (!data.game_state || !data.game_state.player_hand || !data.game_state.dealer_hand) {
        console.error('Invalid game state structure:', data)
        throw new Error('Invalid game response from server')
      }

      // Set up initial game state
      const initialState: BlackjackGameState = {
        gameId: data.game_id,
        playerHands: [data.game_state.player_hand],
        dealerHand: data.game_state.dealer_hand,
        currentHandIndex: 0,
        handStatuses: ['playing'],
        dealerRevealed: false,
        gameStatus: 'waiting_for_action',
        canDouble: [true],
        canSplit: [data.game_state.player_hand.length === 2 && 
                   data.game_state.player_hand[0].value === data.game_state.player_hand[1].value],
        totalBetAmount: betAmount
      }

      // Check for immediate blackjack
      const playerValue = calculateHandValue(data.game_state.player_hand)
      if (playerValue === 21) {
        initialState.handStatuses[0] = 'blackjack'
        initialState.gameStatus = 'completed'
        initialState.dealerRevealed = true
        
        // Game completed immediately, show result
        setGameResult({
          success: true,
          game_result: {
            player_hand: data.game_state.player_hand,
            dealer_hand: data.game_state.dealer_hand,
            player_value: playerValue,
            dealer_value: calculateHandValue(data.game_state.dealer_hand),
            result: 'blackjack',
            actions_taken: []
          },
          bet_amount: betAmount,
          win_amount: data.win_amount || Math.floor(betAmount * 2.5),
          net_result: (data.win_amount || Math.floor(betAmount * 2.5)) - betAmount,
          new_balance: balance + (data.win_amount || Math.floor(betAmount * 2.5)) - betAmount,
          game_id: data.game_id
        })
        
        await refreshBalance()
      }

      setGameState(initialState)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start game')
    } finally {
      setIsProcessing(false)
    }
  }

  const performAction = async (action: 'hit' | 'stand' | 'double' | 'split') => {
    if (!gameState || gameState.gameStatus === 'completed') return

    setIsProcessing(true)
    setError(null)

    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token

      if (!token) {
        throw new Error('Please log in to perform actions')
      }

      const requestBody = {
        gameId: gameState.gameId,
        action,
        handIndex: gameState.currentHandIndex
      }
      
      console.log('Sending blackjack action:', requestBody)

      const response = await fetch('/api/games/blackjack/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()
      console.log('Blackjack action response:', data)

      if (!response.ok) {
        throw new Error(data.error || 'Action failed')
      }

      if (!data.success) {
        throw new Error(data.error || 'Action failed')
      }

      // Check if game is completed
      if (data.game_complete) {
        const result = {
          success: data.success,
          game_result: data.game_result,
          bet_amount: betAmount,
          win_amount: data.win_amount,
          net_result: data.net_result,
          new_balance: data.new_balance,
          game_id: data.game_id
        }
        
        setGameResult(result)
        setGameState(null)
        await refreshBalance()
        
        // Track game for achievements
        trackGamePlayed(betAmount, data.win_amount, 'blackjack')
        
        // Update specific blackjack achievements
        if (data.win_amount > 0) {
          // Check if it was a blackjack (21 with first 2 cards)
          if (data.game_result.result === 'blackjack') {
            updateAchievementProgress('blackjack-ace', 1)
          }
        }
      } else {
        // Update game state with new data from game_state
        const updatedState = { ...gameState }
        
        // Update based on action
        if (action === 'hit') {
          // Add new card to current hand
          const newCard = data.game_state.player_hand[data.game_state.player_hand.length - 1]
          updatedState.playerHands[gameState.currentHandIndex].push(newCard)
          updatedState.canDouble[gameState.currentHandIndex] = false
          
          // Check for bust
          const handValue = calculateHandValue(updatedState.playerHands[gameState.currentHandIndex])
          if (handValue > 21) {
            updatedState.handStatuses[gameState.currentHandIndex] = 'bust'
          }
        } else if (action === 'stand') {
          updatedState.handStatuses[gameState.currentHandIndex] = 'stand'
        } else if (action === 'double') {
          // Add new card and stand
          const newCard = data.game_state.player_hand[data.game_state.player_hand.length - 1]
          updatedState.playerHands[gameState.currentHandIndex].push(newCard)
          updatedState.handStatuses[gameState.currentHandIndex] = 'stand'
          updatedState.canDouble[gameState.currentHandIndex] = false
          updatedState.totalBetAmount += betAmount
          
          // Check for bust
          const handValue = calculateHandValue(updatedState.playerHands[gameState.currentHandIndex])
          if (handValue > 21) {
            updatedState.handStatuses[gameState.currentHandIndex] = 'bust'
          }
        } else if (action === 'split') {
          // Split the hand
          const originalHand = updatedState.playerHands[gameState.currentHandIndex]
          updatedState.playerHands[gameState.currentHandIndex] = [originalHand[0]]
          updatedState.playerHands.push([originalHand[1]])
          updatedState.handStatuses.push('playing')
          updatedState.canDouble.push(true)
          updatedState.canSplit.push(false)
          updatedState.canSplit[gameState.currentHandIndex] = false
          updatedState.totalBetAmount += betAmount
        }

        // Move to next hand if current one is complete
        while (updatedState.currentHandIndex < updatedState.handStatuses.length && 
               updatedState.handStatuses[updatedState.currentHandIndex] !== 'playing') {
          updatedState.currentHandIndex++
        }

        setGameState(updatedState)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleNewGame = () => {
    setGameResult(null)
    setGameState(null)
    setError(null)
  }

  const isGameActive = gameState !== null && gameState.gameStatus === 'waiting_for_action'
  const canDouble = gameState?.canDouble[gameState.currentHandIndex] || false
  const canSplit = gameState?.canSplit[gameState.currentHandIndex] || false

  return (
    <div className="min-h-screen bg-gradient-to-br from-tarkov-darker via-tarkov-dark to-tarkov-primary">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-5xl font-tarkov font-bold text-tarkov-accent mb-4">
            🃏 Blackjack
          </h1>
          <p className="text-xl text-gray-300">
            Get as close to 21 as possible without going over
          </p>
          <div className="text-lg text-tarkov-accent mt-2">
            Balance: ₽{balance.toLocaleString()}
          </div>
        </motion.div>

        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Game Area */}
            <div className="lg:col-span-2 space-y-8">
              {/* Dealer Hand */}
              <motion.div
                className="bg-tarkov-dark/50 rounded-xl p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <BlackjackHand
                  cards={gameState?.dealerHand || []}
                  isDealer={true}
                  hideFirstCard={gameState ? !gameState.dealerRevealed : false}
                  handValue={gameState?.dealerRevealed ? 
                    calculateHandValue(gameState.dealerHand) : 
                    undefined
                  }
                  label="Dealer"
                />
              </motion.div>

              {/* Player Hand(s) */}
              <motion.div
                className="bg-tarkov-dark/50 rounded-xl p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {gameState?.playerHands.map((hand, index) => (
                  <div key={index} className={index > 0 ? 'mt-8' : ''}>
                    <BlackjackHand
                      cards={hand}
                      handValue={calculateHandValue(hand)}
                      label={gameState.playerHands.length > 1 ? `Hand ${index + 1}` : 'Your Hand'}
                      isActive={gameState.currentHandIndex === index && gameState.gameStatus === 'waiting_for_action'}
                    />
                  </div>
                )) || (
                  <BlackjackHand
                    cards={[]}
                    label="Your Hand"
                  />
                )}
              </motion.div>

              {/* Actions */}
              <motion.div
                className="bg-tarkov-dark/50 rounded-xl p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <BlackjackActions
                  onHit={() => performAction('hit')}
                  onStand={() => performAction('stand')}
                  onDouble={() => performAction('double')}
                  onSplit={() => performAction('split')}
                  canDouble={canDouble}
                  canSplit={canSplit}
                  isGameActive={isGameActive}
                  isProcessing={isProcessing}
                  balance={balance}
                  currentBet={betAmount}
                />
              </motion.div>
            </div>

            {/* Betting Panel */}
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <BlackjackBetting
                  betAmount={betAmount}
                  setBetAmount={setBetAmount}
                  balance={balance}
                  onStartGame={startNewGame}
                  isGameActive={isGameActive}
                  isProcessing={isProcessing}
                  error={error}
                />
              </motion.div>
            </div>
          </div>
        </div>

        {/* Result Modal */}
        <AnimatePresence>
          {gameResult && (
            <BlackjackResult
              result={gameResult}
              onNewGame={handleNewGame}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default BlackjackGame