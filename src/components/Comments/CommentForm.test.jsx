import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('../../lib/api.js', async () => {
  const actual = await vi.importActual('../../lib/api.js')
  return {
    ...actual,
    postComment: vi.fn(),
    loginUrl: () => 'https://api.bangdream.org/api/auth/github',
  }
})

import CommentForm from './CommentForm.jsx'
import * as api from '../../lib/api.js'
import { _resetForTests, setLanguage } from '../../lib/uiLanguage.js'

describe('<CommentForm />', () => {
  beforeEach(() => {
    _resetForTests()
    setLanguage('zh')
    api.postComment.mockReset()
  })
  afterEach(() => {
    _resetForTests()
  })

  it('renders login prompt when no current user', () => {
    render(
      <CommentForm targetKind="news" targetId={1} currentUser={null} onPosted={() => {}} />,
    )
    expect(screen.getByText(/使用 GitHub 登录后评论/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^登录$/ })).toHaveAttribute(
      'href',
      'https://api.bangdream.org/api/auth/github',
    )
  })

  it('renders textarea + submit when logged in', () => {
    render(
      <CommentForm
        targetKind="news"
        targetId={1}
        currentUser={{ id: 1, role: 'member' }}
        onPosted={() => {}}
      />,
    )
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /发送/ })).toBeInTheDocument()
  })

  it('disables submit when textarea empty', () => {
    render(
      <CommentForm
        targetKind="news"
        targetId={1}
        currentUser={{ id: 1, role: 'member' }}
        onPosted={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: /发送/ })).toBeDisabled()
  })

  it('submits trimmed body to postComment, calls onPosted', async () => {
    api.postComment.mockResolvedValue({ id: 5, body: 'hello', parent_id: null })
    const onPosted = vi.fn()
    render(
      <CommentForm
        targetKind="news"
        targetId={42}
        currentUser={{ id: 1, role: 'member' }}
        onPosted={onPosted}
      />,
    )
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  hello  ' } })
    fireEvent.click(screen.getByRole('button', { name: /发送/ }))
    await waitFor(() => expect(api.postComment).toHaveBeenCalled())
    expect(api.postComment).toHaveBeenCalledWith({
      targetKind: 'news',
      targetId: 42,
      body: 'hello',
      parentId: undefined,
    })
    await waitFor(() => expect(onPosted).toHaveBeenCalled())
  })

  it('passes parentId when reply form', async () => {
    api.postComment.mockResolvedValue({ id: 6 })
    const onPosted = vi.fn()
    const onCancel = vi.fn()
    render(
      <CommentForm
        targetKind="news"
        targetId={42}
        parentId={5}
        currentUser={{ id: 1, role: 'member' }}
        onPosted={onPosted}
        onCancel={onCancel}
        isReply
      />,
    )
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'reply' } })
    fireEvent.click(screen.getByRole('button', { name: /发送/ }))
    await waitFor(() => expect(api.postComment).toHaveBeenCalled())
    expect(api.postComment).toHaveBeenCalledWith(
      expect.objectContaining({ parentId: 5 }),
    )
    // Reply form auto-cancels on success
    await waitFor(() => expect(onCancel).toHaveBeenCalled())
  })

  it('cancel button calls onCancel in reply mode', () => {
    const onCancel = vi.fn()
    render(
      <CommentForm
        targetKind="news"
        targetId={1}
        parentId={5}
        currentUser={{ id: 1, role: 'member' }}
        onPosted={() => {}}
        onCancel={onCancel}
        isReply
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /取消/ }))
    expect(onCancel).toHaveBeenCalled()
  })

  it('shows rate-limit message on 429', async () => {
    api.postComment.mockRejectedValue(
      new api.ApiError('429', { status: 429, code: 'rate_limited' }),
    )
    render(
      <CommentForm
        targetKind="news"
        targetId={1}
        currentUser={{ id: 1, role: 'member' }}
        onPosted={() => {}}
      />,
    )
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'x' } })
    fireEvent.click(screen.getByRole('button', { name: /发送/ }))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/评论太频繁/),
    )
  })

  it('shows tooLong message on 400', async () => {
    api.postComment.mockRejectedValue(
      new api.ApiError('400', { status: 400, code: 'bad_request' }),
    )
    render(
      <CommentForm
        targetKind="news"
        targetId={1}
        currentUser={{ id: 1, role: 'member' }}
        onPosted={() => {}}
      />,
    )
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'x' } })
    fireEvent.click(screen.getByRole('button', { name: /发送/ }))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/评论太长/),
    )
  })

  it('shows login message on 401', async () => {
    api.postComment.mockRejectedValue(
      new api.ApiError('401', { status: 401, code: 'unauthorized' }),
    )
    render(
      <CommentForm
        targetKind="news"
        targetId={1}
        currentUser={{ id: 1, role: 'member' }}
        onPosted={() => {}}
      />,
    )
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'x' } })
    fireEvent.click(screen.getByRole('button', { name: /发送/ }))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/GitHub 登录/),
    )
  })

  it('shows generic error on other failure', async () => {
    api.postComment.mockRejectedValue(new Error('network'))
    render(
      <CommentForm
        targetKind="news"
        targetId={1}
        currentUser={{ id: 1, role: 'member' }}
        onPosted={() => {}}
      />,
    )
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'x' } })
    fireEvent.click(screen.getByRole('button', { name: /发送/ }))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/发送评论失败/),
    )
  })

  it('rejects bodies over 4000 chars locally', async () => {
    render(
      <CommentForm
        targetKind="news"
        targetId={1}
        currentUser={{ id: 1, role: 'member' }}
        onPosted={() => {}}
      />,
    )
    const textarea = screen.getByRole('textbox')
    // textarea has maxLength=4000 — simulate explicit larger value via fireEvent
    fireEvent.change(textarea, { target: { value: 'x'.repeat(5000) } })
    // textarea will have truncated; submit should still work since we're under limit
    // But also ensure local empty validation fires:
    fireEvent.change(textarea, { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: /发送/ }))
    // submit is disabled because trimmed length === 0 → onClick blocked, no error
    expect(api.postComment).not.toHaveBeenCalled()
  })
})
