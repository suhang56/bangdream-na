import { spawnSync } from 'node:child_process';

/**
 * Escape a value for embedding in SQL.
 * Returns a SQL literal string (quoted or NULL).
 */
function sqlLiteral(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? '1' : '0';
  // Escape single quotes by doubling them
  return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * Build an INSERT OR IGNORE statement.
 * @param {string} table   - table name
 * @param {object} row     - column → value map
 * @returns {string}       - complete SQL statement
 */
export function buildInsertSql(table, row) {
  const cols = Object.keys(row);
  const vals = cols.map((c) => sqlLiteral(row[c]));
  return `INSERT OR IGNORE INTO ${table} (${cols.join(', ')}) VALUES (${vals.join(', ')});`;
}

/**
 * Execute a SQL command via wrangler d1 execute.
 * @param {string} sql       - SQL to run
 * @param {object} opts
 * @param {boolean} opts.remote  - true = --remote, false = --local
 * @param {boolean} opts.dryRun  - if true, only print the SQL
 * @returns {{ executed: boolean }}
 */
export function executeD1(sql, { remote = true, dryRun = false } = {}) {
  if (dryRun) {
    console.log(`  [D1 dry-run] ${sql}`);
    return { executed: false };
  }

  const targetFlag = remote ? '--remote' : '--local';
  const result = spawnSync(
    'npx',
    ['wrangler', 'd1', 'execute', 'bangdream-na-content', targetFlag, '--command', sql],
    { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
  );

  if (result.status !== 0) {
    const stderr = result.stderr ?? '';
    console.error(`  [D1] FAILED (exit ${result.status}): ${stderr}`);
    throw new Error(`wrangler d1 execute failed: exit ${result.status}\n${stderr}`);
  }

  return { executed: true };
}

/**
 * Insert a row into D1 using INSERT OR IGNORE.
 * Returns { inserted: boolean } — false means the row was skipped (conflict).
 *
 * Because wrangler d1 execute doesn't report changes_count in a machine-readable way,
 * we consider "executed without error" as inserted=true and trust ON CONFLICT DO NOTHING
 * for idempotency (the INSERT OR IGNORE is SQLite's equivalent).
 */
export function insertRow(table, row, { remote = true, dryRun = false } = {}) {
  const sql = buildInsertSql(table, row);
  const { executed } = executeD1(sql, { remote, dryRun });
  return { inserted: executed, sql };
}
