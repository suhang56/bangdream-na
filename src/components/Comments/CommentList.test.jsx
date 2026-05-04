import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CommentList from './CommentList.jsx'
import { _resetForTests, setLanguage } from '../../lib/uiLanguage.js'

const sampleUser = {
  id: 1,
  github_login: 'a',
  display_name: 'A',
  avatar_url: null,
}

function makeRow(id, body, replies = []) {
  return {
    id,
    parent_id: null,
    body,
    deleted: 0,
    created_at: 1700000000 + id,
    user: sampleUser,
    replies,
  }
}

describe('<CommentList />', () => {
  beforeEach(() => {
    _resetForTests()
    setLanguage('zh')
  })
  afterEach(() => {
    _resetForTests()
  })

  it('renders empty state when items is missing/empty', () => {
    render(<CommentList items={[]} currentUser={null} />)
    expect(screen.getByRole('status')).toHaveTextContent('还没有评论')
  })

  it('renders empty state when items is not an array', () => {
    render(<CommentList items={null} currentUser={null} />)
    expect(screen.getByRole('status')).toHaveTextContent('还没有评论')
  })

  it('renders a list of items', () => {
    render(
      <CommentList
        items={[makeRow(1, 'first'), makeRow(2, 'second')]}
        currentUser={null}
      />,
    )
    expect(screen.getByText('first')).toBeInTheDocument()
    expect(screen.getByText('second')).toBeInTheDocument()
  })

  it('renders nested replies under parents', () => {
    const parent = makeRow(1, 'parent', [
      { ...makeRow(2, 'reply'), parent_id: 1 },
    ])
    render(<CommentList items={[parent]} currentUser={null} />)
    expect(screen.getByText('parent')).toBeInTheDocument()
    expect(screen.getByText('reply')).toBeInTheDocument()
  })

  it('passes onReply / onDelete to children', () => {
    const onReply = vi.fn()
    render(
      <CommentList
        items={[makeRow(1, 'x')]}
        currentUser={{ id: 9, role: 'member' }}
        onReply={onReply}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /回复/ }))
    expect(onReply).toHaveBeenCalledWith(1)
  })

  it('renders reply form node when activeReplyId matches', () => {
    const renderReplyForm = vi.fn(() => <div data-testid="reply-form" />)
    render(
      <CommentList
        items={[makeRow(1, 'x'), makeRow(2, 'y')]}
        currentUser={null}
        activeReplyId={1}
        renderReplyForm={renderReplyForm}
      />,
    )
    expect(screen.getByTestId('reply-form')).toBeInTheDocument()
    expect(renderReplyForm).toHaveBeenCalledTimes(1)
    expect(renderReplyForm).toHaveBeenCalledWith(1)
  })

  it('does not render reply form for other rows', () => {
    const renderReplyForm = vi.fn(() => <div data-testid="reply-form" />)
    render(
      <CommentList
        items={[makeRow(1, 'x'), makeRow(2, 'y')]}
        currentUser={null}
        activeReplyId={999}
        renderReplyForm={renderReplyForm}
      />,
    )
    expect(renderReplyForm).not.toHaveBeenCalled()
  })

  it('soft-deleted parent still renders with [已删除] body', () => {
    const row = {
      ...makeRow(1, '[已删除]'),
      deleted: 1,
      user: null,
    }
    render(<CommentList items={[row]} currentUser={null} />)
    expect(screen.getByText('[已删除]')).toBeInTheDocument()
  })
})
