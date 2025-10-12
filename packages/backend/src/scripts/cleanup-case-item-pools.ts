/**
 * Script to clean up case_item_pools table
 * Since we now use a global item pool by default, we don't need
 * all these relationship entries unless they're for case-exclusive items
 */

import { appwriteDb } from '../services/appwrite-database';
import { COLLECTION_IDS } from '../config/collections';

interface CaseItemPool {
  $id: string;
  caseTypeId: string;
  itemId: string;
}

async function cleanupCaseItemPools() {
  console.log('🧹 Starting case_item_pools cleanup...\n');

  try {
    // Get all case_item_pools entries
    console.log('📋 Fetching all case_item_pools entries...');
    const allPools: CaseItemPool[] = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const { data: pools, error } = await appwriteDb.listDocuments<CaseItemPool>(
        COLLECTION_IDS.CASE_ITEM_POOLS,
        [
          appwriteDb.limit(limit),
          appwriteDb.offset(offset)
        ]
      );

      if (error) {
        console.error('❌ Failed to fetch pools:', error);
        process.exit(1);
      }

      if (!pools || pools.length === 0) {
        hasMore = false;
      } else {
        allPools.push(...pools);
        offset += limit;
        
        if (pools.length < limit) {
          hasMore = false;
        }
      }
    }

    console.log(`✅ Found ${allPools.length} case_item_pools entries\n`);

    if (allPools.length === 0) {
      console.log('✅ No entries to clean up!');
      process.exit(0);
    }

    // Confirm deletion
    console.log('⚠️  This will delete ALL case_item_pools entries.');
    console.log('   Items will be globally available to all cases by default.');
    console.log('   You can re-add entries later for case-exclusive items.\n');

    // Delete all entries
    let deleted = 0;
    let errors = 0;

    for (const pool of allPools) {
      try {
        const { error } = await appwriteDb.deleteDocument(
          COLLECTION_IDS.CASE_ITEM_POOLS,
          pool.$id
        );

        if (error) {
          console.error(`❌ Error deleting ${pool.$id}:`, error);
          errors++;
        } else {
          deleted++;
          process.stdout.write('.');
        }
      } catch (error) {
        console.error(`❌ Exception deleting ${pool.$id}:`, error);
        errors++;
      }
    }

    // Summary
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 Summary:');
    console.log(`   ✅ Deleted: ${deleted} entries`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log('='.repeat(60));

    if (errors === 0) {
      console.log('\n✅ Cleanup complete!');
      console.log('   All items are now globally available to all cases.');
      console.log('   Add entries to case_item_pools only for case-exclusive items.');
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
cleanupCaseItemPools();

