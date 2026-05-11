import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { CONTACT_EMAIL } from './socialLinks.js'

const srcRoot = resolve(process.cwd(), 'src')

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      walk(full, out)
      continue
    }
    out.push(full)
  }
  return out
}

describe('socialLinks CONTACT_EMAIL', () => {
  it('exports CONTACT_EMAIL exactly equal to contact@bangdream.org', () => {
    expect(CONTACT_EMAIL).toBe('contact@bangdream.org')
  })

  it('is the only non-test src/ module hardcoding the email literal', () => {
    const offenders = []
    for (const file of walk(srcRoot)) {
      const ext = file.slice(file.lastIndexOf('.'))
      if (!['.js', '.jsx', '.ts', '.tsx', '.json'].includes(ext)) continue
      const base = file.replace(/\\/g, '/').split('/').pop()
      // Tests legitimately reference the literal in assertions; the source-of-truth check is on PRODUCTION modules.
      if (/\.(test|spec)\.[jt]sx?$/.test(base)) continue
      if (file === resolve(srcRoot, 'data', 'socialLinks.js')) continue
      const body = readFileSync(file, 'utf8')
      if (body.includes('contact@bangdream.org')) offenders.push(file)
    }
    expect(offenders).toEqual([])
  })
})
