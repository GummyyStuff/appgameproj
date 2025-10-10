/**
 * Direct HTTP client for Appwrite
 * Workaround for node-appwrite SDK connection issues
 */

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT!;
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID!;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY!;

const DEFAULT_TIMEOUT = 5000; // 5 seconds

interface FetchOptions {
  method?: string;
  body?: any;
  timeout?: number;
}

/**
 * Make a direct HTTP request to Appwrite
 */
async function appwriteFetch(path: string, options: FetchOptions = {}) {
  const { method = 'GET', body, timeout = DEFAULT_TIMEOUT } = options;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const url = `${APPWRITE_ENDPOINT}${path}`;
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': APPWRITE_PROJECT_ID,
        'X-Appwrite-Key': APPWRITE_API_KEY,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    
    throw error;
  }
}

/**
 * Get user by ID
 */
export async function getUser(userId: string) {
  return await appwriteFetch(`/users/${userId}`);
}

/**
 * List documents from a collection
 * Queries should be JSON objects like: {method: 'equal', attribute: 'userId', values: ['123']}
 */
export async function listDocuments(databaseId: string, collectionId: string, queries: any[] = []) {
  const queryParams = queries.length > 0 
    ? '?' + queries.map(q => `queries[]=${encodeURIComponent(JSON.stringify(q))}`).join('&')
    : '';
    
  return await appwriteFetch(`/databases/${databaseId}/collections/${collectionId}/documents${queryParams}`);
}

/**
 * Get a single document
 */
export async function getDocument(databaseId: string, collectionId: string, documentId: string) {
  return await appwriteFetch(`/databases/${databaseId}/collections/${collectionId}/documents/${documentId}`);
}

/**
 * Create a document
 */
export async function createDocument(
  databaseId: string, 
  collectionId: string, 
  documentId: string, 
  data: any,
  permissions: string[] = []
) {
  return await appwriteFetch(`/databases/${databaseId}/collections/${collectionId}/documents`, {
    method: 'POST',
    body: {
      documentId,
      data,
      permissions,
    },
  });
}

/**
 * Update a document
 */
export async function updateDocument(
  databaseId: string,
  collectionId: string,
  documentId: string,
  data: any,
  permissions?: string[]
) {
  return await appwriteFetch(`/databases/${databaseId}/collections/${collectionId}/documents/${documentId}`, {
    method: 'PATCH',
    body: {
      data,
      ...(permissions && { permissions }),
    },
  });
}

/**
 * Get session details
 * Note: This requires knowing the user ID, which we can't get from session ID alone
 * So we'll need to store user ID with the session cookie
 */
export async function getSession(userId: string, sessionId: string) {
  try {
    return await appwriteFetch(`/users/${userId}/sessions/${sessionId}`);
  } catch (error) {
    console.error('Get session error:', error);
    return null;
  }
}

/**
 * List all sessions for a user
 */
export async function listUserSessions(userId: string) {
  try {
    return await appwriteFetch(`/users/${userId}/sessions`);
  } catch (error) {
    console.error('List sessions error:', error);
    return null;
  }
}

