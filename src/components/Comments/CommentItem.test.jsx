import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CommentItem from './CommentItem.jsx'
import { _resetForTests, setLanguage } from '../../lib/uiLanguage.js'

const baseUser = {
  id: 7,
  github_login: 'alice',
  display_name: 'Alice',
  avatar_url: null,
}

const baseComment = {
  id: 100,
  parent_id: null,
  body: 'Hello world',
  deleted: 0,
  created_at: 1700000000,
  user: baseUser,
}

describe('<CommentItem />', () => {
  let originalConfirm
  beforeEach(() => {
    _resetForTests()
    setLanguage('zh')
    originalConfirm = window.confirm
    window.confirm = vi.fn().mockReturnValue(true)
  })
  afterEach(() => {
    _resetForTests()
    window.confirm = originalConfirm
  })

  it('renders body + author display name', () => {
    render(<CommentItem comment={baseComment} />)
    expect(screen.getByText('Hello world')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('falls back to github_login when display_name missing', () => {
    render(
      <CommentItem
        comment={{ ...baseComment, user: { ...baseUser, display_name: null } }}
      />,
    )
    expect(screen.getByText('alice')).toBeInTheDocument()
  })

  it('shows reply button only when current user is logged in and not a reply', () => {
    render(
      <CommentItem
        comment={baseComment}
        currentUser={{ id: 9, role: 'member' }}
      />,
    )
    expect(screen.getByRole('button', { name: /回复/ })).toBeInTheDocument()
  })

  it('hides reply button for anon user', () => {
    render(<CommentItem comment={baseComment} />)
    expect(screen.queryByRole('button', { name: /回复/ })).toBeNull()
  })

  it('hides reply button when isReply=true even if logged in', () => {
    render(
      <CommentItem
        comment={baseComment}
        currentUser={{ id: 9, role: 'member' }}
        isReply
      />,
    )
    expect(screen.queryByRole('button', { name: /回复/ })).toBeNull()
  })

  it('shows delete button when current user is the author', () => {
    render(
      <CommentItem
        comment={baseComment}
        currentUser={{ id: 7, role: 'member' }}
      />,
    )
    expect(screen.getByRole('button', { name: /^删除$/ })).toBeInTheDocument()
  })

  it('shows delete button when current user is admin (other author)', () => {
    render(
      <CommentItem
        comment={baseComment}
        currentUser={{ id: 99, role: 'admin' }}
      />,
    )
    expect(screen.getByRole('button', { name: /^删除$/ })).toBeInTheDocument()
  })

  it('hides delete button for non-author non-admin', () => {
    render(
      <CommentItem
        comment={baseComment}
        currentUser={{ id: 99, role: 'member' }}
      />,
    )
    expect(screen.queryByRole('button', { name: /^删除$/ })).toBeNull()
  })

  it('renders [Deleted] body when comment.deleted=1, hides actions', () => {
    render(
      <CommentItem
        comment={{
          ...baseComment,
          deleted: 1,
          body: '[已删除]',
          user: null,
        }}
        currentUser={{ id: 7, role: 'member' }}
      />,
    )
    expect(screen.getByText('[已删除]')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /回复/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /^删除$/ })).toBeNull()
  })

  it('clicking reply calls onReply with comment id', () => {
    const onReply = vi.fn()
    render(
      <CommentItem
        comment={baseComment}
        currentUser={{ id: 1, role: 'member' }}
        onReply={onReply}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /回复/ }))
    expect(onReply).toHaveBeenCalledWith(100)
  })

  it('clicking delete confirms then calls onDelete', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined)
    render(
      <CommentItem
        comment={baseComment}
        currentUser={{ id: 7, role: 'member' }}
        onDelete={onDelete}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /^删除$/ }))
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(100))
  })

  it('cancels delete when window.confirm returns false', () => {
    window.confirm = vi.fn().mockReturnValue(false)
    const onDelete = vi.fn()
    render(
      <CommentItem
        comment={baseComment}
        currentUser={{ id: 7, role: 'member' }}
        onDelete={onDelete}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /^删除$/ }))
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('shows error message when onDelete rejects', async () => {
    const onDelete = vi.fn().mockRejectedValue(new Error('boom'))
    render(
      <CommentItem
        comment={baseComment}
        currentUser={{ id: 7, role: 'member' }}
        onDelete={onDelete}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /^删除$/ }))
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
  })

  it('renders empty fallback when comment is null/missing', () => {
    const { container } = render(<CommentItem comment={null} />)
    expect(container.querySelector('.comment-item')).not.toBeNull()
  })

  it('shows avatar img when avatar_url present', () => {
    const { container } = render(
      <CommentItem
        comment={{ ...baseComment, user: { ...baseUser, avatar_url: 'https://x/a.png' } }}
      />,
    )
    expect(container.querySelector('img')).not.toBeNull()
  })

  it('shows fallback initial when avatar_url null', () => {
    render(<CommentItem comment={baseComment} />)
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('long body wraps without breaking layout (accepts whitespace)', () => {
    const long =
      'a '.repeat(2000)
    render(<CommentItem comment={{ ...baseComment, body: long }} />)
    // We don't assert exact whitespace; just make sure it rendered
    const body = document.querySelector('.comment-item__body')
    expect(body?.textContent.length).toBeGreaterThan(1000)
  })
})
