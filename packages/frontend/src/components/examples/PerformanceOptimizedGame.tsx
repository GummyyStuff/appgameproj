import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { usePerformance, useGamePerformanceTracking } from '../providers/PerformanceProvider';
import { useCache } from '@/hooks/useCache';
import { useABTest } from '@/utils/ab-testing';
import { useErrorTracking } from '@/utils/error-tracking';
import { measurePerformance } from '@/utils/performance';
import { TarkovButton } from '../ui/TarkovButton';
import { TarkovCard } from '../ui/TarkovCard';

/**
 * Example component demonstrating all performance optimizations
 */
export function PerformanceOptimizedGame() {
  const [gameState, setGameState] = useState<'idle' | 'loading' | 'playing' | 'finished'>('idle');
  const [score, setScore] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Performance tracking
  const { trackGamePerformance, reportError } = usePerformance();
  const { trackLoadTime, trackRenderTime, trackGameAction } = useGamePerformanceTracking('demo');

  // A/B Testing
  const { variant, getConfig, track: trackABTest } = useABTest('game_ui_style');
  const buttonStyle = getConfig('buttonStyle', 'classic');
  const animations = getConfig('animations', 'standard');

  // Caching
  const { data: gameData, loading: gameDataLoading, refresh: refreshGameData } = useCache(
    'demo_game_data',
    async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      return { highScore: 1000, achievements: ['first_play'] };
    },
    { ttl: 60000 } // 1 minute cache
  );

  // Error tracking
  const { trackError, submitFeedback } = useErrorTracking();

  // Track component mount time
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const mountTime = performance.now() - startTime;
      trackRenderTime(mountTime);
    };
  }, [trackRenderTime]);

  // Simulate game loading with performance tracking
  const startGame = useCallback(async () => {
    const startTime = performance.now();
    setGameState('loading');
    setError(null);

    try {
      // Simulate game initialization
      await measurePerformance('game_initialization', async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));
      });

      const loadTime = performance.now() - startTime;
      trackLoadTime(loadTime);
      
      setGameState('playing');
      
      // Track A/B test engagement
      trackABTest({ game_started: 1, variant_used: variant?.id });
      
    } catch (error) {
      const gameError = error instanceof Error ? error : new Error('Game start failed');
      reportError(gameError, { gameState: 'loading' });
      trackError(gameError, { action: 'start_game' });
      setError('Failed to start game');
      setGameState('idle');
    }
  }, [trackLoadTime, trackABTest, variant, reportError, trackError]);

  // Simulate game action with performance tracking
  const performGameAction = useCallback(async (action: string) => {
    const startTime = performance.now();
    
    try {
      await measurePerformance(`game_action_${action}`, async () => {
        // Simulate game logic
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (action === 'score') {
          setScore(prev => prev + 10);
        } else if (action === 'finish') {
          setGameState('finished');
        }
      });

      const actionTime = performance.now() - startTime;
      trackGameAction(action, actionTime);
      
    } catch (error) {
      const gameError = error instanceof Error ? error : new Error(`Action ${action} failed`);
      reportError(gameError, { gameState, action });
      trackError(gameError, { action: 'game_action', gameAction: action });
    }
  }, [gameState, trackGameAction, reportError, trackError]);

  // Handle errors with user feedback
  const handleError = useCallback((error: Error) => {
    setError(error.message);
    reportError(error, { component: 'PerformanceOptimizedGame' });
    
    // Offer feedback option
    setTimeout(() => {
      if (confirm('Something went wrong. Would you like to send feedback?')) {
        submitFeedback({
          type: 'bug',
          message: `Error in demo game: ${error.message}`,
        });
      }
    }, 1000);
  }, [reportError, submitFeedback]);

  // Dynamic styling based on A/B test
  const getButtonClass = () => {
    const baseClass = 'px-4 py-2 rounded transition-colors';
    
    if (buttonStyle === 'modern') {
      return `${baseClass} bg-gradient-to-r from-tarkov-accent to-tarkov-accent-dark text-white shadow-lg`;
    }
    
    return `${baseClass} bg-tarkov-accent text-white hover:bg-tarkov-accent-dark`;
  };

  const getAnimationProps = () => {
    if (animations === 'enhanced') {
      return {
        initial: { scale: 0.9, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        transition: { type: 'spring', stiffness: 300 },
      };
    }
    
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration: 0.3 },
    };
  };

  return (
    <motion.div {...getAnimationProps()} className="max-w-md mx-auto p-4">
      <TarkovCard className="p-6">
        <h2 className="text-2xl font-bold text-tarkov-text mb-4">
          Performance Demo Game
        </h2>
        
        {/* A/B Test Indicator */}
        {variant && (
          <div className="mb-4 p-2 bg-tarkov-surface rounded text-sm">
            <span className="text-tarkov-text-secondary">
              A/B Test: {variant.name} ({buttonStyle} buttons, {animations} animations)
            </span>
          </div>
        )}

        {/* Game Data */}
        {gameDataLoading ? (
          <div className="mb-4 text-tarkov-text-secondary">Loading game data...</div>
        ) : gameData ? (
          <div className="mb-4 p-2 bg-tarkov-surface rounded">
            <div className="text-sm text-tarkov-text">
              High Score: {gameData.highScore}
            </div>
            <div className="text-sm text-tarkov-text-secondary">
              Achievements: {gameData.achievements.join(', ')}
            </div>
          </div>
        ) : null}

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-2 bg-red-900 border border-red-700 rounded text-red-200">
            {error}
          </div>
        )}

        {/* Game State */}
        <div className="mb-4">
          <div className="text-tarkov-text">State: {gameState}</div>
          <div className="text-tarkov-text">Score: {score}</div>
        </div>

        {/* Game Controls */}
        <div className="space-y-2">
          {gameState === 'idle' && (
            <button
              onClick={startGame}
              className={getButtonClass()}
            >
              Start Game
            </button>
          )}

          {gameState === 'loading' && (
            <div className="text-tarkov-text-secondary">Loading...</div>
          )}

          {gameState === 'playing' && (
            <div className="space-x-2">
              <button
                onClick={() => performGameAction('score')}
                className={getButtonClass()}
              >
                Score Point
              </button>
              <button
                onClick={() => performGameAction('finish')}
                className={getButtonClass()}
              >
                Finish Game
              </button>
            </div>
          )}

          {gameState === 'finished' && (
            <div className="space-y-2">
              <div className="text-tarkov-text">Game finished! Final score: {score}</div>
              <button
                onClick={() => {
                  setGameState('idle');
                  setScore(0);
                  setError(null);
                }}
                className={getButtonClass()}
              >
                Play Again
              </button>
            </div>
          )}
        </div>

        {/* Performance Actions */}
        <div className="mt-6 pt-4 border-t border-tarkov-border space-y-2">
          <div className="text-sm text-tarkov-text-secondary mb-2">Performance Actions:</div>
          
          <div className="space-x-2">
            <button
              onClick={refreshGameData}
              className="text-xs px-2 py-1 bg-tarkov-surface border border-tarkov-border rounded hover:bg-tarkov-accent transition-colors"
            >
              Refresh Cache
            </button>
            
            <button
              onClick={() => handleError(new Error('Test error'))}
              className="text-xs px-2 py-1 bg-tarkov-surface border border-tarkov-border rounded hover:bg-tarkov-accent transition-colors"
            >
              Test Error
            </button>
            
            <button
              onClick={() => {
                trackABTest({ manual_interaction: 1 });
                alert('A/B test event tracked!');
              }}
              className="text-xs px-2 py-1 bg-tarkov-surface border border-tarkov-border rounded hover:bg-tarkov-accent transition-colors"
            >
              Track Event
            </button>
          </div>
        </div>
      </TarkovCard>
    </motion.div>
  );
}