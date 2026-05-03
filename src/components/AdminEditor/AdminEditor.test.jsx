import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdminEditor from './AdminEditor.jsx'
import * as githubApi from '../../lib/githubApi.js'

const SAVE_BUTTON = /保存（提交 PR）/

describe('<AdminEditor /> events (collection)', () => {
  beforeEach(() => {
    vi.spyOn(githubApi, 'ghGet').mockResolvedValue({
      content: [{ id: 'a-1', title: 'Existing event', date: '2025-09-15T19:00:00-07:00', type: 'concert', location: { city: 'LA' } }],
      sha: 'sha1',
      raw: '[]',
    })
    vi.spyOn(githubApi, 'commitContentChange').mockResolvedValue({
      pr: { number: 7, htmlUrl: 'https://github.com/x/y/pull/7', created: false },
      commit: { sha: 'c1' },
    })
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('loads + lists items + shows + 新建 button', async () => {
    render(<AdminEditor schemaKey="events" token="ghp_X" />)
    await waitFor(() => expect(screen.getByText('Existing event')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /\+ 新建活动/ })).toBeInTheDocument()
  })

  it('clicking 编辑 row opens form view; 取消 returns to list', async () => {
    render(<AdminEditor schemaKey="events" token="ghp_X" />)
    await waitFor(() => expect(screen.getByText('Existing event')).toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: /^编辑$/ })[0])
    expect(screen.getByRole('button', { name: SAVE_BUTTON })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^取消$/ }))
    expect(screen.getByText('Existing event')).toBeInTheDocument()
  })

  it('+ 新建 opens empty form', async () => {
    render(<AdminEditor schemaKey="events" token="ghp_X" />)
    await waitFor(() => expect(screen.getByText('Existing event')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /\+ 新建活动/ }))
    expect(screen.getByRole('button', { name: SAVE_BUTTON })).toBeDisabled()
  })

  it('save flow: triggers commitContentChange with composed message', async () => {
    render(<AdminEditor schemaKey="events" token="ghp_X" />)
    await waitFor(() => expect(screen.getByText('Existing event')).toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: /^编辑$/ })[0])
    const titleInput = screen.getByLabelText(/^标题/)
    fireEvent.change(titleInput, { target: { value: 'Updated event' } })
    const save = screen.getByRole('button', { name: SAVE_BUTTON })
    fireEvent.click(save)
    await waitFor(() => expect(githubApi.commitContentChange).toHaveBeenCalled())
    const args = githubApi.commitContentChange.mock.calls[0]
    expect(args[1]).toBe('events')
    expect(args[2]).toBe('src/data/events.json')
    expect(args[4]).toMatch(/update events\.json/)
  })

  it('emits onSaveStatus saving → saved on successful save', async () => {
    const onSaveStatus = vi.fn()
    render(<AdminEditor schemaKey="events" token="ghp_X" onSaveStatus={onSaveStatus} />)
    await waitFor(() => expect(screen.getByText('Existing event')).toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: /^编辑$/ })[0])
    fireEvent.change(screen.getByLabelText(/^标题/), { target: { value: 'X' } })
    fireEvent.click(screen.getByRole('button', { name: SAVE_BUTTON }))
    await waitFor(() => expect(onSaveStatus).toHaveBeenCalledWith({ status: 'saving' }))
    await waitFor(() => expect(onSaveStatus).toHaveBeenCalledWith(expect.objectContaining({
      status: 'saved',
      prNumber: 7,
    })))
  })

  it('handles 409 conflict by showing dialog', async () => {
    vi.spyOn(githubApi, 'commitContentChange').mockRejectedValue(new Error('Concurrent edit detected. Refresh and retry.'))
    render(<AdminEditor schemaKey="events" token="ghp_X" />)
    await waitFor(() => expect(screen.getByText('Existing event')).toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: /^编辑$/ })[0])
    fireEvent.change(screen.getByLabelText(/^标题/), { target: { value: 'X' } })
    fireEvent.click(screen.getByRole('button', { name: SAVE_BUTTON }))
    await waitFor(() => expect(screen.getByRole('alertdialog')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /放弃并刷新/ }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('falls back to base when content-updates branch missing', async () => {
    githubApi.ghGet
      .mockReset()
      .mockRejectedValueOnce(new Error('Not found: src/data/events.json on content-updates'))
      .mockResolvedValueOnce({ content: [], sha: 'main-sha', raw: '[]' })
    render(<AdminEditor schemaKey="events" token="ghp_X" />)
    await waitFor(() => expect(screen.getByText(/还没有活动/)).toBeInTheDocument())
  })

  it('empty state has primary CTA that opens new-item form', async () => {
    githubApi.ghGet.mockReset().mockResolvedValue({ content: [], sha: 'sha', raw: '[]' })
    render(<AdminEditor schemaKey="events" token="ghp_X" />)
    await waitFor(() => expect(screen.getByText(/还没有活动/)).toBeInTheDocument())
    const ctas = screen.getAllByRole('button', { name: /\+ 新建活动/ })
    fireEvent.click(ctas[0])
    expect(screen.getByRole('button', { name: SAVE_BUTTON })).toBeInTheDocument()
  })

  it('load error shows banner with retry', async () => {
    githubApi.ghGet.mockReset().mockRejectedValue(new Error('Server error'))
    render(<AdminEditor schemaKey="events" token="ghp_X" />)
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/server error/i))
    expect(screen.getByRole('button', { name: /重试/ })).toBeInTheDocument()
  })

  it('delete item triggers commitContentChange with delete message', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<AdminEditor schemaKey="events" token="ghp_X" />)
    await waitFor(() => expect(screen.getByText('Existing event')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /^删除 a-1$/ }))
    await waitFor(() => expect(githubApi.commitContentChange).toHaveBeenCalled())
    const args = githubApi.commitContentChange.mock.calls[0]
    expect(args[4]).toMatch(/remove/)
  })

  it('social schema hides + 新建 and ✕ buttons', async () => {
    githubApi.ghGet.mockReset().mockResolvedValue({
      content: [{ platform: 'discord', label: 'Discord', url: 'https://x', enabled: true }],
      sha: 'sha',
      raw: '[]',
    })
    render(<AdminEditor schemaKey="social" token="ghp_X" />)
    await waitFor(() => expect(screen.getByText('discord')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /\+ 新建/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /^删除/ })).toBeNull()
  })
})

