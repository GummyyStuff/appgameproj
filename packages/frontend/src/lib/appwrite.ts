import { Client, Account, Databases, Storage } from 'appwrite';

// Validate required environment variables
const requiredEnvVars = {
  VITE_APPWRITE_ENDPOINT: import.meta.env.VITE_APPWRITE_ENDPOINT,
  VITE_APPWRITE_PROJECT_ID: import.meta.env.VITE_APPWRITE_PROJECT_ID,
};

// Check for missing environment variables
const missingVars = Object.entries(requiredEnvVars)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error('Appwrite configuration error:', {
    ...Object.fromEntries(
      Object.entries(requiredEnvVars).map(([key, value]) => [
        key,
        value ? 'SET' : 'MISSING',
      ])
    ),
    env: import.meta.env.MODE,
  });

  throw new Error(
    `Missing required environment variables: ${missingVars.join(', ')}`
  );
}

// Validate HTTPS in production
if (
  import.meta.env.PROD &&
  !requiredEnvVars.VITE_APPWRITE_ENDPOINT.startsWith('https://')
) {
  throw new Error('VITE_APPWRITE_ENDPOINT must use HTTPS in production');
}

// Initialize Appwrite client
export const appwriteClient = new Client()
  .setEndpoint(requiredEnvVars.VITE_APPWRITE_ENDPOINT)
  .setProject(requiredEnvVars.VITE_APPWRITE_PROJECT_ID);

// Initialize Appwrite services
export const account = new Account(appwriteClient);
export const databases = new Databases(appwriteClient);
export const storage = new Storage(appwriteClient);

// Export client as default for convenience
export default appwriteClient;

