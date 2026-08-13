/**
 * Debug script to inspect the users collection in Appwrite
 */
import { Client, Databases, ID, Permission, Role } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT!)
  .setProject(process.env.APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'main_db';
const COLLECTION_ID = 'users';

async function debug() {
  console.log('=== Appwrite Debug ===');
  console.log('Endpoint:', process.env.APPWRITE_ENDPOINT);
  console.log('Project:', process.env.APPWRITE_PROJECT_ID);
  console.log('Database:', DATABASE_ID);
  console.log('Collection:', COLLECTION_ID);
  console.log('');

  // 1. List ALL documents in users collection
  console.log('--- Listing ALL documents in users collection ---');
  try {
    const allDocs = await databases.listDocuments(DATABASE_ID, COLLECTION_ID);
    console.log(`Total documents: ${allDocs.total}`);
    for (const doc of allDocs.documents) {
      console.log(`  Document ID: ${doc.$id}, userId: ${(doc as any).userId}`);
      console.log(`    Permissions: ${JSON.stringify(doc.$permissions)}`);
      console.log(`    Balance: ${(doc as any).balance}`);
    }
  } catch (error: any) {
    console.error('Error listing documents:', error.message);
    console.error('Code:', error.code);
  }

  console.log('');

  // 2. Try to get document with ID 'testuser'
  console.log('--- Getting document with ID "testuser" ---');
  try {
    const doc = await databases.getDocument(DATABASE_ID, COLLECTION_ID, 'testuser');
    console.log('Found document:', {
      $id: doc.$id,
      userId: (doc as any).userId,
      balance: (doc as any).balance,
      permissions: doc.$permissions,
    });
  } catch (error: any) {
    console.error('Error getting document:', error.message);
    console.error('Code:', error.code);
    console.error('Type:', error.type);
  }

  console.log('');

  // 3. Try to query by userId attribute
  console.log('--- Querying by userId = "testuser" ---');
  try {
    const { Query } = await import('node-appwrite');
    const queried = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
      Query.equal('userId', ['testuser']),
    ]);
    console.log(`Found ${queried.total} documents`);
    for (const doc of queried.documents) {
      console.log(`  Document ID: ${doc.$id}, userId: ${(doc as any).userId}`);
    }
  } catch (error: any) {
    console.error('Error querying:', error.message);
    console.error('Code:', error.code);
  }

  console.log('');

  // 4. Try to update document permissions (add read for any)
  console.log('--- Attempting to fix permissions on "testuser" document ---');
  try {
    const updated = await databases.updateDocument(
      DATABASE_ID,
      COLLECTION_ID,
      'testuser',
      {},
      [
        Permission.read(Role.user('testuser')),
        Permission.update(Role.user('testuser')),
        Permission.read(Role.any()),
      ]
    );
    console.log('Successfully updated document permissions!');
    console.log('Document:', {
      $id: updated.$id,
      userId: (updated as any).userId,
      balance: (updated as any).balance,
      permissions: updated.$permissions,
    });
  } catch (error: any) {
    console.error('Error updating permissions:', error.message);
    console.error('Code:', error.code);
  }

  console.log('');
  console.log('=== Debug complete ===');
}

debug().catch(console.error);
