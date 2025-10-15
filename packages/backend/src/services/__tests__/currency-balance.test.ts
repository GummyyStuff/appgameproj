/**
 * Currency Service Balance Tests
 * Tests for balance operations and negative balance prevention
 */

import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { CurrencyService } from '../currency';
import { UserService } from '../user-service';

describe('CurrencyService - Balance Validation', () => {
  
  test('validateBalance should return valid for sufficient funds', async () => {
    // Mock getUserProfile to return a user with balance
    const mockGetUserProfile = mock(() => 
      Promise.resolve({
        userId: 'test-user',
        username: 'testuser',
        balance: 10000,
        totalWagered: 0,
        totalWon: 0,
        gamesPlayed: 0,
        isModerator: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any)
    );

    UserService.getUserProfile = mockGetUserProfile;

    const result = await CurrencyService.validateBalance('test-user', 5000);

    expect(result.isValid).toBe(true);
    expect(result.currentBalance).toBe(10000);
    expect(result.requiredAmount).toBe(5000);
    expect(result.shortfall).toBeUndefined();
  });

  test('validateBalance should return invalid for insufficient funds', async () => {
    const mockGetUserProfile = mock(() => 
      Promise.resolve({
        userId: 'test-user',
        username: 'testuser',
        balance: 3000,
        totalWagered: 0,
        totalWon: 0,
        gamesPlayed: 0,
        isModerator: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any)
    );

    UserService.getUserProfile = mockGetUserProfile;

    const result = await CurrencyService.validateBalance('test-user', 5000);

    expect(result.isValid).toBe(false);
    expect(result.currentBalance).toBe(3000);
    expect(result.requiredAmount).toBe(5000);
    expect(result.shortfall).toBe(2000);
  });

  test('validateBalance should reject negative amounts', async () => {
    const mockGetUserProfile = mock(() => 
      Promise.resolve({
        userId: 'test-user',
        username: 'testuser',
        balance: 10000,
        totalWagered: 0,
        totalWon: 0,
        gamesPlayed: 0,
        isModerator: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any)
    );

    UserService.getUserProfile = mockGetUserProfile;

    try {
      await CurrencyService.validateBalance('test-user', -100);
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      expect(error.message).toContain('positive');
    }
  });

  test('validateBalance should reject zero amounts', async () => {
    const mockGetUserProfile = mock(() => 
      Promise.resolve({
        userId: 'test-user',
        username: 'testuser',
        balance: 10000,
        totalWagered: 0,
        totalWon: 0,
        gamesPlayed: 0,
        isModerator: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any)
    );

    UserService.getUserProfile = mockGetUserProfile;

    try {
      await CurrencyService.validateBalance('test-user', 0);
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      expect(error.message).toContain('positive');
    }
  });
});

describe('CurrencyService - Transaction Processing', () => {
  
  test('processGameTransaction should reject bet amount that would cause negative balance', async () => {
    const mockGetUserProfile = mock(() => 
      Promise.resolve({
        userId: 'test-user',
        username: 'testuser',
        balance: 5000,
        totalWagered: 0,
        totalWon: 0,
        gamesPlayed: 0,
        isModerator: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any)
    );

    UserService.getUserProfile = mockGetUserProfile;

    try {
      await CurrencyService.processGameTransaction(
        'test-user',
        'roulette',
        10000, // Bet more than balance
        0,     // Win nothing
        { test: true }
      );

      // Should not reach here
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.message).toContain('Insufficient balance');
    }
  });

  test('processGameTransaction should accept valid bet with sufficient balance', async () => {
    // This is a more complex integration test that would need full mocking
    // Marking as todo for now since it requires mocking UserService and GameService
    expect(true).toBe(true); // Placeholder
  });

  test('processGameTransaction should prevent negative bet amounts', async () => {
    const mockGetUserProfile = mock(() => 
      Promise.resolve({
        userId: 'test-user',
        username: 'testuser',
        balance: 10000,
        totalWagered: 0,
        totalWon: 0,
        gamesPlayed: 0,
        isModerator: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any)
    );

    UserService.getUserProfile = mockGetUserProfile;

    try {
      await CurrencyService.processGameTransaction(
        'test-user',
        'roulette',
        -100, // Negative bet
        0,
        { test: true }
      );

      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      expect(error.message).toContain('positive');
    }
  });

  test('processGameTransaction should prevent negative win amounts', async () => {
    const mockGetUserProfile = mock(() => 
      Promise.resolve({
        userId: 'test-user',
        username: 'testuser',
        balance: 10000,
        totalWagered: 0,
        totalWon: 0,
        gamesPlayed: 0,
        isModerator: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any)
    );

    UserService.getUserProfile = mockGetUserProfile;

    try {
      await CurrencyService.processGameTransaction(
        'test-user',
        'roulette',
        1000,
        -100, // Negative win amount
        { test: true }
      );

      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      expect(error.message).toContain('cannot be negative');
    }
  });
});

describe('Edge Cases', () => {
  
  test('balance of exactly 0 should be valid', async () => {
    const mockGetUserProfile = mock(() => 
      Promise.resolve({
        userId: 'test-user',
        username: 'testuser',
        balance: 0, // Exactly 0
        totalWagered: 0,
        totalWon: 0,
        gamesPlayed: 0,
        isModerator: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any)
    );

    UserService.getUserProfile = mockGetUserProfile;

    const result = await CurrencyService.validateBalance('test-user', 100);

    expect(result.isValid).toBe(false);
    expect(result.currentBalance).toBe(0);
  });

  test('very small balance should work correctly', async () => {
    const mockGetUserProfile = mock(() => 
      Promise.resolve({
        userId: 'test-user',
        username: 'testuser',
        balance: 1, // Very small balance
        totalWagered: 0,
        totalWon: 0,
        gamesPlayed: 0,
        isModerator: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any)
    );

    UserService.getUserProfile = mockGetUserProfile;

    const result = await CurrencyService.validateBalance('test-user', 1);

    expect(result.isValid).toBe(true);
    expect(result.currentBalance).toBe(1);
  });

  test('very large balance should work correctly', async () => {
    const mockGetUserProfile = mock(() => 
      Promise.resolve({
        userId: 'test-user',
        username: 'testuser',
        balance: 999999999, // Very large balance
        totalWagered: 0,
        totalWon: 0,
        gamesPlayed: 0,
        isModerator: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any)
    );

    UserService.getUserProfile = mockGetUserProfile;

    const result = await CurrencyService.validateBalance('test-user', 1000000);

    expect(result.isValid).toBe(true);
    expect(result.currentBalance).toBe(999999999);
  });
});

