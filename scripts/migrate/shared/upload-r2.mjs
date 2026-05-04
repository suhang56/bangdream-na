import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { extname } from 'node:path';

const MIME_MAP = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

function mimeForPath(filePath) {
  return MIME_MAP[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

/**
 * Check if R2 key already exists.
 * Returns true if the object exists, false if not found, throws on unexpected error.
 */
export function r2KeyExists(r2Key, { dryRun = false } = {}) {
  if (dryRun) return false;
  const wranglerJs = new URL('../../../worker/node_modules/wrangler/bin/wrangler.js', import.meta.url);
  const wranglerJsPath = process.platform === 'win32'
    ? wranglerJs.pathname.replace(/^\//, '').replace(/\//g, '\\')
    : wranglerJs.pathname;
  const result = spawnSync(
    process.execPath,
    [wranglerJsPath, 'r2', 'object', 'head', `bangdream-na-images/${r2Key}`],
    { encoding: 'utf8' },
  );
  // wrangler exits 0 if found, non-zero if not found
  return result.status === 0;
}

/**
 * Upload a local file to R2 at the given key.
 * @param {string} localPath  - absolute path to local file
 * @param {string} r2Key      - key within bangdream-na-images bucket (no leading slash)
 * @param {object} opts
 * @param {boolean} opts.dryRun   - if true, print plan and skip wrangler call
 * @param {boolean} opts.skipIfExists - if true, check head first and skip if exists
 * @returns {{ uploaded: boolean, skipped: boolean, key: string }}
 */
export function uploadToR2(localPath, r2Key, { dryRun = false, skipIfExists = true } = {}) {
  if (!existsSync(localPath)) {
    console.warn(`  [R2] skip (file not found): ${localPath}`);
    return { uploaded: false, skipped: true, key: r2Key };
  }

  if (skipIfExists && !dryRun && r2KeyExists(r2Key)) {
    console.log(`  [R2] skip (already exists): ${r2Key}`);
    return { uploaded: false, skipped: true, key: r2Key };
  }

  const contentType = mimeForPath(localPath);

  if (dryRun) {
    console.log(`  [R2 dry-run] would upload: ${localPath} → ${r2Key} (${contentType})`);
    return { uploaded: false, skipped: false, key: r2Key };
  }

  console.log(`  [R2] uploading: ${localPath} → ${r2Key}`);
  const wranglerPutJsUrl = new URL('../../../worker/node_modules/wrangler/bin/wrangler.js', import.meta.url);
  const wranglerPutJsPath = process.platform === 'win32'
    ? wranglerPutJsUrl.pathname.replace(/^\//, '').replace(/\//g, '\\')
    : wranglerPutJsUrl.pathname;
  const result = spawnSync(
    process.execPath,
    [
      wranglerPutJsPath,
      'r2', 'object', 'put',
      `bangdream-na-images/${r2Key}`,
      '--file', localPath,
      '--content-type', contentType,
      '--cache-control', 'public, max-age=31536000, immutable',
    ],
    { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
  );

  if (result.status !== 0) {
    const stderr = result.stderr ?? '';
    console.error(`  [R2] FAILED (exit ${result.status}): ${stderr}`);
    throw new Error(`wrangler r2 put failed for ${r2Key}: exit ${result.status}\n${stderr}`);
  }

  return { uploaded: true, skipped: false, key: r2Key };
}
