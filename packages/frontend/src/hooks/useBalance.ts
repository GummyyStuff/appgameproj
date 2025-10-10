import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { subscribeToUserBalance } from '../services/appwrite-realtime'

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface BalanceData {
    balance: number
    previousBalance?: number
    isLoading: boolean
    error: Error | null
    refetch: () => void
}

/**
 * Hook for managing user balance with real-time updates and animations
 */
export const useBalance = (options: {
    refetchInterval?: number
    enableRealtime?: boolean
} = {}): BalanceData => {
    const { refetchInterval = 10000, enableRealtime = true } = options
    const { user } = useAuth()
    const queryClient = useQueryClient()
    const [previousBalance, setPreviousBalance] = useState<number | undefined>()

    // Query for balance data from backend API
    const { data: balance, isLoading, error, refetch } = useQuery({
        queryKey: ['balance', user?.id],
        queryFn: async () => {
            if (!user) return 0

            const response = await fetch(`${API_URL}/user/balance`, {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'X-Appwrite-User-Id': user.id, // Add user ID header for auth
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch balance');
            }

            const result = await response.json();
            return result.balance || 0;
        },
        enabled: !!user,
        refetchInterval,
        staleTime: 5000, // Consider data stale after 5 seconds
    })

    // Track balance changes for animations
    useEffect(() => {
        if (balance !== undefined && balance !== previousBalance) {
            if (previousBalance !== undefined) {
                // Balance changed, keep the previous value for animation
                setTimeout(() => setPreviousBalance(balance), 2000) // Clear after animation
            } else {
                // First load
                setPreviousBalance(balance)
            }
        }
    }, [balance, previousBalance])

    // Set up real-time subscription for balance updates using Appwrite
    useEffect(() => {
        if (!user || !enableRealtime) return

        const unsubscribe = subscribeToUserBalance(user.id, (newBalance) => {
            if (newBalance !== balance) {
                // Update the query cache with new balance
                queryClient.setQueryData(['balance', user.id], newBalance)
            }
        });

        return unsubscribe;
    }, [user, balance, queryClient, enableRealtime])

    return {
        balance: balance || 0,
        previousBalance,
        isLoading,
        error,
        refetch
    }
}

/**
 * Hook for listening to balance changes across the app
 */
export const useBalanceUpdates = () => {
    const { user } = useAuth()
    const queryClient = useQueryClient()

    const invalidateBalance = () => {
        if (user) {
            queryClient.invalidateQueries({ queryKey: ['balance', user.id] })
            queryClient.invalidateQueries({ queryKey: ['profile', user.id] })
            queryClient.invalidateQueries({ queryKey: ['currencyStats', user.id] })
        }
    }

    const updateBalance = (newBalance: number) => {
        if (user) {
            queryClient.setQueryData(['balance', user.id], newBalance)
        }
    }

    return {
        invalidateBalance,
        updateBalance
    }
}

/**
 * Hook for formatting balance with Tarkov theming
 */
export const useFormattedBalance = () => {
    const { balance, isLoading } = useBalance()

    const formatBalance = (amount?: number, options: {
        showSymbol?: boolean
        compact?: boolean
        showLoading?: boolean
    } = {}) => {
        const { showSymbol = true, compact = false, showLoading = true } = options

        if (isLoading && showLoading) {
            return showSymbol ? '₽...' : '...'
        }

        const value = amount !== undefined ? amount : balance
        const formatted = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
            notation: compact ? 'compact' : 'standard',
            compactDisplay: 'short'
        }).format(value)

        return showSymbol ? `₽${formatted}` : formatted
    }

    return {
        balance,
        isLoading,
        formatBalance
    }
}