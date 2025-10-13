/**
 * Fix Case Opening Balance Script
 * 
 * This script implements Option 3: Progressive Rarity-Based Item Boosts + Round Number Pricing
 * 
 * Changes:
 * 1. Multiply item base_value by rarity-specific boosts (common=2.3x, uncommon=2.7x, rare=3.8x, epic=5.5x, legendary=7.5x)
 * 2. Update case prices to psychologically optimized round numbers
 * 
 * Expected Results:
 * - Starter Case: 650₽ (93.9% RTP)
 * - Military Case: 1750₽ (95.6% RTP)
 * - Premium Case: 3000₽ (94.7% RTP)
 * - Legendary Case: 5750₽ (97.9% RTP)
 * 
 * Why expensive cases are better:
 * - Higher legendary drop rates (5% vs 0-1%)
 * - Better overall RTP (97.9% vs 93.9%)
 * - Access to best items in the game
 */

import { appwriteDb } from '../services/appwrite-database';
import { COLLECTION_IDS } from '../config/collections';

interface TarkovItem {
  $id: string;
  name: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  baseValue: number;
  category: string;
  isActive: boolean;
}

interface CaseType {
  $id: string;
  name: string;
  price: number;
}

// Rarity-specific boost multipliers (progressively higher for rare items)
const RARITY_BOOSTS = {
  common: 2.3,
  uncommon: 2.7,
  rare: 3.8,
  epic: 5.5,
  legendary: 7.5,
};

// New psychologically optimized case prices
const NEW_CASE_PRICES = {
  'Starter Case': 650,
  'Military Case': 1750,
  'Premium Case': 3000,
  'Legendary Case': 5750,
};

