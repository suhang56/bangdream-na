import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  ghGet,
  ghPut,
  ghSha,
  ensureBranch,
  uploadAsset,
  openOrAppendPR,
  commitContentChange,
  sanitizeError,
  encodeBase64Utf8,
  decodeBase64Utf8,
} from './githubApi.js'

const TOKEN = 'ghp_TESTSECRETtokenABCDEFGH1234567890'

function jsonRes(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

function contentsRes(rawText, sha = 'sha-1') {
  const content = encodeBase64Utf8(rawText)
  return jsonRes(200, { content, sha, download_url: 'https://example.com/x' })
}

function setFetchSequence(...responses) {
  const calls = []
  const fn = vi.fn(async (url, init) => {
    calls.push({ url, init })
    if (responses.length === 0) {
      throw new Error(`Unexpected extra fetch: ${url}`)
    }
    const r = responses.shift()
    if (typeof r === 'function') return r(url, init)
    return r
  })
  globalThis.fetch = fn
  return calls
}

describe('encode/decode base64 UTF-8', () => {
  it('round-trips multibyte CJK + emoji', () => {
    const s = 'Roselia LA Live - 中文 + 日本語 + 한국어 + 🎸'
    const b64 = encodeBase64Utf8(s)
    expect(decodeBase64Utf8(b64)).toBe(s)
  })

  it('round-trips empty string', () => {
    expect(decodeBase64Utf8(encodeBase64Utf8(''))).toBe('')
  })

  it('decodeBase64Utf8 tolerates newlines from GitHub responses', () => {
    const s = 'hello world'
    const raw = encodeBase64Utf8(s)
    const withNewlines = raw.replace(/(.{4})/g, '$1\n')
    expect(decodeBase64Utf8(withNewlines)).toBe(s)
  })
})

describe('sanitizeError', () => {
  it('strips literal token from message (Edge 19)', () => {
    const err = new Error(`fetch failed with token ${TOKEN}`)
    const safe = sanitizeError(err)
    expect(safe.message).not.toContain(TOKEN)
    expect(safe.message).toContain('[redacted]')
  })

  it('handles plain string', () => {
    const safe = sanitizeError(`bad token ${TOKEN}`, 'fallback')
    expect(safe.message).not.toContain(TOKEN)
  })

  it('handles object with message', () => {
    const safe = sanitizeError({ message: `auth: ${TOKEN}` })
    expect(safe.message).not.toContain(TOKEN)
  })

  it('falls back when err is null', () => {
    expect(sanitizeError(null, 'oops').message).toBe('oops')
  })

  it('falls back when err message is empty', () => {
    expect(sanitizeError(new Error(''), 'fallback').message).toBe('fallback')
  })

  it('redacts github_pat_ tokens too', () => {
    const tok = 'github_pat_AAAAAAAAAAAAAAAAAAAAAA'
    const safe = sanitizeError(new Error(`auth: ${tok}`))
    expect(safe.message).not.toContain(tok)
  })
})

describe('ghGet', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    delete globalThis.fetch
  })

  it('happy: returns parsed content + sha + raw', async () => {
    const obj = { hello: 'world' }
    setFetchSequence(contentsRes(JSON.stringify(obj), 'sha-abc'))
    const result = await ghGet(TOKEN, 'src/data/events.json', 'main')
    expect(result.content).toEqual(obj)
    expect(result.sha).toBe('sha-abc')
    expect(result.raw).toBe(JSON.stringify(obj))
  })

  it('Edge 1: 401 throws sanitized error without token leak', async () => {
    setFetchSequence(jsonRes(401, { message: `Bad credentials for token ${TOKEN}` }))
    await expect(ghGet(TOKEN, 'src/data/events.json', 'main')).rejects.toThrow(/unauthorized|token/i)
    try {
      await ghGet(TOKEN, 'src/data/events.json', 'main')
    } catch (e) {
      expect(e.message).not.toContain(TOKEN)
    }
  })

  it('Edge 2: 404 throws "not found" with path', async () => {
    setFetchSequence(jsonRes(404, { message: 'Not Found' }))
    await expect(ghGet(TOKEN, 'src/data/missing.json', 'main')).rejects.toThrow(/not found.*missing/i)
  })

  it('Edge 4: 502 throws server error', async () => {
    setFetchSequence(jsonRes(502, { message: 'Bad Gateway' }))
    await expect(ghGet(TOKEN, 'src/data/events.json', 'main')).rejects.toThrow(/server error/i)
  })

  it('Edge 5: malformed JSON throws Invalid JSON', async () => {
    setFetchSequence(contentsRes('not-json {', 'sha-x'))
    await expect(ghGet(TOKEN, 'src/data/events.json', 'main')).rejects.toThrow(/Invalid JSON/)
  })

  it('Edge 7: multibyte content round-trips byte-identical', async () => {
    const obj = { title: 'Roselia LA Live - 中文 + 日本語 + 🎸' }
    setFetchSequence(contentsRes(JSON.stringify(obj)))
    const result = await ghGet(TOKEN, 'src/data/events.json', 'main')
    expect(result.content).toEqual(obj)
  })

  it('Edge 20: Authorization header is always present', async () => {
    const calls = setFetchSequence(contentsRes('[]'))
    await ghGet(TOKEN, 'src/data/events.json', 'main')
    expect(calls[0].init.headers.Authorization).toBe(`token ${TOKEN}`)
  })

  it('throws sanitized message on network failure', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error(`network down with ${TOKEN}`)
    })
    try {
      await ghGet(TOKEN, 'src/data/events.json', 'main')
    } catch (e) {
      expect(e.message).not.toContain(TOKEN)
    }
  })
})

