import React, { useState } from 'react'
import CurrencyManager from '../components/ui/CurrencyManager'
import StatisticsDashboard from '../components/ui/StatisticsDashboard'
import GameHistoryTable from '../components/ui/GameHistoryTable'
import { motion } from 'framer-motion'

const HistoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history'>('dashboard')

  return (
    <div className="py-8 space-y-8">
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">📊</div>
        <h1 className="text-4xl font-tarkov font-bold text-tarkov-accent mb-4">
          Game History & Statistics
        </h1>
        <p className="text-xl text-gray-300">
          Track your gaming performance and manage your virtual currency
        </p>
      </div>

      {/* Currency Management Section */}
      <CurrencyManager />

      {/* Tab Navigation */}
      <div className="bg-tarkov-dark rounded-lg p-6">
        <div className="flex space-x-1 bg-tarkov-secondary rounded-lg p-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
              activeTab === 'dashboard'
                ? 'bg-tarkov-accent text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-tarkov-primary'
            }`}
          >
            📊 Statistics Dashboard
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
              activeTab === 'history'
                ? 'bg-tarkov-accent text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-tarkov-primary'
            }`}
          >
            📋 Game History
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'dashboard' ? (
          <StatisticsDashboard />
        ) : (
          <GameHistoryTable 
            showFilters={true} 
            showExport={true} 
            pageSize={25} 
          />
        )}
      </motion.div>
    </div>
  )
}

export default HistoryPage