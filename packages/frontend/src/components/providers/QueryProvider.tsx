import React, { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { initializeCaseCache } from '../../services/caseCache'

interface QueryProviderProps {
  children: React.ReactNode
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false
        }
        return failureCount < 3
      },
    },
    mutations: {
      retry: false,
    },
  },
})

const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  // Initialize case cache service with the query client
  useEffect(() => {
    const caseCache = initializeCaseCache(queryClient)
    // Warm up cache with essential data for better performance
    caseCache.warmCache().catch(error => {
      console.warn('Cache warming failed:', error)
    })
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

export default QueryProvider