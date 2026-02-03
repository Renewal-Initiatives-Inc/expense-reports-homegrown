import { describe, expect, it } from 'vitest'
import { createReportSchema, updateReportSchema } from '../reports'

describe('createReportSchema', () => {
  it('allows empty object', () => {
    const result = createReportSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('allows undefined name', () => {
    const result = createReportSchema.safeParse({ name: undefined })
    expect(result.success).toBe(true)
  })

  it('allows valid name', () => {
    const result = createReportSchema.safeParse({ name: 'Cincinnati Trip' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Cincinnati Trip')
    }
  })

  it('rejects name longer than 100 characters', () => {
    const longName = 'a'.repeat(101)
    const result = createReportSchema.safeParse({ name: longName })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('100')
    }
  })

  it('allows name exactly 100 characters', () => {
    const exactName = 'a'.repeat(100)
    const result = createReportSchema.safeParse({ name: exactName })
    expect(result.success).toBe(true)
  })
})

describe('updateReportSchema', () => {
  it('allows empty object', () => {
    const result = updateReportSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('allows undefined name', () => {
    const result = updateReportSchema.safeParse({ name: undefined })
    expect(result.success).toBe(true)
  })

  it('allows valid name', () => {
    const result = updateReportSchema.safeParse({ name: 'Updated Report' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Updated Report')
    }
  })

  it('rejects name longer than 100 characters', () => {
    const longName = 'b'.repeat(101)
    const result = updateReportSchema.safeParse({ name: longName })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('100')
    }
  })
})
