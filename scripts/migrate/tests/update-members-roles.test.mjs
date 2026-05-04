import { describe, it, expect } from 'vitest'
import {
  sqlString,
  buildUpdateSql,
  classifyMembersJson,
  buildBatchSql,
} from '../update-members-roles.mjs'

describe('sqlString', () => {
  it('wraps in single quotes', () => {
    expect(sqlString('foo')).toBe("'foo'")
  })

  it('doubles internal single quotes', () => {
    expect(sqlString("O'Brien")).toBe("'O''Brien'")
  })

  it('handles empty string', () => {
    expect(sqlString('')).toBe("''")
  })

  it('preserves Chinese + Arabic chars', () => {
    expect(sqlString('阿三')).toBe("'阿三'")
    expect(sqlString('ــ')).toBe("'ــ'")
  })
})

describe('buildUpdateSql', () => {
  it('builds UPDATE for valid pair', () => {
    const sql = buildUpdateSql('sherry', 'organizer')
    expect(sql).toContain("SET role = 'organizer'")
    expect(sql).toContain("WHERE external_id = 'sherry'")
    expect(sql.endsWith(';')).toBe(true)
  })

  it('returns null for invalid role', () => {
    expect(buildUpdateSql('sherry', 'supreme-leader')).toBeNull()
    expect(buildUpdateSql('sherry', '')).toBeNull()
    expect(buildUpdateSql('sherry', null)).toBeNull()
    expect(buildUpdateSql('sherry', undefined)).toBeNull()
  })

  it('returns null for missing external_id', () => {
    expect(buildUpdateSql('', 'organizer')).toBeNull()
    expect(buildUpdateSql(null, 'organizer')).toBeNull()
    expect(buildUpdateSql(undefined, 'organizer')).toBeNull()
  })

  it('escapes single quotes in external_id', () => {
    const sql = buildUpdateSql("o'brien", 'member')
    expect(sql).toContain("WHERE external_id = 'o''brien'")
  })

  it('all four valid roles produce SQL', () => {
    for (const role of ['organizer', 'member', 'alumnus', 'cover-band-lead']) {
      expect(buildUpdateSql('x', role)).toContain(`SET role = '${role}'`)
    }
  })
})

describe('classifyMembersJson', () => {
  it('separates valid + skipped buckets', () => {
    const items = [
      { id: 'a', role: 'organizer' },
      { id: 'b', role: 'member' },
      { id: 'c', role: 'supreme-leader' }, // skipped
      { id: '', role: 'organizer' },        // skipped — no external_id
      { id: 'd' },                          // skipped — no role
      { id: 'e', role: 'cover-band-lead' },
    ]
    const result = classifyMembersJson(items)
    expect(result.valid).toEqual([
      { external_id: 'a', role: 'organizer' },
      { external_id: 'b', role: 'member' },
      { external_id: 'e', role: 'cover-band-lead' },
    ])
    expect(result.skippedNoExternalId).toBe(1)
    expect(result.skippedBadRole).toBe(2)
  })

  it('handles empty array', () => {
    const result = classifyMembersJson([])
    expect(result.valid).toEqual([])
    expect(result.skippedNoExternalId).toBe(0)
    expect(result.skippedBadRole).toBe(0)
  })

  it('trims whitespace from id', () => {
    const result = classifyMembersJson([{ id: '  trim  ', role: 'member' }])
    expect(result.valid).toEqual([{ external_id: 'trim', role: 'member' }])
  })

  it('non-string id treated as missing', () => {
    const result = classifyMembersJson([{ id: 42, role: 'member' }])
    expect(result.skippedNoExternalId).toBe(1)
  })
})

describe('buildBatchSql', () => {
  it('joins statements with newline', () => {
    const sql = buildBatchSql([
      { external_id: 'a', role: 'organizer' },
      { external_id: 'b', role: 'alumnus' },
    ])
    const lines = sql.split('\n')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toContain("'a'")
    expect(lines[1]).toContain("'alumnus'")
  })

  it('omits invalid rows silently', () => {
    const sql = buildBatchSql([
      { external_id: 'a', role: 'organizer' },
      { external_id: '', role: 'organizer' },
    ])
    expect(sql.split('\n')).toHaveLength(1)
  })

  it('returns empty string when all invalid', () => {
    expect(buildBatchSql([])).toBe('')
    expect(buildBatchSql([{ external_id: '', role: 'x' }])).toBe('')
  })
})
