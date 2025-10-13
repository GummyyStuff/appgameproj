import React, { useState, ReactNode, useRef } from 'react'
import { motion } from 'framer-motion'

export interface Tab {
  id: string
  label: string
  icon?: ReactNode
  content: ReactNode
}

export interface TarkovTabsProps {
  tabs: Tab[]
  defaultTab?: string
  onChange?: (tabId: string) => void
  className?: string
}

export const TarkovTabs: React.FC<TarkovTabsProps> = ({
  tabs,
  defaultTab,
  onChange,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    onChange?.(tabId)
  }

  // Keyboard navigation handler
  const handleKeyDown = (event: React.KeyboardEvent, currentIndex: number) => {
    let nextIndex = currentIndex

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault()
        nextIndex = (currentIndex + 1) % tabs.length
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault()
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
        break
      case 'Home':
        event.preventDefault()
        nextIndex = 0
        break
      case 'End':
        event.preventDefault()
        nextIndex = tabs.length - 1
        break
      default:
        return
    }

    // Focus and activate the new tab
    const nextTab = tabRefs.current[nextIndex]
    if (nextTab) {
      nextTab.focus()
      handleTabChange(tabs[nextIndex].id)
    }
  }

  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Tab Navigation */}
      <div className="bg-tarkov-dark rounded-lg p-2">
        <div className="flex space-x-1" role="tablist" aria-label="Profile sections">
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              ref={(el) => (tabRefs.current[index] = el)}
              onClick={() => handleTabChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`relative flex-1 py-3 px-4 rounded-md text-sm font-medium font-tarkov transition-all duration-200 ${
                activeTab === tab.id
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white hover:bg-tarkov-primary/50'
              }`}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
            >
              {activeTab === tab.id && (
                <motion.div
                  className="absolute inset-0 bg-tarkov-accent rounded-md shadow-lg"
                  layoutId="activeTab"
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 30
                  }}
                />
              )}
              
              <span className="relative z-10 flex items-center justify-center space-x-2">
                {tab.icon && <span aria-hidden="true">{tab.icon}</span>}
                <span>{tab.label}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTabContent}
      </motion.div>
    </div>
  )
}

export default TarkovTabs

