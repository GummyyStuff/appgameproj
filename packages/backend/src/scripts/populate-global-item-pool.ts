/**
 * Script to populate case_item_pools with ALL items for ALL cases
 * This creates a global item pool where all cases can drop any item,
 * with selection based on rarity_distribution percentages only
 */

import { appwriteDb } from '../services/appwrite-database';
import { COLLECTION_IDS } from '../config/collections';

interface CaseType {
  $id: string;
  name: string;
  price: number;
}

interface TarkovItem {
  $id: string;
  name: string;
  rarity: string;
}

interface CaseItemPool {
  caseTypeId: string;
  itemId: string;
  weight: number;
  valueMultiplier: number;
  caseItemKey: string;
}

async function populateGlobalItemPool() {
  console.log('🔄 Starting global item pool population...\n');

  try {
    // Step 1: Get all case types
    console.log('📦 Fetching case types...');
    const { data: cases, error: casesError } = await appwriteDb.listDocuments<CaseType>(
      COLLECTION_IDS.CASE_TYPES
    );

    if (casesError || !cases) {
      console.error('❌ Failed to fetch case types:', casesError);
      process.exit(1);
    }

    console.log(`✅ Found ${cases.length} case types:`);
    cases.forEach(c => console.log(`   - ${c.name} (${c.$id})`));

    // Step 2: Get all items
    console.log('\n🎯 Fetching all items...');
    const { data: items, error: itemsError } = await appwriteDb.listDocuments<TarkovItem>(
      COLLECTION_IDS.TARKOV_ITEMS
    );

    if (itemsError || !items) {
      console.error('❌ Failed to fetch items:', itemsError);
      process.exit(1);
    }

    console.log(`✅ Found ${items.length} items\n`);

    // Step 3: Get ALL existing pool entries (paginate through all)
    console.log('🔍 Fetching existing pool entries...');
    const existingKeys = new Set<string>();
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const { data: existingPools, error: poolsError } = await appwriteDb.listDocuments<CaseItemPool>(
        COLLECTION_IDS.CASE_ITEM_POOLS,
        [
          appwriteDb.limit(limit),
          appwriteDb.offset(offset)
        ]
      );

      if (poolsError) {
        console.error('❌ Failed to fetch existing pools:', poolsError);
        process.exit(1);
      }

      if (!existingPools || existingPools.length === 0) {
        hasMore = false;
      } else {
        existingPools.forEach(p => existingKeys.add(p.caseItemKey));
        offset += limit;
        
        if (existingPools.length < limit) {
          hasMore = false;
        }
      }
    }
    console.log(`✅ Found ${existingKeys.size} existing pool entries\n`);

    // Step 4: Populate pools for each case
    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const caseType of cases) {
      console.log(`\n📦 Processing ${caseType.name}...`);
      
      // Determine value multiplier based on case price
      let valueMultiplier = 1.0;
      if (caseType.price >= 5000) {
        valueMultiplier = 2.0;  // Legendary case
      } else if (caseType.price >= 2500) {
        valueMultiplier = 1.6;  // Premium case
      } else if (caseType.price >= 1000) {
        valueMultiplier = 1.2;  // Military case
      }
      // Starter case stays at 1.0

      for (const item of items) {
        const caseItemKey = `${caseType.$id}_${item.$id}`;

        // Skip if already exists
        if (existingKeys.has(caseItemKey)) {
          skipped++;
          continue;
        }

        // Create new pool entry
        try {
          const { error: createError } = await appwriteDb.createDocument(
            COLLECTION_IDS.CASE_ITEM_POOLS,
            {
              caseTypeId: caseType.$id,
              itemId: item.$id,
              weight: 1.0,  // Not used in rarity-based selection
              valueMultiplier: valueMultiplier,
              caseItemKey: caseItemKey,
              createdAt: new Date().toISOString()
            }
          );

          if (createError) {
            console.error(`   ❌ Error creating pool entry for ${item.name}:`, createError);
            errors++;
          } else {
            created++;
            process.stdout.write('.');
          }
        } catch (error) {
          console.error(`   ❌ Exception creating pool entry for ${item.name}:`, error);
          errors++;
        }
      }

      console.log(`\n   ✅ ${caseType.name} complete`);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    console.log(`   ✅ Created: ${created} new pool entries`);
    console.log(`   ⏭️  Skipped: ${skipped} existing entries`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log('='.repeat(60));

    if (errors === 0) {
      console.log('\n✅ Global item pool successfully populated!');
      console.log('   All cases can now drop any item based on rarity distribution.');
      process.exit(0);
    } else {
      console.log('\n⚠️  Completed with some errors. Please review the log above.');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
populateGlobalItemPool();

