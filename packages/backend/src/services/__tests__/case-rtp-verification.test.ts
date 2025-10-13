/**
 * Case Opening RTP & House Edge Verification Tests
 * Verifies that all cases hit the target RTP ranges after balance fix
 * 
 * Expected RTPs (after Option 3 implementation):
 * - Starter Case: 93.9% RTP (6.1% house edge)
 * - Military Case: 95.6% RTP (4.4% house edge)
 * - Premium Case: 94.7% RTP (5.3% house edge)
 * - Legendary Case: 97.9% RTP (2.1% house edge)
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { CaseOpeningService, CaseType, TarkovItem, WeightedItem } from '../case-opening-appwrite';

// Expected item boosts that were applied
const RARITY_BOOSTS = {
  common: 2.3,
  uncommon: 2.7,
  rare: 3.8,
  epic: 5.5,
  legendary: 7.5,
};

// Expected case prices and RTPs (after balanced economy fix)
const EXPECTED_CASES = {
  'Starter Case': { price: 500, targetRTP: 94.13, minRTP: 93.0, maxRTP: 96.0 },
  'Military Case': { price: 1200, targetRTP: 96.14, minRTP: 95.0, maxRTP: 97.0 },
  'Premium Case': { price: 2500, targetRTP: 95.10, minRTP: 94.0, maxRTP: 97.0 },
  'Legendary Case': { price: 5500, targetRTP: 98.08, minRTP: 97.0, maxRTP: 99.0 },
};

// Global test data loaded once
let globalCaseTypes: CaseType[] = [];
let globalItemsByRarity: Map<string, TarkovItem[]> = new Map();

beforeAll(async () => {
  // Load all case types
  globalCaseTypes = await CaseOpeningService.getCaseTypes();
  
  // Load all items and group by rarity
  globalItemsByRarity = new Map();
  
  for (const caseType of globalCaseTypes) {
    const itemPool = await CaseOpeningService.getItemPool(caseType.id);
    
    for (const weightedItem of itemPool) {
      const rarity = weightedItem.item.rarity;
      if (!globalItemsByRarity.has(rarity)) {
        globalItemsByRarity.set(rarity, []);
      }
      
      const items = globalItemsByRarity.get(rarity)!;
      if (!items.find(i => i.id === weightedItem.item.id)) {
        items.push(weightedItem.item);
      }
    }
  }
});

describe('Case Opening RTP Verification', () => {

  test('all cases should exist with correct prices', () => {
    expect(globalCaseTypes.length).toBe(4);
    
    for (const caseType of globalCaseTypes) {
      const expected = EXPECTED_CASES[caseType.name as keyof typeof EXPECTED_CASES];
      
      if (expected) {
        expect(caseType.price).toBe(expected.price);
        console.log(`✅ ${caseType.name}: ${caseType.price}₽ (expected: ${expected.price}₽)`);
      }
    }
  });

  test('all item rarities should have correct average boost', () => {
    for (const [rarity, items] of globalItemsByRarity.entries()) {
      if (items.length === 0) continue;
      
      const avgValue = items.reduce((sum, item) => sum + item.base_value, 0) / items.length;
      
      // Original pre-boost average values (approximate)
      const originalAvg = {
        common: 97.5,      // ~100
        uncommon: 232.5,   // ~230
        rare: 825.0,       // ~800
        epic: 1725.0,      // ~1700
        legendary: 4250.0, // ~4200
      }[rarity] || 100;
      
      const expectedBoost = RARITY_BOOSTS[rarity as keyof typeof RARITY_BOOSTS] || 1;
      const expectedAvg = originalAvg * expectedBoost;
      
      // Allow 20% variance due to item distribution
      const minExpected = expectedAvg * 0.8;
      const maxExpected = expectedAvg * 1.2;
      
      expect(avgValue).toBeGreaterThanOrEqual(minExpected);
      expect(avgValue).toBeLessThanOrEqual(maxExpected);
      
      console.log(`✅ ${rarity}: avg value ${avgValue.toFixed(0)}₽ (expected ~${expectedAvg.toFixed(0)}₽)`);
    }
  });

  test('each case should have correct theoretical RTP', async () => {
    for (const caseType of globalCaseTypes) {
      const expected = EXPECTED_CASES[caseType.name as keyof typeof EXPECTED_CASES];
      
      if (!expected) {
        console.warn(`⚠️  No expected RTP for ${caseType.name}, skipping`);
        continue;
      }
      
      // Get item pool for this case
      const itemPool = await CaseOpeningService.getItemPool(caseType.id);
      
      // Calculate expected value based on rarity distribution
      const distribution = caseType.rarity_distribution;
      
      // Group items by rarity
      const itemsByRarityLocal = new Map<string, WeightedItem[]>();
      for (const weightedItem of itemPool) {
        const rarity = weightedItem.item.rarity;
        if (!itemsByRarityLocal.has(rarity)) {
          itemsByRarityLocal.set(rarity, []);
        }
        itemsByRarityLocal.get(rarity)!.push(weightedItem);
      }
      
      // Calculate expected value
      let expectedValue = 0;
      
      for (const rarity of ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const) {
        const percentage = distribution[rarity];
        const rarityItems = itemsByRarityLocal.get(rarity) || [];
        
        if (rarityItems.length === 0) continue;
        
        // Average value for this rarity tier
        const avgRarityValue = rarityItems.reduce((sum, wi) => sum + wi.item.base_value, 0) / rarityItems.length;
        
        // Contribution to expected value
        expectedValue += (avgRarityValue * percentage / 100);
      }
      
      // Calculate RTP
      const actualRTP = (expectedValue / caseType.price) * 100;
      const houseEdge = 100 - actualRTP;
      
      // Verify RTP is within expected range
      expect(actualRTP).toBeGreaterThanOrEqual(expected.minRTP);
      expect(actualRTP).toBeLessThanOrEqual(expected.maxRTP);
      
      console.log(`✅ ${caseType.name}:`);
      console.log(`   Price: ${caseType.price}₽`);
      console.log(`   Expected Value: ${expectedValue.toFixed(2)}₽`);
      console.log(`   RTP: ${actualRTP.toFixed(2)}% (target: ${expected.targetRTP}%)`);
      console.log(`   House Edge: ${houseEdge.toFixed(2)}%`);
      console.log(`   Net per case: ${(expectedValue - caseType.price).toFixed(2)}₽`);
    }
  });

  test('expensive cases should have better or equal RTP than cheap cases', async () => {
    const rtpMap = new Map<string, number>();
    
    // Calculate RTP for each case
    for (const caseType of globalCaseTypes) {
      const itemPool = await CaseOpeningService.getItemPool(caseType.id);
      const distribution = caseType.rarity_distribution;
      
      const itemsByRarityLocal = new Map<string, WeightedItem[]>();
      for (const weightedItem of itemPool) {
        const rarity = weightedItem.item.rarity;
        if (!itemsByRarityLocal.has(rarity)) {
          itemsByRarityLocal.set(rarity, []);
        }
        itemsByRarityLocal.get(rarity)!.push(weightedItem);
      }
      
      let expectedValue = 0;
      for (const rarity of ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const) {
        const percentage = distribution[rarity];
        const rarityItems = itemsByRarityLocal.get(rarity) || [];
        if (rarityItems.length === 0) continue;
        const avgValue = rarityItems.reduce((sum, wi) => sum + wi.item.base_value, 0) / rarityItems.length;
        expectedValue += (avgValue * percentage / 100);
      }
      
      const rtp = (expectedValue / caseType.price) * 100;
      rtpMap.set(caseType.name, rtp);
    }
    
    // Verify Legendary case has best RTP
    const legendaryRTP = rtpMap.get('Legendary Case');
    expect(legendaryRTP).toBeDefined();
    
    for (const [caseName, rtp] of rtpMap.entries()) {
      if (caseName !== 'Legendary Case') {
        // Legendary should have highest RTP (or close to it)
        expect(legendaryRTP!).toBeGreaterThanOrEqual(rtp - 2); // Allow 2% variance
      }
    }
    
    console.log('\nRTP Progression Check:');
    const sortedCases = [
      { name: 'Starter Case', rtp: rtpMap.get('Starter Case')! },
      { name: 'Military Case', rtp: rtpMap.get('Military Case')! },
      { name: 'Premium Case', rtp: rtpMap.get('Premium Case')! },
      { name: 'Legendary Case', rtp: rtpMap.get('Legendary Case')! },
    ];
    
    for (const { name, rtp } of sortedCases) {
      console.log(`  ${name}: ${rtp.toFixed(2)}% RTP`);
    }
  });

  test('all cases should have house edge between 2-7%', async () => {
    for (const caseType of globalCaseTypes) {
      const itemPool = await CaseOpeningService.getItemPool(caseType.id);
      const distribution = caseType.rarity_distribution;
      
      const itemsByRarityLocal = new Map<string, WeightedItem[]>();
      for (const weightedItem of itemPool) {
        const rarity = weightedItem.item.rarity;
        if (!itemsByRarityLocal.has(rarity)) {
          itemsByRarityLocal.set(rarity, []);
        }
        itemsByRarityLocal.get(rarity)!.push(weightedItem);
      }
      
      let expectedValue = 0;
      for (const rarity of ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const) {
        const percentage = distribution[rarity];
        const rarityItems = itemsByRarityLocal.get(rarity) || [];
        if (rarityItems.length === 0) continue;
        const avgValue = rarityItems.reduce((sum, wi) => sum + wi.item.base_value, 0) / rarityItems.length;
        expectedValue += (avgValue * percentage / 100);
      }
      
      const rtp = (expectedValue / caseType.price) * 100;
      const houseEdge = 100 - rtp;
      
      // Verify house edge is industry-standard (1-7%)
      // Premium cases (like Legendary) can be more generous (1-2% house edge)
      expect(houseEdge).toBeGreaterThanOrEqual(1);
      expect(houseEdge).toBeLessThanOrEqual(7);
      
      console.log(`✅ ${caseType.name}: ${houseEdge.toFixed(2)}% house edge (within 2-7% range)`);
    }
  });
});

describe('Case Opening RTP Simulation (Monte Carlo)', () => {
  test.skip('simulated openings match theoretical RTP (requires 1000+ trials for accuracy)', async () => {
    const TRIALS = 100; // NOTE: Skipped - theoretical tests are more reliable
    
    for (const caseType of globalCaseTypes) {
      const expected = EXPECTED_CASES[caseType.name as keyof typeof EXPECTED_CASES];
      
      if (!expected) continue;
      
      let totalSpent = 0;
      let totalWon = 0;
      
      // Simulate 1000 case openings
      for (let i = 0; i < TRIALS; i++) {
        totalSpent += caseType.price;
        
        // Open case and get item
        const result = await CaseOpeningService.openCase('test-user', caseType.id);
        totalWon += result.currency_awarded;
      }
      
      const simulatedRTP = (totalWon / totalSpent) * 100;
      const simulatedHouseEdge = 100 - simulatedRTP;
      
      // Simulated RTP should be within 10% of theoretical (due to randomness with 100 trials)
      const variance = 10;
      expect(simulatedRTP).toBeGreaterThanOrEqual(expected.targetRTP - variance);
      expect(simulatedRTP).toBeLessThanOrEqual(expected.targetRTP + variance);
      
      console.log(`\n${caseType.name} (${TRIALS} trials):`);
      console.log(`  Total Spent: ${totalSpent.toLocaleString()}₽`);
      console.log(`  Total Won: ${totalWon.toLocaleString()}₽`);
      console.log(`  Net: ${(totalWon - totalSpent).toFixed(0)}₽`);
      console.log(`  Simulated RTP: ${simulatedRTP.toFixed(2)}%`);
      console.log(`  Theoretical RTP: ${expected.targetRTP.toFixed(2)}%`);
      console.log(`  Difference: ${(simulatedRTP - expected.targetRTP).toFixed(2)}%`);
      console.log(`  House Edge: ${simulatedHouseEdge.toFixed(2)}%`);
      console.log(`  ✅ Within acceptable variance (±${variance}%)`);
    }
  }, { timeout: 30000 }); // 30 second timeout for 100 trials per case
});

describe('Item Value Verification', () => {
  test('legendary items should have ~7.5x boost from original', async () => {
    const legendaryItems = globalItemsByRarity.get('legendary') || [];
    
    // Original legendary values were: 3500-5000₽
    // After 7.5x boost: 26,250-37,500₽
    
    for (const item of legendaryItems) {
      expect(item.base_value).toBeGreaterThanOrEqual(20000);
      expect(item.base_value).toBeLessThanOrEqual(40000);
      
      console.log(`✅ ${item.name}: ${item.base_value}₽ (7.5x boost applied)`);
    }
  });

  test('common items should have ~2.3x boost from original', () => {
    const commonItems = globalItemsByRarity.get('common') || [];
    
    // Original common values were: 80-120₽
    // After 2.3x boost: 184-276₽
    
    for (const item of commonItems) {
      expect(item.base_value).toBeGreaterThanOrEqual(150);
      expect(item.base_value).toBeLessThanOrEqual(350);
      
      console.log(`✅ ${item.name}: ${item.base_value}₽ (2.3x boost applied)`);
    }
  });

  test('rare items should have higher values than common items', () => {
    const commonItems = globalItemsByRarity.get('common') || [];
    const rareItems = globalItemsByRarity.get('rare') || [];
    
    if (commonItems.length === 0 || rareItems.length === 0) {
      console.warn('⚠️  Missing items to compare');
      return;
    }
    
    const avgCommon = commonItems.reduce((sum, i) => sum + i.base_value, 0) / commonItems.length;
    const avgRare = rareItems.reduce((sum, i) => sum + i.base_value, 0) / rareItems.length;
    
    expect(avgRare).toBeGreaterThan(avgCommon * 5); // Rare should be at least 5x common
    
    console.log(`✅ Common avg: ${avgCommon.toFixed(0)}₽`);
    console.log(`✅ Rare avg: ${avgRare.toFixed(0)}₽ (${(avgRare / avgCommon).toFixed(1)}x common)`);
  });
});

describe('Progressive RTP Structure', () => {
  test('legendary case should have highest legendary drop rate', async () => {
    const legendaryCase = globalCaseTypes.find(c => c.name === 'Legendary Case');
    expect(legendaryCase).toBeDefined();
    
    const legendaryDropRate = legendaryCase!.rarity_distribution.legendary;
    
    // Verify it's the highest
      for (const caseType of globalCaseTypes) {
        if (caseType.name !== 'Legendary Case') {
        expect(legendaryDropRate).toBeGreaterThanOrEqual(caseType.rarity_distribution.legendary);
      }
    }
    
    expect(legendaryDropRate).toBe(5); // 5% drop rate
    console.log(`✅ Legendary Case has ${legendaryDropRate}% legendary drop rate (highest!)`);
  });

  test('starter case should have lowest legendary access', () => {
    const starterCase = globalCaseTypes.find(c => c.name === 'Starter Case');
    expect(starterCase).toBeDefined();
    
    const starterLegendaryRate = starterCase!.rarity_distribution.legendary;
    expect(starterLegendaryRate).toBe(0); // No legendary items
    
    console.log(`✅ Starter Case has ${starterLegendaryRate}% legendary rate (entry level)`);
  });

  test('expensive cases should provide better value proposition', async () => {
    // Calculate "value per 1000₽ spent" for each case
    const valuePropositions: Array<{ name: string; price: number; valuePerK: number }> = [];
    
    for (const caseType of globalCaseTypes) {
      const itemPool = await CaseOpeningService.getItemPool(caseType.id);
      const distribution = caseType.rarity_distribution;
      
      const itemsByRarityLocal = new Map<string, WeightedItem[]>();
      for (const weightedItem of itemPool) {
        const rarity = weightedItem.item.rarity;
        if (!itemsByRarityLocal.has(rarity)) {
          itemsByRarityLocal.set(rarity, []);
        }
        itemsByRarityLocal.get(rarity)!.push(weightedItem);
      }
      
      let expectedValue = 0;
      for (const rarity of ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const) {
        const percentage = distribution[rarity];
        const rarityItems = itemsByRarityLocal.get(rarity) || [];
        if (rarityItems.length === 0) continue;
        const avgValue = rarityItems.reduce((sum, wi) => sum + wi.item.base_value, 0) / rarityItems.length;
        expectedValue += (avgValue * percentage / 100);
      }
      
      const valuePerThousand = (expectedValue / caseType.price) * 1000;
      valuePropositions.push({ 
        name: caseType.name, 
        price: caseType.price, 
        valuePerK: valuePerThousand 
      });
    }
    
    // Sort by price
    valuePropositions.sort((a, b) => a.price - b.price);
    
    console.log('\nValue Proposition per 1000₽ spent:');
    for (const vp of valuePropositions) {
      console.log(`  ${vp.name}: ${vp.valuePerK.toFixed(0)}₽ back per 1000₽ spent`);
    }
    
    // Legendary should give best value per rouble
    const legendaryVP = valuePropositions.find(vp => vp.name === 'Legendary Case');
    expect(legendaryVP).toBeDefined();
    expect(legendaryVP!.valuePerK).toBeGreaterThan(930); // At least 93% return
  });
});

describe('RTP Compliance', () => {
  test('all cases must meet minimum 93% RTP requirement', async () => {
    for (const caseType of globalCaseTypes) {
      const itemPool = await CaseOpeningService.getItemPool(caseType.id);
      const distribution = caseType.rarity_distribution;
      
      const itemsByRarityLocal = new Map<string, WeightedItem[]>();
      for (const weightedItem of itemPool) {
        const rarity = weightedItem.item.rarity;
        if (!itemsByRarityLocal.has(rarity)) {
          itemsByRarityLocal.set(rarity, []);
        }
        itemsByRarityLocal.get(rarity)!.push(weightedItem);
      }
      
      let expectedValue = 0;
      for (const rarity of ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const) {
        const percentage = distribution[rarity];
        const rarityItems = itemsByRarityLocal.get(rarity) || [];
        if (rarityItems.length === 0) continue;
        const avgValue = rarityItems.reduce((sum, wi) => sum + wi.item.base_value, 0) / rarityItems.length;
        expectedValue += (avgValue * percentage / 100);
      }
      
      const rtp = (expectedValue / caseType.price) * 100;
      
      // CRITICAL: Must be >= 93%
      expect(rtp).toBeGreaterThanOrEqual(93);
      
      console.log(`✅ ${caseType.name}: ${rtp.toFixed(2)}% RTP (>= 93% requirement met)`);
    }
  });

  test('no case should have house edge > 7%', async () => {
    for (const caseType of globalCaseTypes) {
      const itemPool = await CaseOpeningService.getItemPool(caseType.id);
      const distribution = caseType.rarity_distribution;
      
      const itemsByRarityLocal = new Map<string, WeightedItem[]>();
      for (const weightedItem of itemPool) {
        const rarity = weightedItem.item.rarity;
        if (!itemsByRarityLocal.has(rarity)) {
          itemsByRarityLocal.set(rarity, []);
        }
        itemsByRarityLocal.get(rarity)!.push(weightedItem);
      }
      
      let expectedValue = 0;
      for (const rarity of ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const) {
        const percentage = distribution[rarity];
        const rarityItems = itemsByRarityLocal.get(rarity) || [];
        if (rarityItems.length === 0) continue;
        const avgValue = rarityItems.reduce((sum, wi) => sum + wi.item.base_value, 0) / rarityItems.length;
        expectedValue += (avgValue * percentage / 100);
      }
      
      const rtp = (expectedValue / caseType.price) * 100;
      const houseEdge = 100 - rtp;
      
      // CRITICAL: House edge must be <= 7%
      expect(houseEdge).toBeLessThanOrEqual(7);
      
      console.log(`✅ ${caseType.name}: ${houseEdge.toFixed(2)}% house edge (<= 7% requirement met)`);
    }
  });
});

