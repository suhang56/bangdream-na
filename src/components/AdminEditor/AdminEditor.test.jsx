import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Use vi.mock so AdminEditor's named imports resolve to mocked impls.
vi.mock('../../lib/api.js', async () => {
  const actual = await vi.importActual('../../lib/api.js')
  return {
    ...actual,
    adminListNews: vi.fn(),
    adminListEvents: vi.fn(),
    adminListMembers: vi.fn(),
    adminListCategories: vi.fn(),
    createNews: vi.fn(),
    updateNews: vi.fn(),
    deleteNews: vi.fn(),
    createEvent: vi.fn(),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(),
    createMember: vi.fn(),
    updateMember: vi.fn(),
    deleteMember: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
    checkSlug: vi.fn().mockResolvedValue({ available: true }),
  }
})

import AdminEditor from './AdminEditor.jsx'
import * as api from '../../lib/api.js'

const NEWS_ROW = {
  id: 1,
  slug: 'sample',
  title_zh: '样例公告',
  title_en: 'Sample',
  body_md: '正文',
  category: 'announcement',
  hero_image_url: null,
  tags: ['a'],
  published_at: 1700000000,
  created_at: 1700000000,
  updated_at: 1700000000,
  draft: 0,
}

describe('<AdminEditor /> news', () => {
  beforeEach(() => {
    api.adminListNews.mockResolvedValue({ items: [NEWS_ROW], total: 1 })
    api.createNews.mockResolvedValue({ ...NEWS_ROW, id: 2 })
    api.updateNews.mockResolvedValue(NEWS_ROW)
    api.deleteNews.mockResolvedValue(null)
  })
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('loads list and shows + 新建 button', async () => {
    render(<AdminEditor schemaKey="news" />)
    await waitFor(() => expect(screen.getByText('样例公告')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /\+ 新建资讯/ })).toBeInTheDocument()
  })

  it('clicking 编辑 opens form, 取消 returns to list', async () => {
    render(<AdminEditor schemaKey="news" />)
    await waitFor(() => expect(screen.getByText('样例公告')).toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: /^编辑$/ })[0])
    expect(screen.getByRole('button', { name: /^保存$/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^取消$/ }))
    expect(screen.getByText('样例公告')).toBeInTheDocument()
  })

  it('+ 新建 opens empty form', async () => {
    render(<AdminEditor schemaKey="news" />)
    await waitFor(() => expect(screen.getByText('样例公告')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /\+ 新建资讯/ }))
    expect(screen.getByRole('button', { name: /^保存$/ })).toBeDisabled()
  })

  it('save edit calls updateNews + emits saving → saved', async () => {
    const onSaveStatus = vi.fn()
    render(<AdminEditor schemaKey="news" onSaveStatus={onSaveStatus} />)
    await waitFor(() => expect(screen.getByText('样例公告')).toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: /^编辑$/ })[0])
    fireEvent.change(screen.getByLabelText(/中文标题/), { target: { value: '改后' } })
    fireEvent.click(screen.getByRole('button', { name: /^保存$/ }))
    await waitFor(() => expect(api.updateNews).toHaveBeenCalled())
    expect(api.updateNews.mock.calls[0][0]).toBe(1)
    expect(api.updateNews.mock.calls[0][1].title_zh).toBe('改后')
    await waitFor(() =>
      expect(onSaveStatus).toHaveBeenCalledWith(expect.objectContaining({ status: 'saving' })),
    )
    await waitFor(() =>
      expect(onSaveStatus).toHaveBeenCalledWith(expect.objectContaining({ status: 'saved' })),
    )
  })

  it('create new calls createNews', async () => {
    render(<AdminEditor schemaKey="news" />)
    await waitFor(() => expect(screen.getByText('样例公告')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /\+ 新建资讯/ }))
    fireEvent.change(screen.getByLabelText(/中文标题/), { target: { value: '新公告' } })
    fireEvent.change(screen.getByLabelText(/正文/), { target: { value: 'body' } })
    fireEvent.click(screen.getByRole('button', { name: /^保存$/ }))
    await waitFor(() => expect(api.createNews).toHaveBeenCalled())
    const body = api.createNews.mock.calls[0][0]
    expect(body.title_zh).toBe('新公告')
    expect(body.body_md).toBe('body')
  })

  it('delete confirms, calls deleteNews, refreshes', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<AdminEditor schemaKey="news" />)
    await waitFor(() => expect(screen.getByText('样例公告')).toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: /删除 1/ })[0])
    expect(confirm).toHaveBeenCalled()
    await waitFor(() => expect(api.deleteNews).toHaveBeenCalledWith(1))
  })

  it('delete cancel does not call deleteNews', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<AdminEditor schemaKey="news" />)
    await waitFor(() => expect(screen.getByText('样例公告')).toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: /删除 1/ })[0])
    expect(api.deleteNews).not.toHaveBeenCalled()
  })

  it('401 from list → onAuthExpired', async () => {
    api.adminListNews.mockReset().mockRejectedValue(new api.ApiError('GET 401', { status: 401 }))
    const onAuthExpired = vi.fn()
    render(<AdminEditor schemaKey="news" onAuthExpired={onAuthExpired} />)
    await waitFor(() => expect(onAuthExpired).toHaveBeenCalled())
  })

  it('403 from list → onForbidden', async () => {
    api.adminListNews.mockReset().mockRejectedValue(new api.ApiError('GET 403', { status: 403 }))
    const onForbidden = vi.fn()
    render(<AdminEditor schemaKey="news" onForbidden={onForbidden} />)
    await waitFor(() => expect(onForbidden).toHaveBeenCalled())
  })

  it('500 from list → shows error, retry button reloads', async () => {
    api.adminListNews
      .mockReset()
      .mockRejectedValueOnce(new api.ApiError('GET 500', { status: 500 }))
      .mockResolvedValueOnce({ items: [NEWS_ROW], total: 1 })
    render(<AdminEditor schemaKey="news" />)
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/服务器错误/))
    fireEvent.click(screen.getByRole('button', { name: /重试/ }))
    await waitFor(() => expect(screen.getByText('样例公告')).toBeInTheDocument())
  })

  it('save 409 conflict shows error message', async () => {
    api.updateNews
      .mockReset()
      .mockRejectedValue(new api.ApiError('409', { status: 409, code: 'unique_violation' }))
    render(<AdminEditor schemaKey="news" />)
    await waitFor(() => expect(screen.getByText('样例公告')).toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: /^编辑$/ })[0])
    fireEvent.change(screen.getByLabelText(/中文标题/), { target: { value: 'X' } })
    fireEvent.click(screen.getByRole('button', { name: /^保存$/ }))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/别名已被使用/),
    )
  })
})

