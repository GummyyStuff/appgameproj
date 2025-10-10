/**
 * API Helper for authenticated requests
 * Automatically adds Appwrite user ID header to all authenticated API calls
 */

import { account } from './appwrite';

const API_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Make an authenticated API request
 * Automatically includes X-Appwrite-User-Id header from current session
 */
export async function authenticatedFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  try {
    // Get current Appwrite user session
    const user = await account.get();
    
    // Merge headers with X-Appwrite-User-Id
    const headers = {
      ...options.headers,
      'X-Appwrite-User-Id': user.$id,
    };

    // Make the request with updated headers
    return fetch(`${API_URL}${endpoint}`, {
      ...options,
      credentials: 'include',
      headers,
    });
  } catch (error) {
    // If no session, make request without user ID header
    // This will fail at the backend with 401
    return fetch(`${API_URL}${endpoint}`, {
      ...options,
      credentials: 'include',
    });
  }
}

/**
 * Convenience method for GET requests
 */
export async function apiGet(endpoint: string): Promise<Response> {
  return authenticatedFetch(endpoint, { method: 'GET' });
}

/**
 * Convenience method for POST requests
 */
export async function apiPost(endpoint: string, body?: any): Promise<Response> {
  return authenticatedFetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Convenience method for PUT requests
 */
export async function apiPut(endpoint: string, body?: any): Promise<Response> {
  return authenticatedFetch(endpoint, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Convenience method for DELETE requests
 */
export async function apiDelete(endpoint: string): Promise<Response> {
  return authenticatedFetch(endpoint, { method: 'DELETE' });
}

