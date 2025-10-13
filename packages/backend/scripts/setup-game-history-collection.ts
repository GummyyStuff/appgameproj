/**
 * Setup Game History Collection with Stock Market Support
 * 
 * This script creates/updates the game_history collection to include 'stock_market' as a valid game type.
 * 
 * Run with: bun run packages/backend/scripts/setup-game-history-collection.ts
 */

import { Client, Databases, ID, Permission, Role } from 'node-appwrite';

// Bun automatically loads .env files
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT!)
  .setProject(process.env.APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID!;
const COLLECTION_ID = 'game_history';

async function setupGameHistoryCollection() {
  console.log('🚀 Setting up Game History Collection with Stock Market Support...\n');
  console.log(`Database ID: ${DATABASE_ID}\n`);

  try {
    // Check if collection exists
    try {
      await databases.getCollection(DATABASE_ID, COLLECTION_ID);
      console.log('⚠️  Collection already exists!');
      console.log('⚠️  You need to manually update the game_type enum in Appwrite Console.');
      console.log('⚠️  See: packages/backend/scripts/update-game-history-collection.md\n');
      return;
    } catch (error: any) {
      if (error.code === 404) {
        console.log('📦 Collection does not exist, creating new one...\n');
      } else {
        throw error;
      }
    }

    // Create collection
    console.log('📦 Creating game_history collection...');
    await databases.createCollection(
      DATABASE_ID,
      COLLECTION_ID,
      'Game History',
      [
        Permission.read(Role.any()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users())
      ],
      false // documentSecurity
    );
    console.log('✅ Collection created\n');

    // Wait a bit for collection to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Add attributes
    console.log('📝 Adding attributes...\n');

    // user_id (string)
    console.log('  Adding attribute: user_id (string)...');
    await databases.createStringAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'user_id',
      36,
      true,
      undefined,
      false
    );
    await new Promise(resolve => setTimeout(resolve, 1000));

    // game_type (enum) - INCLUDES STOCK_MARKET
    console.log('  Adding attribute: game_type (enum)...');
    await databases.createEnumAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'game_type',
      ['roulette', 'blackjack', 'case_opening', 'stock_market'],
      true,
      undefined,
      false
    );
    await new Promise(resolve => setTimeout(resolve, 1000));

    // bet_amount (double)
    console.log('  Adding attribute: bet_amount (double)...');
    await databases.createFloatAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'bet_amount',
      true,
      0,
      undefined,
      undefined,
      false
    );
    await new Promise(resolve => setTimeout(resolve, 1000));

    // win_amount (double)
    console.log('  Adding attribute: win_amount (double)...');
    await databases.createFloatAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'win_amount',
      true,
      0,
      undefined,
      undefined,
      false
    );
    await new Promise(resolve => setTimeout(resolve, 1000));

    // result_data (string) - will store JSON
    console.log('  Adding attribute: result_data (string)...');
    await databases.createStringAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'result_data',
      10000,
      true,
      undefined,
      false
    );
    await new Promise(resolve => setTimeout(resolve, 1000));

    // game_duration (integer) - optional
    console.log('  Adding attribute: game_duration (integer)...');
    await databases.createIntegerAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'game_duration',
      false,
      0,
      undefined,
      undefined,
      false
    );
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Add indexes
    console.log('\n📊 Adding indexes...\n');

    // Index on user_id
    console.log('  Adding index: idx_user_id...');
    await databases.createIndex(
      DATABASE_ID,
      COLLECTION_ID,
      'idx_user_id',
      'key',
      ['user_id'],
      ['ASC']
    );
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Index on game_type
    console.log('  Adding index: idx_game_type...');
    await databases.createIndex(
      DATABASE_ID,
      COLLECTION_ID,
      'idx_game_type',
      'key',
      ['game_type'],
      ['ASC']
    );
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Composite index on user_id and game_type
    console.log('  Adding index: idx_user_game_type...');
    await databases.createIndex(
      DATABASE_ID,
      COLLECTION_ID,
      'idx_user_game_type',
      'key',
      ['user_id', 'game_type'],
      ['ASC', 'ASC']
    );
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('\n✅ Game History collection setup complete!');
    console.log('\n📝 The game_type enum now includes:');
    console.log('   - roulette');
    console.log('   - blackjack');
    console.log('   - case_opening');
    console.log('   - stock_market ⬅️ NEW!');
    console.log('\n🎉 You can now record stock market trades in game_history!');

  } catch (error: any) {
    if (error.code === 409) {
      console.log('⚠️  Collection already exists');
    } else {
      console.error('❌ Setup failed:', error);
      throw error;
    }
  }
}

// Run the setup
setupGameHistoryCollection()
  .then(() => {
    console.log('\n✨ Setup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  });