describe('<AdminEditor /> events', () => {
  beforeEach(() => {
    api.adminListEvents.mockResolvedValue({
      items: [
        {
          id: 5,
          slug: 'live',
          title_zh: '现场',
          title_en: 'Live',
          description_md: null,
          hero_image_url: null,
          start_at: 1700000000,
          end_at: null,
          venue: 'Hall',
          city: 'LA',
          scope: 'upcoming',
          ticket_url: null,
          band_theme: null,
          created_at: 1700000000,
          updated_at: 1700000000,
        },
      ],
      total: 1,
    })
    api.createEvent.mockResolvedValue({ id: 6 })
    api.updateEvent.mockResolvedValue({ id: 5 })
  })
  afterEach(() => vi.clearAllMocks())

  it('lists events and edits city', async () => {
    render(<AdminEditor schemaKey="events" />)
    await waitFor(() => expect(screen.getByText('现场')).toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: /^编辑$/ })[0])
    fireEvent.change(screen.getByLabelText(/^城市/), { target: { value: 'Tokyo' } })
    fireEvent.click(screen.getByRole('button', { name: /^保存$/ }))
    await waitFor(() => expect(api.updateEvent).toHaveBeenCalled())
    expect(api.updateEvent.mock.calls[0][1].city).toBe('Tokyo')
  })
})

