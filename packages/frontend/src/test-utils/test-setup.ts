import { beforeAll, afterEach, afterAll, vi, expect } from 'vitest'
import * as matchers from '@testing-library/jest-dom/matchers'
import { server } from './mocks/handlers'

expect.extend(matchers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
