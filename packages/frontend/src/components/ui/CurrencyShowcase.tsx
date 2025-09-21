import React from 'react'
import CurrencyDisplay from './CurrencyDisplay'
import CurrencyManager from './CurrencyManager'
import TransactionHistory from './TransactionHistory'
import { formatCurrency, formatCompactCurrency, getCurrencySymbol } from '../../utils/currency'

/**
 * Showcase component demonstrating all currency features
 * This component can be used for testing and demonstration purposes
 */
const CurrencyShowcase: React.FC = () => {
  const sampleAmounts = [100, 1500, 25000, 150000, 1000000]

  return (
    <div className="space-y-8 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-tarkov font-bold text-tarkov-accent mb-4">
          Currency System Showcase
        </h1>
        <p className="text-gray-300">
          Demonstrating all virtual currency features with Tarkov theming
        </p>
      </div>

      {/* Currency Display Variations */}
      <div className="bg-tarkov-dark rounded-lg p-6">
        <h2 className="text-xl font-tarkov font-bold text-white mb-4">
          Currency Display Components
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-400">Small Size</h3>
            <CurrencyDisplay size="small" animated={true} />
            <CurrencyDisplay size="small" showLabel={false} animated={true} />
            <CurrencyDisplay size="small" showIcon={false} animated={true} />
          </div>
          
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-400">Medium Size (Default)</h3>
            <CurrencyDisplay size="medium" animated={true} />
            <CurrencyDisplay size="medium" showLabel={false} animated={true} />
            <CurrencyDisplay size="medium" showIcon={false} animated={true} />
          </div>
          
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-400">Large Size</h3>
            <CurrencyDisplay size="large" animated={true} />
            <CurrencyDisplay size="large" showLabel={false} animated={true} />
            <CurrencyDisplay size="large" showIcon={false} animated={true} />
          </div>
        </div>
      </div>

      {/* Currency Formatting Examples */}
      <div className="bg-tarkov-dark rounded-lg p-6">
        <h2 className="text-xl font-tarkov font-bold text-white mb-4">
          Currency Formatting Examples
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-3">Standard Formatting</h3>
            <div className="space-y-2">
              {sampleAmounts.map((amount) => (
                <div key={amount} className="flex justify-between items-center bg-tarkov-secondary rounded p-2">
                  <span className="text-gray-300">Amount: {amount}</span>
                  <span className="text-tarkov-accent font-bold">
                    {formatCurrency(amount, 'roubles')}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-3">Compact Formatting</h3>
            <div className="space-y-2">
              {sampleAmounts.map((amount) => (
                <div key={amount} className="flex justify-between items-center bg-tarkov-secondary rounded p-2">
                  <span className="text-gray-300">Amount: {amount}</span>
                  <span className="text-tarkov-accent font-bold">
                    {formatCompactCurrency(amount, 'roubles')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Currency Symbols */}
      <div className="bg-tarkov-dark rounded-lg p-6">
        <h2 className="text-xl font-tarkov font-bold text-white mb-4">
          Supported Currency Types
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-tarkov-secondary rounded-lg p-4 text-center">
            <div className="text-3xl text-tarkov-accent mb-2">
              {getCurrencySymbol('roubles')}
            </div>
            <div className="text-white font-medium">Roubles</div>
            <div className="text-gray-400 text-sm">Primary Currency</div>
          </div>
          
          <div className="bg-tarkov-secondary rounded-lg p-4 text-center">
            <div className="text-3xl text-green-400 mb-2">
              {getCurrencySymbol('dollars')}
            </div>
            <div className="text-white font-medium">Dollars</div>
            <div className="text-gray-400 text-sm">Secondary Currency</div>
          </div>
          
          <div className="bg-tarkov-secondary rounded-lg p-4 text-center">
            <div className="text-3xl text-blue-400 mb-2">
              {getCurrencySymbol('euros')}
            </div>
            <div className="text-white font-medium">Euros</div>
            <div className="text-gray-400 text-sm">Tertiary Currency</div>
          </div>
        </div>
      </div>

      {/* Full Currency Manager */}
      <CurrencyManager />

      {/* Transaction History Sample */}
      <div className="bg-tarkov-dark rounded-lg p-6">
        <h2 className="text-xl font-tarkov font-bold text-white mb-4">
          Transaction History Component
        </h2>
        <TransactionHistory limit={10} showFilters={true} compact={false} />
      </div>

      {/* Feature Summary */}
      <div className="bg-tarkov-dark rounded-lg p-6">
        <h2 className="text-xl font-tarkov font-bold text-white mb-4">
          Implemented Features
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-tarkov-accent mb-3">✅ Completed Features</h3>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-center space-x-2">
                <span className="text-tarkov-success">•</span>
                <span>Enhanced currency display components with Tarkov theming</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-tarkov-success">•</span>
                <span>Balance update animations and real-time synchronization</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-tarkov-success">•</span>
                <span>Daily bonus claiming interface with countdown timer</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-tarkov-success">•</span>
                <span>Transaction history display with filtering</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-tarkov-success">•</span>
                <span>Currency formatting with Tarkov currency symbols</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-tarkov-success">•</span>
                <span>Real-time balance updates via Supabase Realtime</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-tarkov-success">•</span>
                <span>Comprehensive currency management utilities</span>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-tarkov-accent mb-3">🎯 Key Components</h3>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-center space-x-2">
                <span className="text-tarkov-accent">•</span>
                <span>CurrencyDisplay - Animated balance display</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-tarkov-accent">•</span>
                <span>CurrencyManager - Full currency management</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-tarkov-accent">•</span>
                <span>TransactionHistory - Game history with filters</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-tarkov-accent">•</span>
                <span>BalanceAnimation - Smooth balance transitions</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-tarkov-accent">•</span>
                <span>useBalance - Real-time balance hook</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-tarkov-accent">•</span>
                <span>Currency utilities - Formatting & validation</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CurrencyShowcase