describe('<AdminEditor /> members', () => {
  beforeEach(() => {
    api.adminListMembers.mockResolvedValue({
      items: [
        {
          id: 9,
          display_name: '阿三',
          city: 'NYC',
          oshi_character: null,
          oshi_band: 'Roselia',
          avatar_url: null,
          expedition_member: 1,
          created_at: 1700000000,
          updated_at: 1700000000,
        },
      ],
      total: 1,
    })
    api.createMember.mockResolvedValue({ id: 10 })
    api.updateMember.mockResolvedValue({ id: 9 })
  })
  afterEach(() => vi.clearAllMocks())

  it('renders member list, edits expedition flag', async () => {
    render(<AdminEditor schemaKey="members" />)
    await waitFor(() => expect(screen.getByText('阿三')).toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: /^编辑$/ })[0])
    const cb = screen.getByLabelText(/远征组/)
    expect(cb).toBeChecked()
    fireEvent.click(cb)
    fireEvent.click(screen.getByRole('button', { name: /^保存$/ }))
    await waitFor(() => expect(api.updateMember).toHaveBeenCalled())
    expect(api.updateMember.mock.calls[0][1].expedition_member).toBe(false)
  })
})

describe('<AdminEditor /> R5.5 enhancements (news)', () => {
  beforeEach(() => {
    api.adminListNews.mockResolvedValue({ items: [NEWS_ROW], total: 1 })
    api.createNews.mockResolvedValue({ ...NEWS_ROW, id: 2 })
    api.updateNews.mockResolvedValue(NEWS_ROW)
    api.checkSlug.mockReset().mockResolvedValue({ available: true })
    window.localStorage.clear()
  })
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('slug auto-fills from title_zh on new-post form', async () => {
    render(<AdminEditor schemaKey="news" />)
    await waitFor(() => expect(screen.getByText('样例公告')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /\+ 新建资讯/ }))
    const titleInput = screen.getByLabelText(/中文标题/)
    fireEvent.change(titleInput, { target: { value: 'Hello World' } })
    const slugInput = screen.getByLabelText(/别名 \(Slug\)/)
    await waitFor(() => expect(slugInput.value).toBe('hello-world'))
  })

  it('slug auto-fill stops once user manually edits slug', async () => {
    render(<AdminEditor schemaKey="news" />)
    await waitFor(() => expect(screen.getByText('样例公告')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /\+ 新建资讯/ }))
    const slugInput = screen.getByLabelText(/别名 \(Slug\)/)
    fireEvent.change(slugInput, { target: { value: 'my-custom-slug' } })
    const titleInput = screen.getByLabelText(/中文标题/)
    fireEvent.change(titleInput, { target: { value: 'Now Different' } })
    // slug should NOT auto-update since user already touched it
    expect(slugInput.value).toBe('my-custom-slug')
  })

  it('slug-taken status shows inline error from check-slug', async () => {
    api.checkSlug.mockReset().mockResolvedValue({ available: false })
    render(<AdminEditor schemaKey="news" />)
    await waitFor(() => expect(screen.getByText('样例公告')).toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: /^编辑$/ })[0])
    const slugInput = screen.getByLabelText(/别名 \(Slug\)/)
    fireEvent.change(slugInput, { target: { value: 'taken-slug' } })
    await waitFor(() =>
      expect(screen.getByText(/Slug already taken|已被占用/)).toBeInTheDocument(),
    )
    // Save button disabled while taken
    expect(screen.getByRole('button', { name: /^保存$/ })).toBeDisabled()
  })

  it('parsed tag chips appear when body contains #hashtag', async () => {
    render(<AdminEditor schemaKey="news" />)
    await waitFor(() => expect(screen.getByText('样例公告')).toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: /^编辑$/ })[0])
    const bodyTa = screen.getByLabelText(/正文/)
    fireEvent.change(bodyTa, { target: { value: 'Some text\n#concert and #public-event tagged' } })
    await waitFor(() => expect(screen.getByText('#concert')).toBeInTheDocument())
    expect(screen.getByText('#public-event')).toBeInTheDocument()
  })

  it('hero image auto-detected from body image markdown', async () => {
    render(<AdminEditor schemaKey="news" />)
    await waitFor(() => expect(screen.getByText('样例公告')).toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: /^编辑$/ })[0])
    const bodyTa = screen.getByLabelText(/正文/)
    fireEvent.change(bodyTa, {
      target: { value: '![hero](https://cdn.bangdream.org/news/auto.png)\nbody text' },
    })
    // The hero URL field should auto-populate
    await waitFor(() => {
      const heroInput = document.querySelector('input[aria-label="主图 URL"]')
      expect(heroInput?.value).toBe('https://cdn.bangdream.org/news/auto.png')
    })
    // Hint text appears
    await waitFor(() =>
      expect(screen.getByText(/auto-detected|已从正文/)).toBeInTheDocument(),
    )
  })

  it('hero auto-detect does NOT overwrite user-set hero', async () => {
    const NEWS_WITH_HERO = { ...NEWS_ROW, hero_image_url: 'https://cdn.bangdream.org/news/manual.png' }
    api.adminListNews.mockReset().mockResolvedValue({ items: [NEWS_WITH_HERO], total: 1 })
    render(<AdminEditor schemaKey="news" />)
    await waitFor(() => expect(screen.getByText('样例公告')).toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: /^编辑$/ })[0])
    const bodyTa = screen.getByLabelText(/正文/)
    fireEvent.change(bodyTa, {
      target: { value: '![other](https://cdn.bangdream.org/news/other.png)' },
    })
    // Hero should still be the manual one (not overwritten)
    const heroInput = document.querySelector('input[aria-label="主图 URL"]')
    expect(heroInput.value).toBe('https://cdn.bangdream.org/news/manual.png')
  })

  it('autosave persists draft to localStorage on form change', async () => {
    vi.useFakeTimers()
    try {
      render(<AdminEditor schemaKey="news" />)
      await vi.advanceTimersToNextTimerAsync()
      // Simulate finishing the load
      await vi.runAllTimersAsync()
    } finally {
      vi.useRealTimers()
    }
    await waitFor(() => expect(screen.getByText('样例公告')).toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: /^编辑$/ })[0])
    fireEvent.change(screen.getByLabelText(/中文标题/), { target: { value: '新标题草稿' } })
    // Wait for autosave debounce (1s default)
    await waitFor(
      () => {
        const stored = window.localStorage.getItem('admin:draft:news:1')
        expect(stored).not.toBeNull()
        const parsed = JSON.parse(stored)
        expect(parsed.title_zh).toBe('新标题草稿')
      },
      { timeout: 2000 },
    )
  })

  it('restore banner appears when draft exists in localStorage', async () => {
    window.localStorage.setItem(
      'admin:draft:news:1',
      JSON.stringify({ ...NEWS_ROW, title_zh: '已保存的草稿', tags_csv: '' }),
    )
    render(<AdminEditor schemaKey="news" />)
    await waitFor(() => expect(screen.getByText('样例公告')).toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: /^编辑$/ })[0])
    await waitFor(() =>
      expect(screen.getByText(/Unsaved draft|未保存草稿/)).toBeInTheDocument(),
    )
    expect(screen.getByRole('button', { name: /Restore|恢复/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Discard|丢弃/ })).toBeInTheDocument()
  })

  it('restore button replaces draft state', async () => {
    window.localStorage.setItem(
      'admin:draft:news:1',
      JSON.stringify({
        ...NEWS_ROW,
        title_zh: '恢复后的标题',
        slug: 'restored-slug',
        tags_csv: '',
        published_at: new Date(NEWS_ROW.published_at * 1000).toISOString(),
      }),
    )
    render(<AdminEditor schemaKey="news" />)
    await waitFor(() => expect(screen.getByText('样例公告')).toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: /^编辑$/ })[0])
    await waitFor(() =>
      expect(screen.getByText(/Unsaved draft|未保存草稿/)).toBeInTheDocument(),
    )
    fireEvent.click(screen.getByRole('button', { name: /^Restore$|^恢复$/ }))
    await waitFor(() => expect(screen.getByLabelText(/中文标题/).value).toBe('恢复后的标题'))
  })

  it('discard button clears localStorage + dismisses banner', async () => {
    window.localStorage.setItem(
      'admin:draft:news:1',
      JSON.stringify({ title_zh: '废弃' }),
    )
    render(<AdminEditor schemaKey="news" />)
    await waitFor(() => expect(screen.getByText('样例公告')).toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: /^编辑$/ })[0])
    await waitFor(() =>
      expect(screen.getByText(/Unsaved draft|未保存草稿/)).toBeInTheDocument(),
    )
    fireEvent.click(screen.getByRole('button', { name: /^Discard$|^丢弃$/ }))
    expect(screen.queryByText(/Unsaved draft|未保存草稿/)).toBeNull()
    expect(window.localStorage.getItem('admin:draft:news:1')).toBeNull()
  })

  it('save success clears localStorage draft', async () => {
    window.localStorage.setItem('admin:draft:news:1', JSON.stringify({ title_zh: 'old' }))
    render(<AdminEditor schemaKey="news" />)
    await waitFor(() => expect(screen.getByText('样例公告')).toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: /^编辑$/ })[0])
    fireEvent.change(screen.getByLabelText(/中文标题/), { target: { value: 'X' } })
    fireEvent.click(screen.getByRole('button', { name: /^保存$/ }))
    await waitFor(() => expect(api.updateNews).toHaveBeenCalled())
    await waitFor(() => expect(window.localStorage.getItem('admin:draft:news:1')).toBeNull())
  })
})