describe('ghSha', () => {
  afterEach(() => { delete globalThis.fetch })

  it('Edge 10: 404 returns null (not throw)', async () => {
    setFetchSequence(jsonRes(404, { message: 'Not Found' }))
    const sha = await ghSha(TOKEN, 'src/data/events.json', 'main')
    expect(sha).toBeNull()
  })

  it('happy: returns sha string', async () => {
    setFetchSequence(jsonRes(200, { sha: 'abc123' }))
    const sha = await ghSha(TOKEN, 'src/data/events.json', 'main')
    expect(sha).toBe('abc123')
  })

  it('throws on 401', async () => {
    setFetchSequence(jsonRes(401, { message: 'Bad credentials' }))
    await expect(ghSha(TOKEN, 'src/data/events.json', 'main')).rejects.toThrow(/unauthorized|token/i)
  })

  it('throws sanitized network error', async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error(`net ${TOKEN}`) })
    try { await ghSha(TOKEN, 'p', 'main') } catch (e) { expect(e.message).not.toContain(TOKEN) }
  })

  it('throws on 500', async () => {
    setFetchSequence(jsonRes(500, { message: 'oops' }))
    await expect(ghSha(TOKEN, 'p', 'main')).rejects.toThrow(/server error/i)
  })
})

describe('ensureBranch', () => {
  afterEach(() => { delete globalThis.fetch })

  it('Edge 12: idempotent — returns created:false when branch exists', async () => {
    setFetchSequence(jsonRes(200, { object: { sha: 'head-sha' } }))
    const r = await ensureBranch(TOKEN, 'content-updates')
    expect(r).toEqual({ branch: 'content-updates', headSha: 'head-sha', created: false })
  })

  it('Edge 11: creates branch from base on 404', async () => {
    setFetchSequence(
      jsonRes(404, { message: 'Branch not found' }),
      jsonRes(200, { object: { sha: 'main-sha' } }),
      jsonRes(201, { object: { sha: 'new-sha' } }),
    )
    const r = await ensureBranch(TOKEN, 'content-updates', 'main')
    expect(r).toEqual({ branch: 'content-updates', headSha: 'new-sha', created: true })
  })

  it('throws sanitized error if base branch missing', async () => {
    setFetchSequence(
      jsonRes(404, { message: 'Branch not found' }),
      jsonRes(404, { message: 'Base missing' }),
    )
    await expect(ensureBranch(TOKEN, 'content-updates', 'main')).rejects.toThrow(/not found.*main/i)
  })

  it('throws on 401', async () => {
    setFetchSequence(jsonRes(401, { message: 'Bad credentials' }))
    await expect(ensureBranch(TOKEN, 'content-updates')).rejects.toThrow(/unauthorized|token/i)
  })

  it('throws on create failure', async () => {
    setFetchSequence(
      jsonRes(404, { message: 'Branch not found' }),
      jsonRes(200, { object: { sha: 'main-sha' } }),
      jsonRes(422, { message: 'Reference already exists' }),
    )
    await expect(ensureBranch(TOKEN, 'content-updates')).rejects.toThrow(/invalid request/i)
  })

  it('throws sanitized network error', async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error(`net ${TOKEN}`) })
    try { await ensureBranch(TOKEN, 'content-updates') } catch (e) { expect(e.message).not.toContain(TOKEN) }
  })
})

