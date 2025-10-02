import { useState, useRef, useCallback, useEffect } from 'react';

interface CooldownState {
  isOnCooldown: boolean;
  remainingTime: number;
  spamCount: number;
}

interface CooldownConfig {
  baseCooldown: number; // Base cooldown in milliseconds
  maxCooldown: number; // Maximum cooldown in milliseconds
  spamThreshold: number; // Messages per minute to consider spam
  resetTime: number; // Time in milliseconds to reset spam count
}

const DEFAULT_CONFIG: CooldownConfig = {
  baseCooldown: 1000, // 1 second base cooldown
  maxCooldown: 30000, // 30 seconds maximum cooldown
  spamThreshold: 8, // 8 messages per minute = spam (reasonable threshold)
  resetTime: 60000, // Reset spam count after 1 minute
};

export const useMessageCooldown = (config: Partial<CooldownConfig> = {}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const [cooldownState, setCooldownState] = useState<CooldownState>({
    isOnCooldown: false,
    remainingTime: 0,
    spamCount: 0,
  });

  const messageTimestamps = useRef<number[]>([]);
  const cooldownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cooldownStateRef = useRef<CooldownState>(cooldownState);

  // Keep ref in sync with state
  useEffect(() => {
    cooldownStateRef.current = cooldownState;
  }, [cooldownState]);

  // Calculate current cooldown based on spam count
  const calculateCooldown = useCallback((spamCount: number): number => {
    if (spamCount === 0) return finalConfig.baseCooldown;
    
    // Progressive cooldown: base + (spamCount * 2 seconds)
    const progressiveCooldown = finalConfig.baseCooldown + (spamCount * 2000);
    return Math.min(progressiveCooldown, finalConfig.maxCooldown);
  }, [finalConfig]);

  // Check if user is spamming
  const isSpamming = useCallback((): boolean => {
    const now = Date.now();
    const oneMinuteAgo = now - 60000; // 1 minute ago
    
    // Filter messages from the last minute
    const recentMessages = messageTimestamps.current.filter(timestamp => timestamp > oneMinuteAgo);
    
    return recentMessages.length >= finalConfig.spamThreshold;
  }, [finalConfig.spamThreshold]);

  // Start cooldown
  const startCooldown = useCallback((cooldownMs: number) => {
    console.log('Starting cooldown for', cooldownMs, 'ms');
    
    // Clear any existing timers
    if (cooldownTimeoutRef.current) {
      clearTimeout(cooldownTimeoutRef.current);
      cooldownTimeoutRef.current = null;
    }
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }

    // Set initial cooldown state
    setCooldownState(prev => ({
      isOnCooldown: true,
      remainingTime: cooldownMs,
      spamCount: prev.spamCount,
    }));

    // Update remaining time every second for UI
    updateIntervalRef.current = setInterval(() => {
      setCooldownState(prev => {
        const newRemainingTime = Math.max(0, prev.remainingTime - 1000);
        console.log('Cooldown tick:', newRemainingTime, 'ms remaining');
        if (newRemainingTime <= 0) {
          console.log('Cooldown expired!');
          // Clear the interval when cooldown expires
          if (updateIntervalRef.current) {
            clearInterval(updateIntervalRef.current);
            updateIntervalRef.current = null;
          }
          return {
            isOnCooldown: false,
            remainingTime: 0,
            spamCount: prev.spamCount,
          };
        }
        return {
          ...prev,
          remainingTime: newRemainingTime,
        };
      });
    }, 1000);

    // Backup timeout to ensure cooldown is cleared (safety net)
    cooldownTimeoutRef.current = setTimeout(() => {
      console.log('Backup timeout triggered - clearing cooldown');
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
      setCooldownState(prev => ({
        ...prev,
        isOnCooldown: false,
        remainingTime: 0,
      }));
    }, cooldownMs + 1000); // Add 1 second buffer
  }, []);

  // Reset spam count after good behavior
  const resetSpamCount = useCallback(() => {
    setCooldownState(prev => ({
      ...prev,
      spamCount: 0,
    }));
    messageTimestamps.current = [];
  }, []);

  // Attempt to send a message (Discord.js pattern)
  const attemptSendMessage = useCallback((): { canSend: boolean; cooldownMs?: number; reason?: string } => {
    const now = Date.now();
    const currentState = cooldownStateRef.current;
    
    console.log('Attempting to send message. Current cooldown state:', currentState);
    
    // Check if user is currently on cooldown (Discord.js pattern)
    if (currentState.isOnCooldown) {
      console.log('User is on cooldown, blocking message');
      return {
        canSend: false,
        cooldownMs: currentState.remainingTime,
        reason: `Please wait ${Math.ceil(currentState.remainingTime / 1000)} seconds before sending another message.`,
      };
    }
    
    // Add current message timestamp
    messageTimestamps.current.push(now);
    
    // Check if user is spamming (but only after adding the current message)
    const spamming = isSpamming();
    
    if (spamming) {
      console.log('Spam detected! Applying cooldown...');
      // Increase spam count and apply progressive cooldown
      setCooldownState(prev => ({
        ...prev,
        spamCount: prev.spamCount + 1,
      }));
      
      const cooldownMs = calculateCooldown(currentState.spamCount + 1);
      startCooldown(cooldownMs);
      
      return {
        canSend: false,
        cooldownMs,
        reason: `Spam detected! Please wait ${Math.ceil(cooldownMs / 1000)} seconds before sending another message.`,
      };
    }
    
    // Normal message - allow it, just track timestamp (Discord.js pattern)
    console.log('Normal message allowed');
    // Schedule spam count reset
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
    }
    resetTimeoutRef.current = setTimeout(resetSpamCount, finalConfig.resetTime);
    
    return { canSend: true };
  }, [isSpamming, calculateCooldown, startCooldown, resetSpamCount, finalConfig.resetTime]);

  // Format remaining time for display
  const formatRemainingTime = useCallback((ms: number): string => {
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }, []);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (cooldownTimeoutRef.current) {
      clearTimeout(cooldownTimeoutRef.current);
      cooldownTimeoutRef.current = null;
    }
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
    messageTimestamps.current = [];
    setCooldownState({
      isOnCooldown: false,
      remainingTime: 0,
      spamCount: 0,
    });
  }, []);

  return {
    cooldownState,
    attemptSendMessage,
    formatRemainingTime,
    cleanup,
  };
};
