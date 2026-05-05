import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('../../lib/api.js', async () => {
  const actual = await vi.importActual('../../lib/api.js')
  return {
    ...actual,
    fetchComments: vi.fn(),
    postComment: vi.fn(),
    deleteComment: vi.fn(),
    fetchMe: vi.fn(),
    loginUrl: () => 'https://api.bangdream.org/api/auth/github',
  }
})

import Comments from './Comments.jsx'
import * as api from '../../lib/api.js'
import { _resetForTests, setLanguage } from '../../lib/uiLanguage.js'

const memberUser = {
  id: 1,
  github_login: 'm',
  display_name: 'Member',
  avatar_url: null,
  role: 'member',
}

function makeComment(id, body, opts = {}) {
  return {
    id,
    parent_id: opts.parentId ?? null,
    body,
    deleted: opts.deleted ? 1 : 0,
    created_at: 1700000000 + id,
    user: opts.user ?? {
      id: 1,
      github_login: 'a',
      display_name: 'A',
      avatar_url: null,
    },
    replies: opts.replies ?? [],
  }
}

describe('<Comments />', () => {
  beforeEach(() => {
    _resetForTests()
    setLanguage('zh')
    api.fetchComments.mockReset()
    api.postComment.mockReset()
    api.deleteComment.mockReset()
    api.fetchMe.mockReset()
    if (typeof window.confirm !== 'function') window.confirm = () => true
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })
  afterEach(() => {
    _resetForTests()
    vi.restoreAllMocks()
  })

  it('shows loading state then list when fetch resolves', async () => {
    api.fetchComments.mockResolvedValue({ items: [], total: 0 })
    api.fetchMe.mockResolvedValue(null)
    render(<Comments targetKind="news" targetId={1} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('还没有评论')).toBeInTheDocument())
  })

  it('shows error state when fetchComments rejects', async () => {
    api.fetchComments.mockRejectedValue(new Error('boom'))
    api.fetchMe.mockResolvedValue(null)
    render(<Comments targetKind="news" targetId={1} />)
    await waitFor(() =>
      expect(screen.getByText(/加载评论失败/)).toBeInTheDocument(),
    )
  })

  it('handles invalid targetId gracefully', () => {
    render(<Comments targetKind="news" targetId={NaN} />)
    expect(screen.getByText('还没有评论')).toBeInTheDocument()
    expect(api.fetchComments).not.toHaveBeenCalled()
  })

  it('renders thread + login prompt when not logged in', async () => {
    api.fetchComments.mockResolvedValue({
      items: [makeComment(1, 'hello')],
      total: 1,
    })
    api.fetchMe.mockResolvedValue(null)
    render(<Comments targetKind="news" targetId={1} />)
    await waitFor(() => expect(screen.getByText('hello')).toBeInTheDocument())
    expect(screen.getByText(/使用 GitHub 登录后评论/)).toBeInTheDocument()
  })

  it('renders comment form when logged in', async () => {
    api.fetchComments.mockResolvedValue({ items: [], total: 0 })
    api.fetchMe.mockResolvedValue({ user: memberUser })
    render(<Comments targetKind="news" targetId={1} />)
    await waitFor(() => expect(screen.getByRole('textbox')).toBeInTheDocument())
  })

  it('posts a top-level comment and prepends to list', async () => {
    api.fetchComments.mockResolvedValue({ items: [], total: 0 })
    api.fetchMe.mockResolvedValue({ user: memberUser })
    api.postComment.mockResolvedValue({
      id: 99,
      parent_id: null,
      body: 'new comment',
      deleted: 0,
      created_at: 1700000999,
      user: memberUser,
    })
    render(<Comments targetKind="news" targetId={1} />)
    await waitFor(() => expect(screen.getByRole('textbox')).toBeInTheDocument())
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'new comment' },
    })
    fireEvent.click(screen.getByRole('button', { name: /发送/ }))
    await waitFor(() =>
      expect(screen.getByText('new comment')).toBeInTheDocument(),
    )
  })

  it('opens reply form on Reply click and posts reply nested', async () => {
    api.fetchComments.mockResolvedValue({
      items: [makeComment(5, 'parent', { user: memberUser })],
      total: 1,
    })
    api.fetchMe.mockResolvedValue({ user: memberUser })
    api.postComment.mockResolvedValue({
      id: 6,
      parent_id: 5,
      body: 'reply body',
      deleted: 0,
      created_at: 1700000888,
      user: memberUser,
    })
    render(<Comments targetKind="news" targetId={1} />)
    await waitFor(() => expect(screen.getByText('parent')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /回复/ }))
    // Now there are TWO textboxes (top-level + reply). Pick the reply one
    // by finding the textbox inside the .comments__reply-form container.
    const replyContainer = document.querySelector('.comments__reply-form')
    expect(replyContainer).not.toBeNull()
    const replyTextarea = replyContainer.querySelector('textarea')
    fireEvent.change(replyTextarea, { target: { value: 'reply body' } })
    const replySubmit = replyContainer.querySelector('button[type="submit"]')
    fireEvent.click(replySubmit)
    await waitFor(() =>
      expect(screen.getByText('reply body')).toBeInTheDocument(),
    )
  })

  it('soft-deletes a comment via deleteComment', async () => {
    api.fetchComments.mockResolvedValue({
      items: [makeComment(7, 'mine', { user: memberUser })],
      total: 1,
    })
    api.fetchMe.mockResolvedValue({ user: memberUser })
    api.deleteComment.mockResolvedValue(null)
    render(<Comments targetKind="news" targetId={1} />)
    await waitFor(() => expect(screen.getByText('mine')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /^删除$/ }))
    await waitFor(() => expect(api.deleteComment).toHaveBeenCalledWith(7))
    await waitFor(() =>
      expect(screen.getByText('[已删除]')).toBeInTheDocument(),
    )
  })

  it('shows soft-deleted nested reply correctly', async () => {
    api.fetchComments.mockResolvedValue({
      items: [
        makeComment(1, 'parent', {
          user: memberUser,
          replies: [
            makeComment(2, '[已删除]', { parentId: 1, deleted: true, user: null }),
          ],
        }),
      ],
      total: 2,
    })
    api.fetchMe.mockResolvedValue(null)
    render(<Comments targetKind="news" targetId={1} />)
    await waitFor(() => expect(screen.getByText('parent')).toBeInTheDocument())
    expect(screen.getByText('[已删除]')).toBeInTheDocument()
  })

  it('soft-deleted body re-renders in active language after switch', async () => {
    api.fetchComments.mockResolvedValue({
      items: [makeComment(7, 'mine', { user: memberUser })],
      total: 1,
    })
    api.fetchMe.mockResolvedValue({ user: memberUser })
    api.deleteComment.mockResolvedValue(null)
    render(<Comments targetKind="news" targetId={1} />)
    await waitFor(() => expect(screen.getByText('mine')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /^删除$/ }))
    await waitFor(() =>
      expect(screen.getByText('[已删除]')).toBeInTheDocument(),
    )
    act(() => {
      setLanguage('en')
    })
    await waitFor(() =>
      expect(screen.getByText('[Deleted]')).toBeInTheDocument(),
    )
    expect(screen.queryByText('[已删除]')).toBeNull()
  })

  it('refetches when targetId changes', async () => {
    api.fetchComments.mockResolvedValue({ items: [], total: 0 })
    api.fetchMe.mockResolvedValue(null)
    const { rerender } = render(<Comments targetKind="news" targetId={1} />)
    await waitFor(() => expect(api.fetchComments).toHaveBeenCalledTimes(1))
    rerender(<Comments targetKind="news" targetId={2} />)
    await waitFor(() => expect(api.fetchComments).toHaveBeenCalledTimes(2))
  })
})