describe('ghPut', () => {
  afterEach(() => { delete globalThis.fetch })

  it('Edge 8: 409 throws "Concurrent edit detected"', async () => {
    setFetchSequence(
      jsonRes(200, { object: { sha: 'head' } }), // ensureBranch
      jsonRes(409, { message: 'sha does not match' }),
    )
    await expect(ghPut(TOKEN, 'src/data/events.json', [], 'old-sha', 'msg', 'content-updates'))
      .rejects.toThrow(/concurrent edit/i)
  })

  it('Edge 9: 422 throws "Invalid request" without leaking token', async () => {
    setFetchSequence(
      jsonRes(200, { object: { sha: 'head' } }),
      jsonRes(422, { message: `Invalid branch name token ${TOKEN}` }),
    )
    try {
      await ghPut(TOKEN, 'p', [], 'sha', 'msg', 'content-updates')
    } catch (e) {
      expect(e.message).toMatch(/invalid request/i)
      expect(e.message).not.toContain(TOKEN)
    }
  })

  it('happy path: returns parsed json + Auth header present', async () => {
    const calls = setFetchSequence(
      jsonRes(200, { object: { sha: 'head' } }),
      jsonRes(200, { content: { sha: 'new', path: 'x' }, commit: { sha: 'c1', html_url: 'u' } }),
    )
    const r = await ghPut(TOKEN, 'src/data/events.json', [{ id: 'a' }], 'sha-prev', 'msg', 'content-updates')
    expect(r.commit.sha).toBe('c1')
    // Both calls have Authorization header (Edge 20)
    expect(calls[0].init.headers.Authorization).toBe(`token ${TOKEN}`)
    expect(calls[1].init.headers.Authorization).toBe(`token ${TOKEN}`)
    // body has base64 content
    const body = JSON.parse(calls[1].init.body)
    expect(body.branch).toBe('content-updates')
    expect(body.message).toBe('msg')
    expect(decodeBase64Utf8(body.content)).toBe(JSON.stringify([{ id: 'a' }], null, 2) + '\n')
  })

  it('omits sha when null (new file)', async () => {
    const calls = setFetchSequence(
      jsonRes(200, { object: { sha: 'head' } }),
      jsonRes(201, { content: { sha: 'new', path: 'x' }, commit: { sha: 'c1' } }),
    )
    await ghPut(TOKEN, 'src/data/new.json', [], null, 'msg', 'content-updates')
    const body = JSON.parse(calls[1].init.body)
    expect('sha' in body).toBe(false)
  })

  it('throws on 401', async () => {
    setFetchSequence(
      jsonRes(200, { object: { sha: 'head' } }),
      jsonRes(401, { message: 'Bad credentials' }),
    )
    await expect(ghPut(TOKEN, 'p', [], 's', 'm', 'content-updates')).rejects.toThrow(/unauthorized/i)
  })
})

