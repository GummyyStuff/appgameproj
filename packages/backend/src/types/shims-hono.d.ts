// Minimal shims to satisfy TypeScript in environments where Hono types aren't resolved by the linter

declare module 'hono' {
  export type Next = (...args: any[]) => Promise<any> | any
  export interface Context {
    req: {
      path: string
      method: string
      header(name: string): string | undefined
    }
    header(name: string, value: string): void
    json(body: any, status?: number): any
    get<T = any>(key: string): T
    set(key: string, value: any): void
  }
}

declare module 'hono/http-exception' {
  export class HTTPException extends Error {
    status: number
    cause?: any
    constructor(status: number, options?: { message?: string; cause?: any })
  }
}

