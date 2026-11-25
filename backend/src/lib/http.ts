export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export const str = (v: unknown, max = 500): string => (typeof v === 'string' ? v.trim().slice(0, max) : '')
export const num = (v: unknown): number => (Number.isFinite(Number(v)) ? Number(v) : 0)
