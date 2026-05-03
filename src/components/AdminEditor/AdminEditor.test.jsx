import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdminEditor from './AdminEditor.jsx'
import * as githubApi from '../../lib/githubApi.js'

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

  it('loads + lists items + shows Add button', async () => {
    render(<AdminEditor schemaKey="events" token="ghp_X" />)
    await waitFor(() => expect(screen.getByText('Existing event')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /add new/i })).toBeInTheDocument()
  })

  it('clicking Edit row opens form view; Cancel returns to list', async () => {
    render(<AdminEditor schemaKey="events" token="ghp_X" />)
    await waitFor(() => expect(screen.getByText('Existing event')).toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: /^edit$/i })[0])
    expect(screen.getByRole('button', { name: /save \(commit \+ pr\)/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }))
    expect(screen.getByText('Existing event')).toBeInTheDocument()
  })

  it('Add new opens empty form', async () => {
    render(<AdminEditor schemaKey="events" token="ghp_X" />)
    await waitFor(() => expect(screen.getByText('Existing event')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /add new/i }))
    expect(screen.getByRole('button', { name: /save \(commit \+ pr\)/i })).toBeDisabled()
  })

  it('save flow: triggers commitContentChange with composed message', async () => {
    render(<AdminEditor schemaKey="events" token="ghp_X" />)
    await waitFor(() => expect(screen.getByText('Existing event')).toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: /^edit$/i })[0])
    const titleInput = screen.getByLabelText(/^Title/)
    fireEvent.change(titleInput, { target: { value: 'Updated event' } })
    const save = screen.getByRole('button', { name: /save \(commit \+ pr\)/i })
    fireEvent.click(save)
    await waitFor(() => expect(githubApi.commitContentChange).toHaveBeenCalled())
    const args = githubApi.commitContentChange.mock.calls[0]
    expect(args[1]).toBe('events')
    expect(args[2]).toBe('src/data/events.json')
    expect(args[4]).toMatch(/update events\.json/)
  })

  it('shows toast with PR link after save', async () => {
    render(<AdminEditor schemaKey="events" token="ghp_X" />)
    await waitFor(() => expect(screen.getByText('Existing event')).toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: /^edit$/i })[0])
    fireEvent.change(screen.getByLabelText(/^Title/), { target: { value: 'X' } })
    fireEvent.click(screen.getByRole('button', { name: /save \(commit \+ pr\)/i }))
    await waitFor(() => expect(screen.getByText(/PR #7 open/)).toBeInTheDocument())
    const link = screen.getByRole('link', { name: /view on github/i })
    expect(link).toHaveAttribute('href', 'https://github.com/x/y/pull/7')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('handles 409 conflict by showing dialog', async () => {
    vi.spyOn(githubApi, 'commitContentChange').mockRejectedValue(new Error('Concurrent edit detected. Refresh and retry.'))
    render(<AdminEditor schemaKey="events" token="ghp_X" />)
    await waitFor(() => expect(screen.getByText('Existing event')).toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: /^edit$/i })[0])
    fireEvent.change(screen.getByLabelText(/^Title/), { target: { value: 'X' } })
    fireEvent.click(screen.getByRole('button', { name: /save \(commit \+ pr\)/i }))
    await waitFor(() => expect(screen.getByRole('alertdialog')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /discard/i }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('falls back to base when content-updates branch missing', async () => {
    githubApi.ghGet
      .mockReset()
      .mockRejectedValueOnce(new Error('Not found: src/data/events.json on content-updates'))
      .mockResolvedValueOnce({ content: [], sha: 'main-sha', raw: '[]' })
    render(<AdminEditor schemaKey="events" token="ghp_X" />)
    await waitFor(() => expect(screen.getByText(/no events yet/i)).toBeInTheDocument())
  })

  it('load error shows banner with retry', async () => {
    githubApi.ghGet.mockReset().mockRejectedValue(new Error('Server error'))
    render(<AdminEditor schemaKey="events" token="ghp_X" />)
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/server error/i))
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('delete item triggers commitContentChange with delete message', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<AdminEditor schemaKey="events" token="ghp_X" />)
    await waitFor(() => expect(screen.getByText('Existing event')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: '✕' }))
    await waitFor(() => expect(githubApi.commitContentChange).toHaveBeenCalled())
    const args = githubApi.commitContentChange.mock.calls[0]
    expect(args[4]).toMatch(/remove/)
  })

  it('social schema hides Add and ✕ buttons', async () => {
    githubApi.ghGet.mockReset().mockResolvedValue({
      content: [{ platform: 'discord', label: 'Discord', url: 'https://x', enabled: true }],
      sha: 'sha',
      raw: '[]',
    })
    render(<AdminEditor schemaKey="social" token="ghp_X" />)
    await waitFor(() => expect(screen.getByText('discord')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /add new/i })).toBeNull()
    expect(screen.queryByRole('button', { name: '✕' })).toBeNull()
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
    await waitFor(() => expect(screen.getByLabelText(/Discord invite URL/)).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /add new/i })).toBeNull()
  })

  it('Save button disabled until edit makes draft', async () => {
    render(<AdminEditor schemaKey="site" token="ghp_X" />)
    await waitFor(() => expect(screen.getByLabelText(/Discord invite URL/)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /save \(commit \+ pr\)/i })).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/Discord invite URL/), { target: { value: 'https://discord.gg/y' } })
    expect(screen.getByRole('button', { name: /save \(commit \+ pr\)/i })).not.toBeDisabled()
  })

  it('saves singleton merge', async () => {
    render(<AdminEditor schemaKey="site" token="ghp_X" />)
    await waitFor(() => expect(screen.getByLabelText(/Discord invite URL/)).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText(/Discord invite URL/), { target: { value: 'https://discord.gg/y' } })
    fireEvent.click(screen.getByRole('button', { name: /save \(commit \+ pr\)/i }))
    await waitFor(() => expect(githubApi.commitContentChange).toHaveBeenCalled())
    const args = githubApi.commitContentChange.mock.calls[0]
    expect(args[3].discordInvite).toBe('https://discord.gg/y')
  })
})

describe('<AdminEditor /> unknown schema', () => {
  it('shows unknown schema error', () => {
    render(<AdminEditor schemaKey="not-a-schema" token="ghp_X" />)
    expect(screen.getByText(/unknown schema/i)).toBeInTheDocument()
  })
})
