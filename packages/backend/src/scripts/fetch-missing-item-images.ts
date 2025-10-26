#!/usr/bin/env bun
/**
 * Fetch Missing Item Images from tarkov.dev API
 * Updates items that didn't have images during initial run
 * Run from project root: bun run packages/backend/src/scripts/fetch-missing-item-images.ts
 */

import { resolve } from 'path';

// Load environment variables
const envPath = resolve(__dirname, '../../.env');
console.log(`Loading environment from: ${envPath}`);

try {
  const envFile = await Bun.file(envPath).text();
  const lines = envFile.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        process.env[key.trim()] = value;
      }
    }
  }
  console.log('✅ Environment variables loaded\n');
} catch (error) {
  console.error('⚠️  Could not load .env file:', error);
  console.log('Continuing with existing environment variables...\n');
}

import { COLLECTION_IDS, DATABASE_ID } from '../config/collections';
import { Databases, ID, Client } from 'node-appwrite';
import { Query } from 'node-appwrite';
import { mkdir } from 'fs/promises';
import { existsSync, writeFile } from 'fs';
import { promisify } from 'util';

const writeFileAsync = promisify(writeFile);

const appwriteClient = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT!)
  .setProject(process.env.APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(appwriteClient);

// Tarkov.dev API endpoint
const TARKOV_API_URL = 'https://api.tarkov.dev/graphql';

// More accurate item name mappings
const ITEM_NAME_MAPPINGS: Record<string, string> = {
  'Cigarettes': 'Wilston cigarettes',
  'AI-2 Medikit': 'AI-2 medkit',
  'Tushonka': 'Can of beef stew (large)',
  'Roler Watch': 'Roler submariner gold wrist watch',
  'Red Keycard': 'TerraGroup Labs keycard (Red)',
  'Blue Keycard': 'TerraGroup Labs keycard (Blue)',
  'Green Keycard': 'TerraGroup Labs keycard (Green)',
  'Violet Keycard': 'TerraGroup Labs keycard (Violet)',
};

interface TarkovAPIItem {
  id: string;
  name: string;
  shortName: string;
  iconLink: string;
  gridImageLink: string;
  imageLink: string;
  wikiLink: string;
}

interface TarkovAPIResponse {
  data: {
    items: TarkovAPIItem[];
  };
}

/**
 * Fetch item data from tarkov.dev API
 */
async function fetchItemFromAPI(itemName: string): Promise<TarkovAPIItem | null> {
  try {
    const query = `
      query {
        items(name: "${itemName}") {
          id
          name
          shortName
          iconLink
          gridImageLink
          imageLink
          wikiLink
        }
      }
    `;

    const response = await fetch(TARKOV_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      console.error(`❌ HTTP error! status: ${response.status}`);
      return null;
    }

    const data: TarkovAPIResponse = await response.json();
    
    if (data.data?.items && data.data.items.length > 0) {
      return data.data.items[0];
    }
    
    return null;
  } catch (error) {
    console.error(`❌ Error fetching ${itemName}:`, error);
    return null;
  }
}

/**
 * Download image from URL
 */
async function downloadImage(url: string, filePath: string): Promise<boolean> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`❌ Failed to download image from ${url}`);
      return false;
    }

    const buffer = await response.arrayBuffer();
    await writeFileAsync(filePath, Buffer.from(buffer));
    return true;
  } catch (error) {
    console.error(`❌ Error downloading image from ${url}:`, error);
    return false;
  }
}

/**
 * Get items that don't have images
 */
async function getItemsWithoutImages() {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_IDS.TARKOV_ITEMS,
      [Query.limit(100)]
    );
    return response.documents.filter(item => !item.imageUrl);
  } catch (error) {
    console.error('❌ Error fetching items from database:', error);
    return [];
  }
}

/**
 * Update item with image URL in database
 */
async function updateItemImageUrl(itemId: string, imageUrl: string) {
  try {
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTION_IDS.TARKOV_ITEMS,
      itemId,
      {
        imageUrl: imageUrl,
      }
    );
    return true;
  } catch (error: any) {
    console.error(`❌ Error updating item ${itemId}:`, error.message || error);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🖼️  Fetching missing item images from tarkov.dev API...');
  console.log('=========================================\n');

  // Create assets directory structure
  const assetsDir = resolve(__dirname, '../../../frontend/public/assets/items');
  
  // Create subdirectories for each category
  const categories = ['medical', 'electronics', 'consumables', 'valuables', 'keycards'];
  
  if (!existsSync(assetsDir)) {
    await mkdir(assetsDir, { recursive: true });
    console.log(`📁 Created directory: ${assetsDir}\n`);
  }

  for (const category of categories) {
    const categoryDir = resolve(assetsDir, category);
    if (!existsSync(categoryDir)) {
      await mkdir(categoryDir, { recursive: true });
    }
  }

  // Get items without images
  const items = await getItemsWithoutImages();
  console.log(`Found ${items.length} items without images\n`);

  if (items.length === 0) {
    console.log('✅ All items already have images!');
    return;
  }

  let successCount = 0;
  let failCount = 0;

  for (const item of items) {
    const itemName = item.name;
    const searchName = ITEM_NAME_MAPPINGS[itemName] || itemName;
    
    console.log(`🔍 Searching for: ${itemName} (${searchName})...`);

    const itemData = await fetchItemFromAPI(searchName);

    if (!itemData) {
      console.log(`  ❌ Not found\n`);
      failCount++;
      continue;
    }

    console.log(`  ✅ Found: ${itemData.name}`);

    // Use gridImageLink if available, otherwise fallback to iconLink
    const imageUrl = itemData.gridImageLink || itemData.iconLink || itemData.imageLink;

    if (!imageUrl) {
      console.log(`  ❌ No image available\n`);
      failCount++;
      continue;
    }

    // Generate filename from item name
    const sanitizedName = itemName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const category = item.category || 'valuables';
    const filename = `${sanitizedName}.png`;
    const filePath = resolve(assetsDir, category, filename);
    
    // Download image
    console.log(`  📥 Downloading from: ${imageUrl}...`);
    const downloaded = await downloadImage(imageUrl, filePath);

    if (!downloaded) {
      console.log(`  ❌ Download failed\n`);
      failCount++;
      continue;
    }

    // Update database with local path
    const dbImageUrl = `/assets/items/${category}/${filename}`;
    const updated = await updateItemImageUrl(item.$id, dbImageUrl);

    if (updated) {
      console.log(`  ✅ Updated database: ${dbImageUrl}\n`);
      successCount++;
    } else {
      console.log(`  ❌ Database update failed\n`);
      failCount++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n=========================================');
  console.log('✅ Image fetching completed!');
  console.log(`\n📊 Summary:`);
  console.log(`   - Items processed: ${items.length}`);
  console.log(`   - Success: ${successCount}`);
  console.log(`   - Failed: ${failCount}`);
  console.log(`\n📁 Images saved to: ${assetsDir}`);
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

