import { formatCell } from './formatCell.js'
import './AdminTable.css'

/**
 * @typedef {Object} TableColumn
 * @property {string} key - field key in the row object
 * @property {string} [label] - column header (defaults to key)
 * @property {(value: unknown, row: object) => React.ReactNode} [format]
 * @property {'left'|'right'|'center'} [align] - default 'left'
 */

/**
 * Generic table for collection schemas. No sort, no pagination (V1 defer).
 *
 * @param {object} props
 * @param {TableColumn[]} props.columns
 * @param {object[]} props.rows
 * @param {string} props.idKey - which row property is the React key + edit identity
 * @param {(row: object) => void} props.onEdit
 * @param {((row: object) => void) | null} [props.onDelete] - null disables delete column
 * @param {boolean} [props.busy] - disables row action buttons when true
 * @param {React.ReactNode} props.emptyState - rendered when rows.length === 0
 * @param {string} [props.caption] - visually-hidden table caption (a11y)
 */
export default function AdminTable({
  columns,
  rows,
  idKey,
  onEdit,
  onDelete = null,
  busy = false,
  emptyState,
  caption,
}) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return <>{emptyState}</>
  }

  const showDelete = typeof onDelete === 'function'

  return (
    <table className="admin-table">
      {caption && <caption className="admin-table-caption">{caption}</caption>}
      <thead>
        <tr>
          {columns.map((col) => (
            <th
              key={col.key}
              scope="col"
              style={col.align ? { textAlign: col.align } : undefined}
            >
              {col.label ?? col.key}
            </th>
          ))}
          <th scope="col" className="admin-table-actions-col" aria-label="操作" />
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={String(row[idKey])}>
            {columns.map((col) => (
              <td
                key={col.key}
                style={col.align ? { textAlign: col.align } : undefined}
                className={col.key === idKey ? 'admin-table-id-cell' : undefined}
              >
                {col.format ? col.format(row[col.key], row) : formatCell(row[col.key])}
              </td>
            ))}
            <td className="admin-table-actions">
              <button
                type="button"
                className="admin-table-btn admin-table-btn-edit"
                onClick={() => onEdit?.(row)}
                disabled={busy}
              >
                编辑
              </button>
              {showDelete && (
                <button
                  type="button"
                  className="admin-table-btn admin-table-btn-delete"
                  onClick={() => onDelete?.(row)}
                  disabled={busy}
                  aria-label={`删除 ${String(row[idKey])}`}
                >
                  ✕
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

