// Performance monitoring specifically for roulette page
export const trackRoulettePerformance = () => {
  const startTime = performance.now()
  
  return {
    markComponentLoaded: (componentName: string) => {
      const loadTime = performance.now() - startTime
      console.log(`[Roulette Performance] ${componentName} loaded in ${loadTime.toFixed(2)}ms`)
      
      // Track in performance API if available
      if ('performance' in window && 'mark' in performance) {
        performance.mark(`roulette-${componentName}-loaded`)
      }
    },
    
    markInteractionReady: () => {
      const readyTime = performance.now() - startTime
      console.log(`[Roulette Performance] Page ready for interaction in ${readyTime.toFixed(2)}ms`)
      
      if ('performance' in window && 'mark' in performance) {
        performance.mark('roulette-interaction-ready')
      }
    },
    
    measureSpinPerformance: () => {
      const spinStart = performance.now()
      
      return {
        end: () => {
          const spinTime = performance.now() - spinStart
          console.log(`[Roulette Performance] Spin animation completed in ${spinTime.toFixed(2)}ms`)
        }
      }
    }
  }
}