describe('uploadAsset', () => {
  afterEach(() => {
    delete globalThis.fetch
    delete globalThis.FileReader
  })

  function mockFileReader(dataUrl, fail = false) {
    globalThis.FileReader = class {
      readAsDataURL() {
        setTimeout(() => {
          if (fail) {
            this.onerror && this.onerror()
          } else {
            this.onload && this.onload({ target: { result: dataUrl } })
          }
        }, 0)
      }
    }
  }

  it('Edge 16: happy PNG path — calls ensureBranch + ghSha + PUT', async () => {
    mockFileReader('data:image/png;base64,AAAA')
    const calls = setFetchSequence(
      jsonRes(200, { object: { sha: 'head' } }),                        // ensureBranch
      jsonRes(404, { message: 'not found' }),                            // ghSha → null (new asset)
      jsonRes(201, { content: { sha: 'new-sha', download_url: 'u' } }),  // PUT
    )
    const file = { name: 'pic.png', size: 100, type: 'image/png' }
    const r = await uploadAsset(TOKEN, 'public/events/x.png', file, 'upload x', 'content-updates')
    expect(r.path).toBe('public/events/x.png')
    expect(r.sha).toBe('new-sha')
    const putBody = JSON.parse(calls[2].init.body)
    expect(putBody.content).toBe('AAAA')
    expect(putBody.branch).toBe('content-updates')
    expect('sha' in putBody).toBe(false)
  })

  it('Edge 17: 5xx → sanitized rejection without token', async () => {
    mockFileReader('data:image/png;base64,AAAA')
    setFetchSequence(
      jsonRes(200, { object: { sha: 'head' } }),
      jsonRes(404, { message: 'not found' }),
      jsonRes(500, { message: `server error with ${TOKEN}` }),
    )
    const file = { name: 'pic.png', size: 100, type: 'image/png' }
    try {
      await uploadAsset(TOKEN, 'public/events/x.png', file, 'm', 'content-updates')
      expect.fail('should reject')
    } catch (e) {
      expect(e.message).toMatch(/server error/i)
      expect(e.message).not.toContain(TOKEN)
    }
  })

  it('FileReader error rejects sanitized', async () => {
    mockFileReader('', true)
    setFetchSequence(
      jsonRes(200, { object: { sha: 'head' } }),
      jsonRes(404, { message: 'not found' }),
    )
    const file = { name: 'pic.png', size: 100, type: 'image/png' }
    await expect(uploadAsset(TOKEN, 'public/x.png', file, 'm', 'content-updates'))
      .rejects.toThrow(/failed to read file/i)
  })

  it('overwrite path includes existing sha', async () => {
    mockFileReader('data:image/png;base64,QQQ=')
    const calls = setFetchSequence(
      jsonRes(200, { object: { sha: 'head' } }),
      jsonRes(200, { sha: 'existing-sha' }),
      jsonRes(200, { content: { sha: 'new-sha' } }),
    )
    const file = { name: 'pic.png', size: 100, type: 'image/png' }
    await uploadAsset(TOKEN, 'public/events/x.png', file, 'm', 'content-updates')
    const body = JSON.parse(calls[2].init.body)
    expect(body.sha).toBe('existing-sha')
  })
})

