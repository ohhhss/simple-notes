import { describe, it, expect } from 'vitest'
import { escapeHtml } from '../utils/escapeHtml'

describe('escapeHtml', () => {
  it('should escape script tags', () => {
    expect(escapeHtml('<script>alert(1)</script>')).not.toContain('<script>')
  })

  it('should escape special characters', () => {
    const result = escapeHtml('<>&"')
    expect(result).toContain('&lt;')
    expect(result).toContain('&gt;')
    expect(result).toContain('&amp;')
  })
})
