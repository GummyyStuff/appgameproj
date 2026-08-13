import { createHash } from 'crypto'
import { appwriteDb } from './appwrite-database'
import { COLLECTION_IDS, WheelEnvironmentRecord } from '../config/collections'
import type { EnvironmentState } from '../types/database'
import {
  generateNewEnvironment,
  isValidEnvironmentState
} from './game-engine/wheel-environment'
import { provablyFairService } from './game-engine/provably-fair-service'
import { logger } from '../lib/sentry'

const getDocumentId = (userId: string): string => {
  const hash = createHash('sha256').update(userId).digest('hex')
  return `env_${hash.slice(0, 32)}`
}

const parseRecord = (record: WheelEnvironmentRecord): EnvironmentState | null => {
  try {
    const state: EnvironmentState = {
      type: record.environmentType as EnvironmentState['type'],
      spins_remaining: record.spinsRemaining,
      modifiers: JSON.parse(record.modifiers)
    }
    return isValidEnvironmentState(state) ? state : null
  } catch {
    return null
  }
}

const findByUserId = async (userId: string) => {
  const { data, error } = await appwriteDb.listDocuments<WheelEnvironmentRecord>(
    COLLECTION_IDS.WHEEL_ENVIRONMENTS,
    [appwriteDb.equal('userId', userId)],
    1
  )
  if (error) {
    throw new Error(error)
  }
  return data[0] || null
}

export class WheelEnvironmentStateService {
  async getWheelEnvironment(userId: string): Promise<EnvironmentState> {
    try {
      const record = await findByUserId(userId)
      if (record) {
        const parsed = parseRecord(record)
        if (parsed && parsed.spins_remaining > 0) return parsed
      }

      const generated = await generateNewEnvironment(provablyFairService)
      await this.saveWheelEnvironment(userId, generated.state)
      return generated.state
    } catch (error) {
      logger.error('Failed to load wheel environment, using ephemeral state', {
        user_id: userId,
        error: error instanceof Error ? error.message : 'unknown'
      })
      const generated = await generateNewEnvironment(provablyFairService)
      return generated.state
    }
  }

  async saveWheelEnvironment(userId: string, state: EnvironmentState): Promise<void> {
    const documentId = getDocumentId(userId)
    const payload: Omit<WheelEnvironmentRecord, '$id' | '$createdAt' | '$updatedAt'> = {
      userId,
      environmentType: state.type,
      spinsRemaining: state.spins_remaining,
      modifiers: JSON.stringify(state.modifiers)
    }

    try {
      const existing = await findByUserId(userId)

      if (existing?.$id) {
        const { error } = await appwriteDb.updateDocument<WheelEnvironmentRecord>(
          COLLECTION_IDS.WHEEL_ENVIRONMENTS,
          existing.$id,
          payload
        )
        if (error) {
          logger.error('Failed to update wheel environment record', {
            user_id: userId,
            error
          })
        }
        return
      }

      const created = await appwriteDb.createDocument<WheelEnvironmentRecord>(
        COLLECTION_IDS.WHEEL_ENVIRONMENTS,
        payload,
        documentId
      )
      if (created.error) {
        logger.error('Failed to create wheel environment record', {
          user_id: userId,
          error: created.error
        })
      }
    } catch (error) {
      logger.error('Failed to save wheel environment', {
        user_id: userId,
        error: error instanceof Error ? error.message : 'unknown'
      })
    }
  }
}

export const wheelEnvironmentStateService = new WheelEnvironmentStateService()