describe('<AdminEditor /> site (singleton)', () => {
  beforeEach(() => {
    vi.spyOn(githubApi, 'ghGet').mockResolvedValue({
      content: { discordInvite: 'https://discord.gg/x', communityName: 'X', communityNameZh: 'X', communityNameJp: 'X' },
      sha: 'sha',
      raw: '{}',
    })
    vi.spyOn(githubApi, 'commitContentChange').mockResolvedValue({
      pr: { number: 8, htmlUrl: 'https://github.com/x/y/pull/8', created: true },
      commit: { sha: 'c1' },
    })
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('renders form directly (no list view)', async () => {
    render(<AdminEditor schemaKey="site" token="ghp_X" />)
    await waitFor(() => expect(screen.getByLabelText(/Discord 邀请链接/)).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /\+ 新建/ })).toBeNull()
  })

  it('保存按钮 disabled until edit makes draft', async () => {
    render(<AdminEditor schemaKey="site" token="ghp_X" />)
    await waitFor(() => expect(screen.getByLabelText(/Discord 邀请链接/)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: SAVE_BUTTON })).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/Discord 邀请链接/), { target: { value: 'https://discord.gg/y' } })
    expect(screen.getByRole('button', { name: SAVE_BUTTON })).not.toBeDisabled()
  })

  it('saves singleton merge', async () => {
    render(<AdminEditor schemaKey="site" token="ghp_X" />)
    await waitFor(() => expect(screen.getByLabelText(/Discord 邀请链接/)).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText(/Discord 邀请链接/), { target: { value: 'https://discord.gg/y' } })
    fireEvent.click(screen.getByRole('button', { name: SAVE_BUTTON }))
    await waitFor(() => expect(githubApi.commitContentChange).toHaveBeenCalled())
    const args = githubApi.commitContentChange.mock.calls[0]
    expect(args[3].discordInvite).toBe('https://discord.gg/y')
  })

  it('singleton emits onSaveStatus saving → saved', async () => {
    const onSaveStatus = vi.fn()
    render(<AdminEditor schemaKey="site" token="ghp_X" onSaveStatus={onSaveStatus} />)
    await waitFor(() => expect(screen.getByLabelText(/Discord 邀请链接/)).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText(/Discord 邀请链接/), { target: { value: 'https://discord.gg/y' } })
    fireEvent.click(screen.getByRole('button', { name: SAVE_BUTTON }))
    await waitFor(() => expect(onSaveStatus).toHaveBeenCalledWith({ status: 'saving' }))
    await waitFor(() => expect(onSaveStatus).toHaveBeenCalledWith(expect.objectContaining({ status: 'saved', prNumber: 8 })))
  })
})

