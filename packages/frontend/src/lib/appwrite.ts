import { Client, Account, Databases, Storage, OAuthProvider } from 'appwrite';

// Check if we're in test environment
const isTestEnv = import.meta.env.MODE === 'test';

// Validate required environment variables (skip in test mode)
const requiredEnvVars = {
  VITE_APPWRITE_ENDPOINT: import.meta.env.VITE_APPWRITE_ENDPOINT || (isTestEnv ? 'http://localhost:80/v1' : ''),
  VITE_APPWRITE_PROJECT_ID: import.meta.env.VITE_APPWRITE_PROJECT_ID || (isTestEnv ? 'test-project' : ''),
};

// Check for missing environment variables (only in non-test environments)
if (!isTestEnv) {
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

// Export OAuthProvider for use in auth hook
export { OAuthProvider };

// Export client as default for convenience
export default appwriteClient;

