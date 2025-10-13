/**
 * Setup Stock Market Game Collections in Appwrite
 * 
 * This script creates all necessary collections for the stock market trading game:
 * - stock_market_positions: User positions (shares owned, avg price)
 * - stock_market_trades: Trade history
 * - stock_market_candles: OHLC price data
 * - stock_market_state: Current market state (single document)
 * 
 * Run with: bun run packages/backend/scripts/setup-stock-market-collections.ts
 */

import { Client, Databases, ID, Permission, Role } from 'node-appwrite';

// Bun automatically loads .env files, no need for dotenv package

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT!)
  .setProject(process.env.APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID!;

interface CollectionConfig {
  collectionId: string;
  name: string;
  attributes: any[];
  indexes: any[];
  permissions: string[];
}

async function createCollection(config: CollectionConfig) {
  try {
    console.log(`\n📦 Creating collection: ${config.name}...`);
    
    // Create collection
    await databases.createCollection(
      DATABASE_ID,
      config.collectionId,
      config.name,
      config.permissions,
      false // documentSecurity
    );
    
    console.log(`✅ Collection created: ${config.name}`);
    
    // Add attributes
    for (const attr of config.attributes) {
      console.log(`  Adding attribute: ${attr.key} (${attr.type})...`);
      
      // Call the appropriate method based on attribute type
      switch (attr.type) {
        case 'string':
          await databases.createStringAttribute(
            DATABASE_ID,
            config.collectionId,
            attr.key,
            attr.size,
            attr.required,
            attr.default,
            attr.array,
            attr.encrypt
          );
          break;
        case 'double':
          await databases.createFloatAttribute(
            DATABASE_ID,
            config.collectionId,
            attr.key,
            attr.required,
            attr.min,
            attr.max,
            attr.default,
            attr.array
          );
          break;
        case 'integer':
          await databases.createIntegerAttribute(
            DATABASE_ID,
            config.collectionId,
            attr.key,
            attr.required,
            attr.min,
            attr.max,
            attr.default,
            attr.array
          );
          break;
        case 'datetime':
          await databases.createDatetimeAttribute(
            DATABASE_ID,
            config.collectionId,
            attr.key,
            attr.required,
            attr.default,
            attr.array
          );
          break;
        case 'enum':
          await databases.createEnumAttribute(
            DATABASE_ID,
            config.collectionId,
            attr.key,
            attr.elements,
            attr.required,
            attr.default,
            attr.array
          );
          break;
        default:
          console.log(`    ⚠️  Unknown attribute type: ${attr.type}, skipping...`);
      }
      
      // Wait for attribute to be ready
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Add indexes
    for (const index of config.indexes) {
      console.log(`  Adding index: ${index.key}...`);
      await databases.createIndex(
        DATABASE_ID,
        config.collectionId,
        index.key,
        index.type,
        index.attributes,
        index.orders
      );
      
      // Wait for index to be ready
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`✅ Collection ${config.name} setup complete!`);
  } catch (error: any) {
    if (error.code === 409) {
      console.log(`⚠️  Collection ${config.name} already exists, skipping...`);
    } else {
      throw error;
    }
  }
}

async function setupStockMarketCollections() {
  console.log('🚀 Setting up Stock Market Game Collections...\n');
  console.log(`Database ID: ${DATABASE_ID}\n`);

  // 1. Stock Market Positions Collection
  await createCollection({
    collectionId: 'stock_market_positions',
    name: 'Stock Market Positions',
    attributes: [
      {
        type: 'string',
        key: 'user_id',
        size: 36,
        required: true,
        array: false
      },
      {
        type: 'double',
        key: 'shares',
        size: 0,
        required: true,
        array: false
      },
      {
        type: 'double',
        key: 'avg_price',
        size: 0,
        required: true,
        array: false
      },
      {
        type: 'double',
        key: 'unrealized_pnl',
        size: 0,
        required: false,
        array: false
      },
      {
        type: 'datetime',
        key: 'created_at',
        size: 0,
        required: true,
        array: false
      },
      {
        type: 'datetime',
        key: 'updated_at',
        size: 0,
        required: true,
        array: false
      }
    ],
    indexes: [
      {
        key: 'idx_user_id',
        type: 'key',
        attributes: ['user_id'],
        orders: ['ASC']
      }
    ],
    permissions: [
      Permission.read(Role.any()),
      Permission.create(Role.users()),
      Permission.update(Role.users()),
      Permission.delete(Role.users())
    ]
  });

  // 2. Stock Market Trades Collection
  await createCollection({
    collectionId: 'stock_market_trades',
    name: 'Stock Market Trades',
    attributes: [
      {
        type: 'string',
        key: 'user_id',
        size: 36,
        required: true,
        array: false
      },
      {
        type: 'string',
        key: 'username',
        size: 50,
        required: true,
        array: false
      },
      {
        type: 'enum',
        key: 'trade_type',
        size: 0,
        required: true,
        array: false,
        elements: ['buy', 'sell']
      },
      {
        type: 'double',
        key: 'shares',
        size: 0,
        required: true,
        array: false
      },
      {
        type: 'double',
        key: 'price',
        size: 0,
        required: true,
        array: false
      },
      {
        type: 'double',
        key: 'pnl',
        size: 0,
        required: false,
        array: false
      },
      {
        type: 'datetime',
        key: 'timestamp',
        size: 0,
        required: true,
        array: false
      }
    ],
    indexes: [
      {
        key: 'idx_user_id',
        type: 'key',
        attributes: ['user_id'],
        orders: ['ASC']
      },
      {
        key: 'idx_timestamp',
        type: 'key',
        attributes: ['timestamp'],
        orders: ['DESC']
      },
      {
        key: 'idx_user_timestamp',
        type: 'key',
        attributes: ['user_id', 'timestamp'],
        orders: ['ASC', 'DESC']
      }
    ],
    permissions: [
      Permission.read(Role.any()),
      Permission.create(Role.users()),
      Permission.update(Role.users()),
      Permission.delete(Role.users())
    ]
  });

  // 3. Stock Market Candles Collection
  await createCollection({
    collectionId: 'stock_market_candles',
    name: 'Stock Market Candles',
    attributes: [
      {
        type: 'datetime',
        key: 'timestamp',
        size: 0,
        required: true,
        array: false
      },
      {
        type: 'double',
        key: 'open',
        size: 0,
        required: true,
        array: false
      },
      {
        type: 'double',
        key: 'high',
        size: 0,
        required: true,
        array: false
      },
      {
        type: 'double',
        key: 'low',
        size: 0,
        required: true,
        array: false
      },
      {
        type: 'double',
        key: 'close',
        size: 0,
        required: true,
        array: false
      },
      {
        type: 'double',
        key: 'volume',
        size: 0,
        required: false,
        array: false
      }
    ],
    indexes: [
      {
        key: 'idx_timestamp',
        type: 'key',
        attributes: ['timestamp'],
        orders: ['DESC']
      }
    ],
    permissions: [
      Permission.read(Role.any()),
      Permission.create(Role.users()),
      Permission.update(Role.users()),
      Permission.delete(Role.users())
    ]
  });

  // 4. Stock Market State Collection (single document)
  await createCollection({
    collectionId: 'stock_market_state',
    name: 'Stock Market State',
    attributes: [
      {
        type: 'double',
        key: 'current_price',
        size: 0,
        required: true,
        array: false
      },
      {
        type: 'double',
        key: 'prev_price',
        size: 0,
        required: false,
        array: false
      },
      {
        type: 'double',
        key: 'volatility',
        size: 0,
        required: false,
        array: false
      },
      {
        type: 'string',
        key: 'trend',
        size: 20,
        required: false,
        array: false
      },
      {
        type: 'datetime',
        key: 'last_update',
        size: 0,
        required: true,
        array: false
      },
      {
        type: 'integer',
        key: 'tick_count',
        size: 0,
        required: false,
        array: false
      }
    ],
    indexes: [],
    permissions: [
      Permission.read(Role.any()),
      Permission.create(Role.users()),
      Permission.update(Role.users()),
      Permission.delete(Role.users())
    ]
  });

  console.log('\n✅ All Stock Market collections created successfully!');
  
  // Create initial market state document
  console.log('\n📊 Creating initial market state...');
  try {
    await databases.createDocument(
      DATABASE_ID,
      'stock_market_state',
      'current',
      {
        current_price: 100.0,
        prev_price: 100.0,
        volatility: 0.02,
        trend: 'neutral',
        last_update: new Date().toISOString(),
        tick_count: 0
      },
      [
        Permission.read(Role.any()),
        Permission.update(Role.users())
      ]
    );
    console.log('✅ Initial market state created!');
  } catch (error: any) {
    if (error.code === 409) {
      console.log('⚠️  Market state already exists, skipping...');
    } else {
      throw error;
    }
  }

  console.log('\n🎉 Stock Market Game setup complete!');
  console.log('\nNext steps:');
  console.log('1. Start the backend server');
  console.log('2. The market state service will begin generating prices');
  console.log('3. Users can start trading!');
}

// Run the setup
setupStockMarketCollections()
  .then(() => {
    console.log('\n✨ Setup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  });

