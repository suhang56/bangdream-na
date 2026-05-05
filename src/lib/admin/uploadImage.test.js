import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { uploadImageWithGuard, __internals } from './uploadImage.js'
import * as api from '../api.js'

describe('uploadImageWithGuard', () => {
  let spy
  beforeEach(() => {
    spy = vi.spyOn(api, 'uploadImage')
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  function pngFile(bytes = 16) {
    return new File([new Uint8Array(bytes)], 'photo.png', { type: 'image/png' })
  }

  it('rejects null/undefined file as empty_file', async () => {
    await expect(uploadImageWithGuard(null, 'news')).rejects.toMatchObject({ code: 'empty_file' })
    await expect(uploadImageWithGuard(undefined, 'news')).rejects.toMatchObject({ code: 'empty_file' })
    expect(spy).not.toHaveBeenCalled()
  })

  it('rejects zero-byte file as empty_file', async () => {
    const file = new File([], 'x.png', { type: 'image/png' })
    await expect(uploadImageWithGuard(file, 'news')).rejects.toMatchObject({ code: 'empty_file' })
    expect(spy).not.toHaveBeenCalled()
  })

  it('rejects file over MAX_BYTES as too_large', async () => {
    const big = new File([new Uint8Array(__internals.MAX_BYTES + 1)], 'big.png', { type: 'image/png' })
    await expect(uploadImageWithGuard(big, 'news')).rejects.toMatchObject({ code: 'too_large' })
    expect(spy).not.toHaveBeenCalled()
  })

  it('rejects PDF type as bad_type', async () => {
    const pdf = new File([new Uint8Array(16)], 'doc.pdf', { type: 'application/pdf' })
    await expect(uploadImageWithGuard(pdf, 'news')).rejects.toMatchObject({ code: 'bad_type' })
    expect(spy).not.toHaveBeenCalled()
  })

  it('accepts each allowed mime type', async () => {
    spy.mockResolvedValue({ url: 'https://cdn/x', key: 'news/x', size: 1, contentType: 'image/png' })
    for (const type of __internals.ALLOWED_MIME) {
      const file = new File([new Uint8Array(16)], 'x', { type })
      await uploadImageWithGuard(file, 'news')
    }
    expect(spy).toHaveBeenCalledTimes(__internals.ALLOWED_MIME.length)
  })

  it('passes optional slug through', async () => {
    spy.mockResolvedValue({ url: 'https://cdn/x', key: 'news/my-slug', size: 1, contentType: 'image/png' })
    await uploadImageWithGuard(pngFile(), 'news', { slug: 'my-slug' })
    expect(spy).toHaveBeenCalledWith(expect.any(File), 'news', 'my-slug')
  })

  it('returns api result on success', async () => {
    const apiOut = { url: 'https://cdn/foo.png', key: 'news/foo.png', size: 16, contentType: 'image/png' }
    spy.mockResolvedValue(apiOut)
    const result = await uploadImageWithGuard(pngFile(), 'news')
    expect(result).toEqual(apiOut)
  })

  it('maps 401 ApiError → unauthorized', async () => {
    spy.mockRejectedValue(new api.ApiError('POST /api/upload 401 unauthorized', { status: 401, code: 'unauthorized' }))
    await expect(uploadImageWithGuard(pngFile(), 'news')).rejects.toMatchObject({ code: 'unauthorized' })
  })

  it('maps 403 ApiError → forbidden', async () => {
    spy.mockRejectedValue(new api.ApiError('forbidden', { status: 403, code: 'forbidden' }))
    await expect(uploadImageWithGuard(pngFile(), 'news')).rejects.toMatchObject({ code: 'forbidden' })
  })

  it('maps 413 ApiError → too_large', async () => {
    spy.mockRejectedValue(new api.ApiError('too_large', { status: 413, code: 'payload_too_large' }))
    await expect(uploadImageWithGuard(pngFile(), 'news')).rejects.toMatchObject({ code: 'too_large' })
  })

  it('maps 415 ApiError → bad_type', async () => {
    spy.mockRejectedValue(new api.ApiError('bad', { status: 415, code: 'unsupported_media_type' }))
    await expect(uploadImageWithGuard(pngFile(), 'news')).rejects.toMatchObject({ code: 'bad_type' })
  })

  it('maps 400 ApiError → bad_request', async () => {
    spy.mockRejectedValue(new api.ApiError('bad', { status: 400, code: 'bad_request' }))
    await expect(uploadImageWithGuard(pngFile(), 'news')).rejects.toMatchObject({ code: 'bad_request' })
  })

  it('maps 500 ApiError → server', async () => {
    spy.mockRejectedValue(new api.ApiError('server error', { status: 500, code: 'internal_error' }))
    await expect(uploadImageWithGuard(pngFile(), 'news')).rejects.toMatchObject({ code: 'server' })
  })

  it('maps unknown ApiError status to unknown', async () => {
    spy.mockRejectedValue(new api.ApiError('weird', { status: 418, code: 'teapot' }))
    await expect(uploadImageWithGuard(pngFile(), 'news')).rejects.toMatchObject({ code: 'unknown' })
  })

  it('maps non-ApiError throw to network', async () => {
    spy.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(uploadImageWithGuard(pngFile(), 'news')).rejects.toMatchObject({ code: 'network' })
  })
})