describe('<AdminEditor /> R5.5 enhancements (members role)', () => {
  const MEMBER_ROW_WITH_ROLE = {
    id: 9,
    display_name: '组织者一号',
    city: 'NYC',
    oshi_character: null,
    oshi_band: 'Roselia',
    avatar_url: null,
    expedition_member: 1,
    role: 'organizer',
    created_at: 1700000000,
    updated_at: 1700000000,
  }

  beforeEach(() => {
    api.adminListMembers.mockResolvedValue({ items: [MEMBER_ROW_WITH_ROLE], total: 1 })
    api.createMember.mockResolvedValue({ id: 10 })
    api.updateMember.mockResolvedValue({ id: 9 })
  })
  afterEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
  })

  it('renders role column in members list', async () => {
    render(<AdminEditor schemaKey="members" />)
    await waitFor(() => expect(screen.getByText('组织者一号')).toBeInTheDocument())
    expect(screen.getByText('组织者')).toBeInTheDocument()
  })

  it('edit form shows role select prefilled to current value', async () => {
    render(<AdminEditor schemaKey="members" />)
    await waitFor(() => expect(screen.getByText('组织者一号')).toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: /^编辑$/ })[0])
    const roleSelect = screen.getByLabelText(/角色 \(Role\)/)
    expect(roleSelect.value).toBe('organizer')
  })

  it('changing role and saving sends new role in update body', async () => {
    render(<AdminEditor schemaKey="members" />)
    await waitFor(() => expect(screen.getByText('组织者一号')).toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: /^编辑$/ })[0])
    const roleSelect = screen.getByLabelText(/角色 \(Role\)/)
    fireEvent.change(roleSelect, { target: { value: 'alumnus' } })
    fireEvent.click(screen.getByRole('button', { name: /^保存$/ }))
    await waitFor(() => expect(api.updateMember).toHaveBeenCalled())
    expect(api.updateMember.mock.calls[0][1].role).toBe('alumnus')
  })

  it('all four role options available in select', async () => {
    render(<AdminEditor schemaKey="members" />)
    await waitFor(() => expect(screen.getByText('组织者一号')).toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: /^编辑$/ })[0])
    const roleSelect = screen.getByLabelText(/角色 \(Role\)/)
    const optionValues = Array.from(roleSelect.options).map((o) => o.value)
    expect(optionValues).toEqual(['organizer', 'member', 'alumnus', 'cover-band-lead'])
  })
})

