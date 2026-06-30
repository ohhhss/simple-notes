import { describe, it, expect } from 'vitest'
import { formatTime, uid } from '../utils/formatTime'

describe('formatTime', () => {
  it('returns a non-empty formatted string', () => {
    const s = formatTime(Date.now())
    expect(typeof s).toBe('string')
    expect(s.length).toBeGreaterThan(0)
    expect(s).toMatch(/^\d{2}\/\d{2} \d{2}:\d{2}$/)
  })
})

describe('uid', () => {
  it('generates unique identifiers', () => {
    expect(uid()).not.toBe(uid())
  })
})
