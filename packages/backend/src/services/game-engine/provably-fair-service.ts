import { randomBytes, createHash, createHmac } from 'crypto'

export interface ProvablyFairContext {
  serverSeed: string
  clientSeed: string
  nonce: number
}

export interface ProvablyFairVerification {
  serverSeedHash: string
  clientSeed: string
  nonce: number
}

export interface ProvablyFairOutcome {
  context: ProvablyFairContext
  hash: string
  randomValue: number
  isValid: boolean
}

export class ProvablyFairService {
  async generateServerSeed(): Promise<string> {
    return new Promise((resolve, reject) => {
      randomBytes(32, (err, buf) => {
        if (err) reject(err)
        else resolve(buf.toString('hex'))
      })
    })
  }

  async generateClientSeed(): Promise<string> {
    return new Promise((resolve, reject) => {
      randomBytes(16, (err, buf) => {
        if (err) reject(err)
        else resolve(buf.toString('hex'))
      })
    })
  }

  hashServerSeed(serverSeed: string): string {
    return createHash('sha256').update(serverSeed).digest('hex')
  }

  async generateNonce(): Promise<number> {
    return new Promise((resolve, reject) => {
      randomBytes(4, (err, buf) => {
        if (err) reject(err)
        else resolve(buf.readUInt32BE(0))
      })
    })
  }

  async createContext(clientSeed?: string): Promise<ProvablyFairContext> {
    const serverSeed = await this.generateServerSeed()
    const resolvedClientSeed = clientSeed || await this.generateClientSeed()
    const nonce = await this.generateNonce()

    return { serverSeed, clientSeed: resolvedClientSeed, nonce }
  }

  async generateOutcome(context: ProvablyFairContext): Promise<ProvablyFairOutcome> {
    try {
      const message = `${context.clientSeed}:${context.nonce}`
      const hash = createHmac('sha256', context.serverSeed)
        .update(message)
        .digest('hex')

      const hexSubstring = hash.substring(0, 8)
      const decimal = parseInt(hexSubstring, 16)
      const randomValue = decimal / 0x100000000

      return { context, hash, randomValue, isValid: true }
    } catch {
      return { context, hash: '', randomValue: 0, isValid: false }
    }
  }

  async generateMultipleOutcomes(
    context: ProvablyFairContext,
    count: number
  ): Promise<ProvablyFairOutcome[]> {
    const results: ProvablyFairOutcome[] = []
    for (let i = 0; i < count; i++) {
      const ctx = { ...context, nonce: context.nonce + i }
      results.push(await this.generateOutcome(ctx))
    }
    return results
  }

  async verify(outcome: ProvablyFairOutcome): Promise<boolean> {
    try {
      const regenerated = await this.generateOutcome(outcome.context)
      return (
        regenerated.hash === outcome.hash &&
        Math.abs(regenerated.randomValue - outcome.randomValue) < 0.0000001
      )
    } catch {
      return false
    }
  }

  getVerificationData(outcome: ProvablyFairOutcome): ProvablyFairVerification {
    return {
      serverSeedHash: this.hashServerSeed(outcome.context.serverSeed),
      clientSeed: outcome.context.clientSeed,
      nonce: outcome.context.nonce
    }
  }

  randomIntFromOutcome(outcome: ProvablyFairOutcome, min: number, max: number): number {
    const range = max - min + 1
    return Math.floor(outcome.randomValue * range) + min
  }

  randomFloatFromOutcome(outcome: ProvablyFairOutcome): number {
    return outcome.randomValue
  }

  selectWeightedItem<T>(
    outcome: ProvablyFairOutcome,
    items: T[],
    weights: number[]
  ): T {
    const totalWeight = weights.reduce((sum, w) => sum + w, 0)
    const roll = outcome.randomValue * totalWeight
    let cumulative = 0
    for (let i = 0; i < items.length; i++) {
      cumulative += weights[i]
      if (roll < cumulative) return items[i]
    }
    return items[items.length - 1]
  }
}

export const provablyFairService = new ProvablyFairService()
