/**
 * GitHub Contents API client for the bangdream-na admin panel.
 *
 * All errors thrown from this module have sanitized .message — never includes
 * the Authorization header or PAT literal.
 */

const REPO = 'suhang56/bangdream-na';
const API = 'https://api.github.com';
const DEFAULT_BASE = 'main';
const REPO_OWNER = REPO.split('/')[0];
const TOKEN_PATTERN = /(token\s+|bearer\s+)?(ghp_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})/gi;

function sanitizeMessage(msg, fallback) {
  const base = (typeof msg === 'string' && msg.length > 0) ? msg : fallback;
  return base.replace(TOKEN_PATTERN, '[redacted]');
}

export function sanitizeError(err, fallback = 'GitHub request failed') {
  if (err instanceof Error) {
    return new Error(sanitizeMessage(err.message, fallback));
  }
  if (typeof err === 'string') {
    return new Error(sanitizeMessage(err, fallback));
  }
  if (err && typeof err === 'object' && typeof err.message === 'string') {
    return new Error(sanitizeMessage(err.message, fallback));
  }
  return new Error(fallback);
}

export function encodeBase64Utf8(s) {
  const bytes = new TextEncoder().encode(s);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function decodeBase64Utf8(b64) {
  const binary = atob(b64.replace(/\n/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function authHeaders(token) {
  return {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github.v3+json',
  };
}

async function readJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function statusToMessage(status, body, path) {
  if (status === 401) return 'Unauthorized — token expired or revoked.';
  if (status === 403) {
    const msg = body?.message ?? '';
    if (/bad credentials/i.test(msg)) return 'Unauthorized — token expired or revoked.';
    return 'Forbidden — token lacks required scope.';
  }
  if (status === 404) {
    if (path) return `Not found: ${path}`;
    return 'Not found.';
  }
  if (status === 409) return 'Concurrent edit detected. Refresh and retry.';
  if (status === 422) {
    const msg = body?.message ?? 'Invalid request';
    return `Invalid request: ${msg}`;
  }
  if (status >= 500) return `GitHub server error (${status}).`;
  return body?.message ? sanitizeMessage(body.message, `GitHub error (${status})`) : `GitHub error (${status})`;
}

export async function ghGet(token, path, branch = DEFAULT_BASE) {
  let res;
  try {
    res = await fetch(`${API}/repos/${REPO}/contents/${encodeURI(path)}?ref=${encodeURIComponent(branch)}`, {
      headers: authHeaders(token),
    });
  } catch (err) {
    throw sanitizeError(err, 'Network error.');
  }
  if (!res.ok) {
    const body = await readJsonSafe(res);
    throw new Error(sanitizeMessage(statusToMessage(res.status, body, `${path} on ${branch}`), `GitHub error (${res.status})`));
  }
  const data = await res.json();
  let raw;
  try {
    raw = decodeBase64Utf8(data.content ?? '');
  } catch (err) {
    throw sanitizeError(err, `Could not decode ${path}`);
  }
  let content;
  try {
    content = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON in ${path}`);
  }
  return { content, sha: data.sha, raw };
}

export async function ghSha(token, path, branch = DEFAULT_BASE) {
  let res;
  try {
    res = await fetch(`${API}/repos/${REPO}/contents/${encodeURI(path)}?ref=${encodeURIComponent(branch)}`, {
      headers: authHeaders(token),
    });
  } catch (err) {
    throw sanitizeError(err, 'Network error.');
  }
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await readJsonSafe(res);
    throw new Error(sanitizeMessage(statusToMessage(res.status, body, path), `GitHub error (${res.status})`));
  }
  const data = await res.json();
  return data.sha ?? null;
}

export async function ensureBranch(token, branch, base = DEFAULT_BASE) {
  let res;
  try {
    res = await fetch(`${API}/repos/${REPO}/git/refs/heads/${encodeURIComponent(branch)}`, {
      headers: authHeaders(token),
    });
  } catch (err) {
    throw sanitizeError(err, 'Network error.');
  }
  if (res.ok) {
    const data = await res.json();
    return { branch, headSha: data.object.sha, created: false };
  }
  if (res.status !== 404) {
    const body = await readJsonSafe(res);
    throw new Error(sanitizeMessage(statusToMessage(res.status, body, `branch ${branch}`), `GitHub error (${res.status})`));
  }
  let baseRes;
  try {
    baseRes = await fetch(`${API}/repos/${REPO}/git/refs/heads/${encodeURIComponent(base)}`, {
      headers: authHeaders(token),
    });
  } catch (err) {
    throw sanitizeError(err, 'Network error.');
  }
  if (!baseRes.ok) {
    const body = await readJsonSafe(baseRes);
    throw new Error(sanitizeMessage(statusToMessage(baseRes.status, body, `base branch ${base}`), `GitHub error (${baseRes.status})`));
  }
  const baseData = await baseRes.json();
  const baseSha = baseData.object.sha;
  let createRes;
  try {
    createRes = await fetch(`${API}/repos/${REPO}/git/refs`, {
      method: 'POST',
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }),
    });
  } catch (err) {
    throw sanitizeError(err, 'Network error.');
  }
  if (!createRes.ok) {
    const body = await readJsonSafe(createRes);
    throw new Error(sanitizeMessage(statusToMessage(createRes.status, body, `create branch ${branch}`), `GitHub error (${createRes.status})`));
  }
  const created = await createRes.json();
  return { branch, headSha: created.object.sha, created: true };
}

export async function ghPut(token, path, content, sha, message, branch) {
  await ensureBranch(token, branch);
  const body = {
    message,
    content: encodeBase64Utf8(JSON.stringify(content, null, 2) + '\n'),
    branch,
  };
  if (sha) body.sha = sha;
  let res;
  try {
    res = await fetch(`${API}/repos/${REPO}/contents/${encodeURI(path)}`, {
      method: 'PUT',
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw sanitizeError(err, 'Network error.');
  }
  if (!res.ok) {
    const errBody = await readJsonSafe(res);
    throw new Error(sanitizeMessage(statusToMessage(res.status, errBody, path), `GitHub error (${res.status})`));
  }
  return res.json();
}

export async function uploadAsset(token, repoPath, file, message, branch) {
  await ensureBranch(token, branch);
  const existingSha = await ghSha(token, repoPath, branch);
  let dataUrl;
  try {
    dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsDataURL(file);
    });
  } catch (err) {
    throw sanitizeError(err, 'Failed to read file.');
  }
  const base64 = String(dataUrl).split(',')[1] ?? '';
  const body = { message, content: base64, branch };
  if (existingSha) body.sha = existingSha;
  let res;
  try {
    res = await fetch(`${API}/repos/${REPO}/contents/${encodeURI(repoPath)}`, {
      method: 'PUT',
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw sanitizeError(err, 'Network error.');
  }
  if (!res.ok) {
    const errBody = await readJsonSafe(res);
    throw new Error(sanitizeMessage(statusToMessage(res.status, errBody, repoPath), `GitHub error (${res.status})`));
  }
  const json = await res.json();
  return {
    path: repoPath,
    sha: json.content?.sha,
    downloadUrl: json.content?.download_url ?? null,
  };
}

async function listOpenPRs(token, branch, base) {
  const head = `${REPO_OWNER}:${branch}`;
  const url = `${API}/repos/${REPO}/pulls?state=open&head=${encodeURIComponent(head)}&base=${encodeURIComponent(base)}`;
  let res;
  try {
    res = await fetch(url, { headers: authHeaders(token) });
  } catch (err) {
    throw sanitizeError(err, 'Network error.');
  }
  if (!res.ok) {
    const body = await readJsonSafe(res);
    throw new Error(sanitizeMessage(statusToMessage(res.status, body, `pulls ${head}->${base}`), `GitHub error (${res.status})`));
  }
  return res.json();
}

export async function openOrAppendPR(token, branch, base, title, body) {
  const existing = await listOpenPRs(token, branch, base);
  if (Array.isArray(existing) && existing.length > 0) {
    return { number: existing[0].number, htmlUrl: existing[0].html_url, created: false };
  }
  let createRes;
  try {
    createRes = await fetch(`${API}/repos/${REPO}/pulls`, {
      method: 'POST',
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, head: branch, base }),
    });
  } catch (err) {
    throw sanitizeError(err, 'Network error.');
  }
  if (createRes.ok) {
    const json = await createRes.json();
    return { number: json.number, htmlUrl: json.html_url, created: true };
  }
  if (createRes.status === 422) {
    const errBody = await readJsonSafe(createRes);
    const msg = errBody?.message ?? '';
    if (/already exists/i.test(msg) || /already exists/i.test(JSON.stringify(errBody?.errors ?? []))) {
      const retry = await listOpenPRs(token, branch, base);
      if (Array.isArray(retry) && retry.length > 0) {
        return { number: retry[0].number, htmlUrl: retry[0].html_url, created: false };
      }
    }
    throw new Error(sanitizeMessage(statusToMessage(422, errBody, null), 'Invalid PR request'));
  }
  const errBody = await readJsonSafe(createRes);
  throw new Error(sanitizeMessage(statusToMessage(createRes.status, errBody, null), `GitHub error (${createRes.status})`));
}

export async function commitContentChange(token, schemaKey, path, content, message, options = {}) {
  const branch = options.branch ?? 'content-updates';
  const base = options.base ?? DEFAULT_BASE;
  await ensureBranch(token, branch, base);
  let sha = await ghSha(token, path, branch);
  if (sha == null) {
    sha = await ghSha(token, path, base);
  }
  const putRes = await ghPut(token, path, content, sha, message, branch);
  const pr = await openOrAppendPR(
    token,
    branch,
    base,
    options.prTitle ?? 'chore(content): editorial updates',
    options.prBody ?? defaultPrBody(),
  );
  return {
    pr,
    commit: {
      sha: putRes?.commit?.sha,
      htmlUrl: putRes?.commit?.html_url,
    },
    schemaKey,
  };
}

function defaultPrBody() {
  return [
    '> Auto-generated by /admin panel.',
    '',
    'Each commit on this branch corresponds to one save action.',
    'Merge to deploy. Branch is auto-deleted on merge.',
    '',
    '_To regenerate this PR, just save again from /admin._',
  ].join('\n');
}

export const __internals = { REPO, REPO_OWNER, API, DEFAULT_BASE };
