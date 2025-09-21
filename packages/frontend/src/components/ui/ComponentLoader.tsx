import React from 'react'

interface ComponentLoaderProps {
  className?: string
  text?: string
}

const ComponentLoader: React.FC<ComponentLoaderProps> = ({ 
  className = "h-32", 
  text = "Loading..." 
}) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tarkov-accent mx-auto mb-2"></div>
        <p className="text-tarkov-accent text-sm">{text}</p>
      </div>
    </div>
  )
}

export default ComponentLoader