describe('<AdminEditor /> categories', () => {
  beforeEach(() => {
    api.adminListCategories.mockResolvedValue({
      items: [
        {
          id: 3,
          slug: 'announcement',
          display_zh: '公告',
          display_en: 'Announcement',
          accent_color: null,
          sort_order: 1,
          active: 1,
          created_at: 1700000000,
          updated_at: 1700000000,
        },
      ],
    })
    api.createCategory.mockResolvedValue({ id: 4 })
    api.updateCategory.mockResolvedValue({ id: 3 })
    api.deleteCategory.mockResolvedValue(null)
  })
  afterEach(() => vi.clearAllMocks())

  it('renders category list', async () => {
    render(<AdminEditor schemaKey="categories" />)
    await waitFor(() => expect(screen.getByText('announcement')).toBeInTheDocument())
  })

  it('edits display_zh', async () => {
    render(<AdminEditor schemaKey="categories" />)
    await waitFor(() => expect(screen.getByText('announcement')).toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: /^编辑$/ })[0])
    fireEvent.change(screen.getByLabelText(/中文显示/), { target: { value: '改公告' } })
    fireEvent.click(screen.getByRole('button', { name: /^保存$/ }))
    await waitFor(() => expect(api.updateCategory).toHaveBeenCalled())
    expect(api.updateCategory.mock.calls[0][1].display_zh).toBe('改公告')
  })
})