describe('<AdminEditor /> unknown schema', () => {
  it('shows unknown schema error', () => {
    render(<AdminEditor schemaKey="not-a-schema" token="ghp_X" />)
    expect(screen.getByText(/未知 schema/)).toBeInTheDocument()
  })
})

describe('<AdminEditor /> additional branches', () => {
  beforeEach(() => {
    vi.spyOn(githubApi, 'ghGet').mockResolvedValue({
      content: [{ id: 'a-1', title: 'X', date: '2025-09-15T19:00:00-07:00', type: 'concert', location: { city: 'LA' } }],
      sha: 'sha',
      raw: '[]',
    })
    vi.spyOn(githubApi, 'commitContentChange').mockResolvedValue({
      pr: { number: 9, htmlUrl: 'https://x/pull/9', created: false },
      commit: { sha: 'c1' },
    })
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('delete with confirm=false does NOT save', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<AdminEditor schemaKey="events" token="ghp_X" />)
    await waitFor(() => expect(screen.getByText('X')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /^删除 a-1$/ }))
    expect(githubApi.commitContentChange).not.toHaveBeenCalled()
  })

  it('delete error surfaces in error banner', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    githubApi.commitContentChange.mockRejectedValueOnce(new Error('Server down'))
    render(<AdminEditor schemaKey="events" token="ghp_X" />)
    await waitFor(() => expect(screen.getByText('X')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /^删除 a-1$/ }))
    await waitFor(() => expect(screen.getByText(/server down/i)).toBeInTheDocument())
  })

  it('conflict dialog 取消 closes dialog without discarding', async () => {
    githubApi.commitContentChange.mockRejectedValueOnce(new Error('Concurrent edit detected.'))
    render(<AdminEditor schemaKey="events" token="ghp_X" />)
    await waitFor(() => expect(screen.getByText('X')).toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: /^编辑$/ })[0])
    fireEvent.change(screen.getByLabelText(/^标题/), { target: { value: 'Y' } })
    fireEvent.click(screen.getByRole('button', { name: SAVE_BUTTON }))
    await waitFor(() => expect(screen.getByRole('alertdialog')).toBeInTheDocument())
    const dialog = screen.getByRole('alertdialog')
    const cancelBtns = dialog.querySelectorAll('button.admin-editor-btn:not(.primary)')
    fireEvent.click(cancelBtns[cancelBtns.length - 1])
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
  })

  it('+ 新建 with empty required title shows save disabled until valid', async () => {
    render(<AdminEditor schemaKey="events" token="ghp_X" />)
    await waitFor(() => expect(screen.getByText('X')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /\+ 新建活动/ }))
    const save = screen.getByRole('button', { name: SAVE_BUTTON })
    expect(save).toBeDisabled()
  })

  it('singleton load error shows error banner', async () => {
    githubApi.ghGet.mockReset().mockRejectedValue(new Error('Server'))
    render(<AdminEditor schemaKey="site" token="ghp_X" />)
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/server/i))
  })

  it('singleton 409 conflict shows dialog', async () => {
    githubApi.ghGet.mockReset().mockResolvedValue({
      content: { discordInvite: 'https://x.com', communityName: 'A', communityNameZh: 'B', communityNameJp: 'C' },
      sha: 'sha',
      raw: '{}',
    })
    githubApi.commitContentChange.mockRejectedValueOnce(new Error('Concurrent edit detected.'))
    render(<AdminEditor schemaKey="site" token="ghp_X" />)
    await waitFor(() => expect(screen.getByLabelText(/Discord 邀请链接/)).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText(/Discord 邀请链接/), { target: { value: 'https://discord.gg/y' } })
    fireEvent.click(screen.getByRole('button', { name: SAVE_BUTTON }))
    await waitFor(() => expect(screen.getByRole('alertdialog')).toBeInTheDocument())
  })

  it('singleton 重置 button clears draft', async () => {
    githubApi.ghGet.mockReset().mockResolvedValue({
      content: { discordInvite: 'https://x.com', communityName: 'A', communityNameZh: 'B', communityNameJp: 'C' },
      sha: 'sha',
      raw: '{}',
    })
    render(<AdminEditor schemaKey="site" token="ghp_X" />)
    await waitFor(() => expect(screen.getByLabelText(/Discord 邀请链接/)).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText(/Discord 邀请链接/), { target: { value: 'https://discord.gg/z' } })
    expect(screen.getByRole('button', { name: /^重置$/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^重置$/ }))
    expect(screen.queryByRole('button', { name: /^重置$/ })).toBeNull()
  })

  it('formatCell renders boolean / number / object via row table', async () => {
    githubApi.ghGet.mockReset().mockResolvedValue({
      content: [{ platform: 'discord', label: 'Discord', enabled: true, url: 'https://x', qrImage: '' }],
      sha: 'sha',
      raw: '[]',
    })
    render(<AdminEditor schemaKey="social" token="ghp_X" />)
    await waitFor(() => expect(screen.getByText('discord')).toBeInTheDocument())
    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  it('load 401 calls onAuthExpired (S11) and skips loadError', async () => {
    githubApi.ghGet.mockReset().mockRejectedValue(new Error('Unauthorized — token expired or revoked.'))
    const onAuthExpired = vi.fn()
    render(<AdminEditor schemaKey="events" token="ghp_X" onAuthExpired={onAuthExpired} />)
    await waitFor(() => expect(onAuthExpired).toHaveBeenCalled())
  })

  it('collection save 401 calls onAuthExpired', async () => {
    githubApi.commitContentChange.mockRejectedValueOnce(new Error('Unauthorized — token expired or revoked.'))
    const onAuthExpired = vi.fn()
    render(<AdminEditor schemaKey="events" token="ghp_X" onAuthExpired={onAuthExpired} />)
    await waitFor(() => expect(screen.getByText('X')).toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: /^编辑$/ })[0])
    fireEvent.change(screen.getByLabelText(/^标题/), { target: { value: 'Y' } })
    fireEvent.click(screen.getByRole('button', { name: SAVE_BUTTON }))
    await waitFor(() => expect(onAuthExpired).toHaveBeenCalled())
  })

  it('delete 403-bad-credentials calls onAuthExpired (S12)', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    githubApi.commitContentChange.mockRejectedValueOnce(new Error('Forbidden — token lacks required scope.'))
    const onAuthExpired = vi.fn()
    render(<AdminEditor schemaKey="events" token="ghp_X" onAuthExpired={onAuthExpired} />)
    await waitFor(() => expect(screen.getByText('X')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /^删除 a-1$/ }))
    await waitFor(() => expect(onAuthExpired).toHaveBeenCalled())
  })

  it('singleton save 401 calls onAuthExpired', async () => {
    githubApi.ghGet.mockReset().mockResolvedValue({
      content: { discordInvite: 'https://x.com', communityName: 'A', communityNameZh: 'B', communityNameJp: 'C' },
      sha: 'sha',
      raw: '{}',
    })
    githubApi.commitContentChange.mockRejectedValueOnce(new Error('Unauthorized — token expired or revoked.'))
    const onAuthExpired = vi.fn()
    render(<AdminEditor schemaKey="site" token="ghp_X" onAuthExpired={onAuthExpired} />)
    await waitFor(() => expect(screen.getByLabelText(/Discord 邀请链接/)).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText(/Discord 邀请链接/), { target: { value: 'https://discord.gg/y' } })
    fireEvent.click(screen.getByRole('button', { name: SAVE_BUTTON }))
    await waitFor(() => expect(onAuthExpired).toHaveBeenCalled())
  })
})
