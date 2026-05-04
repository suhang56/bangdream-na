import { uploadImage as apiUploadImage, ApiError } from '../api.js'

const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const MAX_BYTES = 5 * 1024 * 1024

/**
 * Wrapper around api.uploadImage with client-side pre-validation and a
 * normalized error surface (Chinese for operator-visible messages).
 *
 * Rejects with Error whose .code is one of:
 *   'too_large' | 'bad_type' | 'empty_file' | 'unauthorized' |
 *   'forbidden' | 'network' | 'server' | 'unknown'
 *
 * @param {File} file
 * @param {'news'|'events'|'members'} kind
 * @param {object} [opts]
 * @param {string} [opts.slug]
 * @returns {Promise<{ url: string, key: string, size: number, contentType: string }>}
 */
export async function uploadImageWithGuard(file, kind, opts = {}) {
  if (!file) {
    throw makeError('empty_file', '请选择文件')
  }
  if (file.size <= 0) {
    throw makeError('empty_file', '文件为空')
  }
  if (file.size > MAX_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1)
    throw makeError('too_large', `文件过大 (${mb} MB),最大 5 MB`)
  }
  const contentType = (file.type || '').toLowerCase()
  if (!ALLOWED_MIME.includes(contentType)) {
    throw makeError('bad_type', '仅支持 png / jpeg / webp / gif 图片')
  }

  try {
    return await apiUploadImage(file, kind, opts.slug)
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) throw makeError('unauthorized', '登录已过期,请重新登录', err)
      if (err.status === 403) throw makeError('forbidden', '需要管理员权限', err)
      if (err.status === 413) throw makeError('too_large', '文件过大', err)
      if (err.status === 415) throw makeError('bad_type', '不支持的文件类型', err)
      if (err.status === 400) throw makeError('bad_request', '请求无效', err)
      if (err.status >= 500) throw makeError('server', '服务器错误,请稍后重试', err)
      throw makeError('unknown', err.message, err)
    }
    throw makeError('network', '网络错误', err)
  }
}

function makeError(code, message, cause) {
  const e = new Error(message)
  e.code = code
  if (cause) e.cause = cause
  return e
}

export const __internals = { ALLOWED_MIME, MAX_BYTES }