async function updateItemValues() {
  console.log('\n📦 Step 1: Updating Item Values\n');
  console.log('=' .repeat(80));

  try {
    // Get all items from Appwrite
    const { data: items, error } = await appwriteDb.listDocuments<TarkovItem>(
      COLLECTION_IDS.TARKOV_ITEMS,
      []
    );

    if (error || !items) {
      throw new Error(`Failed to fetch items: ${error}`);
    }

    console.log(`Found ${items.length} items to update`);
    console.log();

    const itemsByRarity: Record<string, TarkovItem[]> = {
      common: [],
      uncommon: [],
      rare: [],
      epic: [],
      legendary: [],
    };

    // Group items by rarity
    for (const item of items) {
      itemsByRarity[item.rarity].push(item);
    }

    // Update each item
    let successCount = 0;
    let errorCount = 0;

    for (const rarity of ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const) {
      const boost = RARITY_BOOSTS[rarity];
      const rarityItems = itemsByRarity[rarity];

      console.log(`\n${rarity.toUpperCase()} items (${boost}x boost):`);
      console.log('-'.repeat(80));

      for (const item of rarityItems) {
        const oldValue = item.baseValue;
        const newValue = Math.round(oldValue * boost);

        try {
          const { error: updateError } = await appwriteDb.updateDocument(
            COLLECTION_IDS.TARKOV_ITEMS,
            item.$id,
            { baseValue: newValue }
          );

          if (updateError) {
            console.error(`❌ ${item.name}: Failed - ${updateError}`);
            errorCount++;
          } else {
            console.log(`✅ ${item.name}: ${oldValue}₽ → ${newValue}₽`);
            successCount++;
          }
        } catch (err: any) {
          console.error(`❌ ${item.name}: Error - ${err.message}`);
          errorCount++;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`\n✅ Updated ${successCount} items successfully`);
    if (errorCount > 0) {
      console.log(`❌ Failed to update ${errorCount} items`);
    }

    return { success: errorCount === 0, successCount, errorCount };
  } catch (error: any) {
    console.error('❌ Fatal error updating items:', error.message);
    throw error;
  }
}

async function updateCasePrices() {
  console.log('\n\n💼 Step 2: Updating Case Prices\n');
  console.log('=' .repeat(80));

  try {
    // Get all case types from Appwrite
    const { data: cases, error } = await appwriteDb.listDocuments<CaseType>(
      COLLECTION_IDS.CASE_TYPES,
      []
    );

    if (error || !cases) {
      throw new Error(`Failed to fetch case types: ${error}`);
    }

    console.log(`Found ${cases.length} cases to update`);
    console.log();

    let successCount = 0;
    let errorCount = 0;

    for (const caseType of cases) {
      const newPrice = NEW_CASE_PRICES[caseType.name as keyof typeof NEW_CASE_PRICES];

      if (!newPrice) {
        console.warn(`⚠️  ${caseType.name}: No price mapping found, skipping`);
        continue;
      }

      const oldPrice = caseType.price;

      try {
        const { error: updateError } = await appwriteDb.updateDocument(
          COLLECTION_IDS.CASE_TYPES,
          caseType.$id,
          { price: newPrice }
        );

        if (updateError) {
          console.error(`❌ ${caseType.name}: Failed - ${updateError}`);
          errorCount++;
        } else {
          const change = newPrice - oldPrice;
          const changeStr = change > 0 ? `+${change}` : `${change}`;
          console.log(`✅ ${caseType.name}: ${oldPrice}₽ → ${newPrice}₽ (${changeStr}₽)`);
          successCount++;
        }
      } catch (err: any) {
        console.error(`❌ ${caseType.name}: Error - ${err.message}`);
        errorCount++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n' + '='.repeat(80));
    console.log(`\n✅ Updated ${successCount} cases successfully`);
    if (errorCount > 0) {
      console.log(`❌ Failed to update ${errorCount} cases`);
    }

    return { success: errorCount === 0, successCount, errorCount };
  } catch (error: any) {
    console.error('❌ Fatal error updating cases:', error.message);
    throw error;
  }
}

async function verifyCacheInvalidation() {
  console.log('\n\n🔄 Step 3: Cache Invalidation\n');
  console.log('=' .repeat(80));
  console.log('Note: Case types and items are cached for 3-5 minutes.');
  console.log('Cache will auto-refresh, or restart the backend server to clear immediately.');
  console.log('✅ No manual action needed');
}

async function displaySummary() {
  console.log('\n\n📊 IMPLEMENTATION SUMMARY\n');
  console.log('=' .repeat(80));
  console.log();
  console.log('Item Value Boosts Applied:');
  console.log('  • Common items: 2.3x boost');
  console.log('  • Uncommon items: 2.7x boost');
  console.log('  • Rare items: 3.8x boost');
  console.log('  • Epic items: 5.5x boost');
  console.log('  • Legendary items: 7.5x boost');
  console.log();
  console.log('New Case Prices:');
  console.log('  • Starter Case: 650₽ (93.9% RTP)');
  console.log('  • Military Case: 1750₽ (95.6% RTP)');
  console.log('  • Premium Case: 3000₽ (94.7% RTP)');
  console.log('  • Legendary Case: 5750₽ (97.9% RTP)');
  console.log();
  console.log('Why This Works:');
  console.log('  ✅ All cases hit 93%+ RTP (fair to players)');
  console.log('  ✅ Legendary case has best RTP (rewards risk-taking)');
  console.log('  ✅ No value_multiplier column needed');
  console.log('  ✅ Round numbers feel premium and clean');
  console.log('  ✅ Expensive cases worth buying (better odds + exclusive items)');
  console.log();
  console.log('=' .repeat(80));
  console.log('✅ Balance fix complete!');
  console.log('=' .repeat(80));
}

async function main() {
  console.log('\n🎯 Case Opening Balance Fix - Option 3 Implementation');
  console.log('=' .repeat(80));
  console.log();
  console.log('This script will:');
  console.log('  1. Update ALL item base_value with progressive boosts');
  console.log('  2. Update case prices to psychologically optimized round numbers');
  console.log('  3. Result: 93-98% RTP with proper tier progression');
  console.log();
  console.log('⚠️  WARNING: This will modify live data in Appwrite!');
  console.log();

  try {
    // Step 1: Update item values
    const itemResult = await updateItemValues();
    
    if (!itemResult.success) {
      console.error('\n❌ Item updates had errors. Stopping before updating cases.');
      console.error('Please fix the errors above and try again.');
      process.exit(1);
    }

    // Step 2: Update case prices
    const caseResult = await updateCasePrices();
    
    if (!caseResult.success) {
      console.error('\n❌ Case updates had errors.');
      console.error('Items were updated but cases were not. You may need to manually fix case prices.');
      process.exit(1);
    }

    // Step 3: Cache invalidation notes
    await verifyCacheInvalidation();

    // Display summary
    await displaySummary();

    console.log('\n✅ All changes applied successfully!');
    console.log('');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the script
main();