describe('openOrAppendPR', () => {
  afterEach(() => { delete globalThis.fetch })

  it('Edge 13: finds existing PR (returns created:false)', async () => {
    setFetchSequence(jsonRes(200, [{ number: 42, html_url: 'https://github.com/x/y/pull/42' }]))
    const r = await openOrAppendPR(TOKEN, 'content-updates', 'main', 't', 'b')
    expect(r).toEqual({ number: 42, htmlUrl: 'https://github.com/x/y/pull/42', created: false })
  })

  it('Edge 14: opens new PR when none exists', async () => {
    setFetchSequence(
      jsonRes(200, []),
      jsonRes(201, { number: 43, html_url: 'https://github.com/x/y/pull/43' }),
    )
    const r = await openOrAppendPR(TOKEN, 'content-updates', 'main', 't', 'b')
    expect(r).toEqual({ number: 43, htmlUrl: 'https://github.com/x/y/pull/43', created: true })
  })

  it('Edge 15: 422 race — list empty, create says "already exists", retry-list returns the PR', async () => {
    setFetchSequence(
      jsonRes(200, []),
      jsonRes(422, { message: 'A pull request already exists for content-updates.' }),
      jsonRes(200, [{ number: 99, html_url: 'https://github.com/x/y/pull/99' }]),
    )
    const r = await openOrAppendPR(TOKEN, 'content-updates', 'main', 't', 'b')
    expect(r).toEqual({ number: 99, htmlUrl: 'https://github.com/x/y/pull/99', created: false })
  })

  it('throws on 422 not race', async () => {
    setFetchSequence(
      jsonRes(200, []),
      jsonRes(422, { message: 'No commits between branches' }),
    )
    await expect(openOrAppendPR(TOKEN, 'content-updates', 'main', 't', 'b'))
      .rejects.toThrow(/invalid request/i)
  })

  it('throws on 401 listing', async () => {
    setFetchSequence(jsonRes(401, { message: 'Bad credentials' }))
    await expect(openOrAppendPR(TOKEN, 'content-updates', 'main', 't', 'b'))
      .rejects.toThrow(/unauthorized/i)
  })

  it('throws on 500 creating', async () => {
    setFetchSequence(
      jsonRes(200, []),
      jsonRes(500, { message: 'server' }),
    )
    await expect(openOrAppendPR(TOKEN, 'content-updates', 'main', 't', 'b'))
      .rejects.toThrow(/server error/i)
  })
})

describe('commitContentChange (Edge 18)', () => {
  afterEach(() => { delete globalThis.fetch })

  it('composes ensureBranch → ghSha (branch null → fall back main) → ghPut → openOrAppendPR', async () => {
    setFetchSequence(
      jsonRes(200, { object: { sha: 'head' } }),                          // ensureBranch in commitContentChange
      jsonRes(404, { message: 'not on branch' }),                          // ghSha branch
      jsonRes(200, { sha: 'main-sha' }),                                   // ghSha main fallback
      jsonRes(200, { object: { sha: 'head' } }),                           // ensureBranch from ghPut
      jsonRes(200, { content: { sha: 'after' }, commit: { sha: 'c1', html_url: 'commit-url' } }), // ghPut
      jsonRes(200, []),                                                    // openOrAppendPR list
      jsonRes(201, { number: 7, html_url: 'pr-url' }),                     // openOrAppendPR create
    )
    const r = await commitContentChange(TOKEN, 'events', 'src/data/events.json', [], 'msg')
    expect(r.pr).toEqual({ number: 7, htmlUrl: 'pr-url', created: true })
    expect(r.commit.sha).toBe('c1')
    expect(r.schemaKey).toBe('events')
  })

  it('uses branch sha when present (skips main fallback)', async () => {
    setFetchSequence(
      jsonRes(200, { object: { sha: 'head' } }),
      jsonRes(200, { sha: 'branch-sha' }),
      jsonRes(200, { object: { sha: 'head' } }),
      jsonRes(200, { content: { sha: 'after' }, commit: { sha: 'c1' } }),
      jsonRes(200, [{ number: 5, html_url: 'pr-5' }]),
    )
    const r = await commitContentChange(TOKEN, 'site', 'src/data/site.json', {}, 'msg')
    expect(r.pr.number).toBe(5)
  })
})
