import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AdminTable from './AdminTable.jsx'
import { formatCell } from './formatCell.js'

const COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'title', label: '标题' },
  { key: 'date', label: '日期' },
]

const ROWS = [
  { id: 'evt-1', title: '春日演唱会', date: '2025-05-01' },
  { id: 'evt-2', title: '秋日见面会', date: '2025-09-15' },
]

describe('<AdminTable />', () => {
  it('renders rows with column headers in given order', () => {
    render(
      <AdminTable
        columns={COLUMNS}
        rows={ROWS}
        idKey="id"
        onEdit={() => {}}
      />,
    )
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent)
    expect(headers.slice(0, 3)).toEqual(['ID', '标题', '日期'])
    expect(screen.getByText('春日演唱会')).toBeInTheDocument()
    expect(screen.getByText('秋日见面会')).toBeInTheDocument()
  })

  it('falls back to column key when label missing', () => {
    render(
      <AdminTable
        columns={[{ key: 'id' }, { key: 'title' }]}
        rows={ROWS}
        idKey="id"
        onEdit={() => {}}
      />,
    )
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent)
    expect(headers.slice(0, 2)).toEqual(['id', 'title'])
  })

  it('clicking 编辑 calls onEdit with the row', () => {
    const onEdit = vi.fn()
    render(
      <AdminTable columns={COLUMNS} rows={ROWS} idKey="id" onEdit={onEdit} />,
    )
    const editBtns = screen.getAllByRole('button', { name: /^编辑$/ })
    expect(editBtns).toHaveLength(2)
    fireEvent.click(editBtns[0])
    expect(onEdit).toHaveBeenCalledWith(ROWS[0])
  })

  it('clicking ✕ calls onDelete with the row', () => {
    const onDelete = vi.fn()
    render(
      <AdminTable
        columns={COLUMNS}
        rows={ROWS}
        idKey="id"
        onEdit={() => {}}
        onDelete={onDelete}
      />,
    )
    const delBtn = screen.getAllByRole('button', { name: /删除 evt-2/ })[0]
    fireEvent.click(delBtn)
    expect(onDelete).toHaveBeenCalledWith(ROWS[1])
  })

  it('hides the delete column when onDelete is null', () => {
    render(
      <AdminTable
        columns={COLUMNS}
        rows={ROWS}
        idKey="id"
        onEdit={() => {}}
        onDelete={null}
      />,
    )
    expect(screen.queryByRole('button', { name: /删除/ })).toBeNull()
  })

  it('disables edit + delete buttons when busy=true', () => {
    render(
      <AdminTable
        columns={COLUMNS}
        rows={ROWS}
        idKey="id"
        onEdit={() => {}}
        onDelete={() => {}}
        busy={true}
      />,
    )
    for (const btn of screen.getAllByRole('button', { name: /^编辑$/ })) {
      expect(btn).toBeDisabled()
    }
    for (const btn of screen.getAllByRole('button', { name: /删除/ })) {
      expect(btn).toBeDisabled()
    }
  })

  it('renders the empty-state slot (not the table) when rows is empty', () => {
    render(
      <AdminTable
        columns={COLUMNS}
        rows={[]}
        idKey="id"
        onEdit={() => {}}
        emptyState={<p data-testid="empty">空状态</p>}
      />,
    )
    expect(screen.getByTestId('empty')).toBeInTheDocument()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('renders empty-state slot when rows is null/undefined (defensive)', () => {
    render(
      <AdminTable
        columns={COLUMNS}
        rows={null}
        idKey="id"
        onEdit={() => {}}
        emptyState={<p data-testid="empty">空</p>}
      />,
    )
    expect(screen.getByTestId('empty')).toBeInTheDocument()
  })

  it('uses idKey to mark id cell with monospace class', () => {
    const { container } = render(
      <AdminTable columns={COLUMNS} rows={ROWS} idKey="id" onEdit={() => {}} />,
    )
    const idCells = container.querySelectorAll('.admin-table-id-cell')
    expect(idCells.length).toBe(2)
  })

  it('applies custom format function to a column', () => {
    const cols = [
      { key: 'id', label: 'ID' },
      { key: 'title', label: '标题', format: (v) => `<${v}>` },
    ]
    render(
      <AdminTable columns={cols} rows={ROWS} idKey="id" onEdit={() => {}} />,
    )
    expect(screen.getByText('<春日演唱会>')).toBeInTheDocument()
  })

  it('renders visually-hidden caption when provided', () => {
    const { container } = render(
      <AdminTable
        columns={COLUMNS}
        rows={ROWS}
        idKey="id"
        onEdit={() => {}}
        caption="活动列表"
      />,
    )
    const cap = container.querySelector('caption')
    expect(cap).toBeInTheDocument()
    expect(cap).toHaveTextContent('活动列表')
  })
})

describe('formatCell helper', () => {
  it('renders null/undefined as empty string', () => {
    expect(formatCell(null)).toBe('')
    expect(formatCell(undefined)).toBe('')
  })

  it('renders boolean as ✓ / —', () => {
    expect(formatCell(true)).toBe('✓')
    expect(formatCell(false)).toBe('—')
  })

  it('renders strings as-is and numbers as strings', () => {
    expect(formatCell('hello')).toBe('hello')
    expect(formatCell(42)).toBe('42')
    expect(formatCell(0)).toBe('0')
  })

  it('JSON-stringifies arrays and objects', () => {
    expect(formatCell({ a: 1 })).toBe('{"a":1}')
    expect(formatCell([1, 2])).toBe('[1,2]')
  })

  it('handles empty string', () => {
    expect(formatCell('')).toBe('')
  })
})
