/**
 * Bun native API utilities for better performance
 * Use these instead of Node.js equivalents when possible
 */

/**
 * Read file using Bun's native API (faster than fs.readFile)
 */
export async function readFile(path: string): Promise<string> {
  const file = Bun.file(path)
  return await file.text()
}

/**
 * Read file as JSON
 */
export async function readJSON<T = any>(path: string): Promise<T> {
  const file = Bun.file(path)
  return await file.json()
}

/**
 * Read file as ArrayBuffer
 */
export async function readBuffer(path: string): Promise<ArrayBuffer> {
  const file = Bun.file(path)
  return await file.arrayBuffer()
}

/**
 * Write file using Bun's native API
 */
export async function writeFile(path: string, data: string | Blob | ArrayBuffer): Promise<number> {
  return await Bun.write(path, data)
}

/**
 * Check if file exists
 */
export async function fileExists(path: string): Promise<boolean> {
  const file = Bun.file(path)
  return await file.exists()
}

/**
 * Get file size
 */
export async function fileSize(path: string): Promise<number> {
  const file = Bun.file(path)
  return file.size
}

/**
 * Hash string using Bun's native crypto (faster than Node.js crypto)
 */
export async function hashString(data: string, algorithm: 'sha256' | 'sha512' | 'md5' = 'sha256'): Promise<string> {
  const hasher = new Bun.CryptoHasher(algorithm)
  hasher.update(data)
  return hasher.digest('hex')
}

/**
 * Hash file using Bun's native crypto
 */
export async function hashFile(path: string, algorithm: 'sha256' | 'sha512' | 'md5' = 'sha256'): Promise<string> {
  const file = Bun.file(path)
  const hasher = new Bun.CryptoHasher(algorithm)
  hasher.update(await file.arrayBuffer())
  return hasher.digest('hex')
}

/**
 * Password hashing using Bun's native API (faster than bcrypt)
 */
export async function hashPassword(password: string): Promise<string> {
  return await Bun.password.hash(password, {
    algorithm: 'argon2id', // Most secure
    memoryCost: 65536,     // 64 MiB
    timeCost: 3,           // 3 iterations
  })
}

/**
 * Verify password using Bun's native API
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await Bun.password.verify(password, hash)
}

/**
 * Generate random bytes
 */
export function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length))
}

/**
 * Generate random string (URL-safe)
 */
export function randomString(length: number): string {
  const bytes = randomBytes(length)
  return Buffer.from(bytes).toString('base64url').slice(0, length)
}

/**
 * Measure execution time of a function
 */
export async function measureTime<T>(
  name: string,
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = performance.now()
  const result = await fn()
  const duration = performance.now() - start
  
  console.log(`⏱️  ${name}: ${duration.toFixed(2)}ms`)
  
  return { result, duration }
}

/**
 * Sleep/delay utility using Bun.sleep
 */
export const sleep = (ms: number) => Bun.sleep(ms)

/**
 * Get server memory usage
 */
export function getMemoryUsage() {
  const usage = process.memoryUsage()
  return {
    rss: Math.round(usage.rss / 1024 / 1024), // MB
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
    external: Math.round(usage.external / 1024 / 1024), // MB
  }
}

/**
 * Environment variable helper with validation
 */
export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key]
  if (!value && !defaultValue) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value || defaultValue!
}

/**
 * Get environment variable as number
 */
export function getEnvNumber(key: string, defaultValue?: number): number {
  const value = process.env[key]
  if (!value) {
    if (defaultValue === undefined) {
      throw new Error(`Missing required environment variable: ${key}`)
    }
    return defaultValue
  }
  const num = parseInt(value, 10)
  if (isNaN(num)) {
    throw new Error(`Environment variable ${key} must be a number, got: ${value}`)
  }
  return num
}

/**
 * Get environment variable as boolean
 */
export function getEnvBoolean(key: string, defaultValue?: boolean): boolean {
  const value = process.env[key]
  if (!value) {
    if (defaultValue === undefined) {
      throw new Error(`Missing required environment variable: ${key}`)
    }
    return defaultValue
  }
  return value.toLowerCase() === 'true' || value === '1'
}

