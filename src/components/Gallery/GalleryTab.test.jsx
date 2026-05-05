import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../lib/api.js', () => {
  return {
    ApiError: class ApiError extends Error {
      constructor(msg, opts = {}) {
        super(msg)
        this.status = opts.status ?? 0
        this.code = opts.code ?? null
        this.body = opts.body ?? null
      }
    },
    adminListGallery: vi.fn(),
    adminListEvents: vi.fn(),
    createGalleryItem: vi.fn(),
    deleteGalleryItem: vi.fn(),
    uploadImage: vi.fn(),
  }
})

import {
  adminListEvents,
  adminListGallery,
  createGalleryItem,
  deleteGalleryItem,
  uploadImage,
} from '../../lib/api.js'
import GalleryTab from './GalleryTab.jsx'

const realCreateObjectURL = URL.createObjectURL
const realRevokeObjectURL = URL.revokeObjectURL

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:mock')
  URL.revokeObjectURL = vi.fn()
  adminListGallery.mockResolvedValue({ items: [], total: 0 })
  adminListEvents.mockResolvedValue({
    items: [{ id: 7, slug: 'meet', title_zh: '聚会' }],
  })
  createGalleryItem.mockResolvedValue({ id: 1 })
  deleteGalleryItem.mockResolvedValue(null)
  uploadImage.mockResolvedValue({
    url: 'https://cdn/x.jpg',
    key: 'gallery/x.jpg',
  })
})

afterEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = realCreateObjectURL
  URL.revokeObjectURL = realRevokeObjectURL
})

function makeFile(name = 'a.jpg') {
  return new File(['x'], name, { type: 'image/jpeg' })
}

describe('<GalleryTab />', () => {
  it('initial render fetches gallery + events', async () => {
    render(<GalleryTab />)
    await waitFor(() => expect(adminListGallery).toHaveBeenCalled())
    expect(adminListEvents).toHaveBeenCalled()
  })

  it('file picker change adds a pending item with object URL preview', async () => {
    const { container } = render(<GalleryTab />)
    await waitFor(() => expect(adminListGallery).toHaveBeenCalled())
    const input = container.querySelector('[data-testid="gallery-file-input"]')
    fireEvent.change(input, { target: { files: [makeFile('p1.jpg')] } })
    expect(URL.createObjectURL).toHaveBeenCalled()
    expect(await screen.findByText(/1 张待上传/)).toBeTruthy()
  })

  it('mutually exclusive event/album radio: switching wipes the unselected field', async () => {
    const { container } = render(<GalleryTab />)
    await waitFor(() => expect(adminListGallery).toHaveBeenCalled())
    const input = container.querySelector('[data-testid="gallery-file-input"]')
    fireEvent.change(input, { target: { files: [makeFile('p2.jpg')] } })
    await screen.findByText(/1 张待上传/)
    // Default source is 'event'. Pick album, type, then back to event.
    fireEvent.click(screen.getByLabelText('自由相册'))
    const albumInput = screen.getByPlaceholderText('相册名称')
    fireEvent.change(albumInput, { target: { value: '随手' } })
    fireEvent.click(screen.getByLabelText('关联活动'))
    fireEvent.click(screen.getByLabelText('自由相册'))
    // Album should be cleared after the event switch wiped it
    expect(screen.getByPlaceholderText('相册名称').value).toBe('')
  })

  it('全部提交 with one event-source pending item: upload + create called, then refresh', async () => {
    const { container } = render(<GalleryTab />)
    await waitFor(() => expect(adminListGallery).toHaveBeenCalled())
    const input = container.querySelector('[data-testid="gallery-file-input"]')
    fireEvent.change(input, { target: { files: [makeFile('p3.jpg')] } })
    await screen.findByText(/1 张待上传/)
    fireEvent.change(screen.getByLabelText('选择活动'), {
      target: { value: '7' },
    })
    fireEvent.click(screen.getByText('全部提交'))
    await waitFor(() => expect(uploadImage).toHaveBeenCalled())
    expect(uploadImage.mock.calls[0][1]).toBe('gallery')
    expect(createGalleryItem).toHaveBeenCalled()
    expect(createGalleryItem.mock.calls[0][0].event_id).toBe(7)
    // Pending list emptied
    await waitFor(() =>
      expect(screen.queryByText(/张待上传/)).toBeNull(),
    )
  })

  it('partial failure: one item fails, error pill + retry button shown', async () => {
    uploadImage
      .mockResolvedValueOnce({ url: 'https://cdn/ok.jpg' })
      .mockRejectedValueOnce(new Error('upload boom'))
    const { container } = render(<GalleryTab />)
    await waitFor(() => expect(adminListGallery).toHaveBeenCalled())
    const input = container.querySelector('[data-testid="gallery-file-input"]')
    fireEvent.change(input, {
      target: { files: [makeFile('a.jpg'), makeFile('b.jpg')] },
    })
    await screen.findByText(/2 张待上传/)
    // Set both to album so we don't need the event select
    const radios = screen.getAllByLabelText('自由相册')
    radios.forEach((r) => fireEvent.click(r))
    const albumInputs = screen.getAllByPlaceholderText('相册名称')
    albumInputs.forEach((a, i) => fireEvent.change(a, { target: { value: `album-${i}` } }))
    fireEvent.click(screen.getByText('全部提交'))
    await waitFor(() => expect(screen.queryByText('上传失败')).toBeTruthy())
    expect(screen.getByText('重试')).toBeTruthy()
  })

  it('delete confirmation inline: 确认删除 fires deleteGalleryItem', async () => {
    adminListGallery.mockResolvedValueOnce({
      items: [
        {
          id: 99,
          image_url: 'https://cdn/x.jpg',
          caption: '',
          taken_at: 1700000000,
          event_id: null,
          event_slug: null,
          event_title_zh: null,
          album: 'a',
          sort_order: 0,
          created_at: 1,
          updated_at: 1,
        },
      ],
      total: 1,
    })
    render(<GalleryTab />)
    await waitFor(() => expect(adminListGallery).toHaveBeenCalled())
    const delBtn = await screen.findByLabelText('删除照片')
    fireEvent.click(delBtn)
    fireEvent.click(screen.getByText('确认删除'))
    await waitFor(() => expect(deleteGalleryItem).toHaveBeenCalledWith(99))
  })

  it('removes pending item without uploading on × click', async () => {
    const { container } = render(<GalleryTab />)
    await waitFor(() => expect(adminListGallery).toHaveBeenCalled())
    const input = container.querySelector('[data-testid="gallery-file-input"]')
    fireEvent.change(input, { target: { files: [makeFile('drop.jpg')] } })
    await screen.findByText(/1 张待上传/)
    fireEvent.click(screen.getByLabelText('移除'))
    expect(screen.queryByText(/张待上传/)).toBeNull()
  })

  it('calls onAuthExpired on 401 list error', async () => {
    const { ApiError } = await import('../../lib/api.js')
    adminListGallery.mockRejectedValueOnce(new ApiError('boom', { status: 401 }))
    const onAuthExpired = vi.fn()
    render(<GalleryTab onAuthExpired={onAuthExpired} />)
    await waitFor(() => expect(onAuthExpired).toHaveBeenCalled())
  })
})
