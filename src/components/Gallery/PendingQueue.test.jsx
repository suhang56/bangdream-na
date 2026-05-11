import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/react'
import PendingQueue from './PendingQueue.jsx'
import * as api from '../../lib/api.js'
import { ApiError } from '../../lib/api.js'
import { _resetForTests, setLanguage } from '../../lib/uiLanguage.js'

function sampleItem(overrides = {}) {
  return {
    id: 1,
    thumbnail_url: 'https://cdn.example.org/submissions/1.jpg',
    nickname: 'alice',
    caption: 'a caption',
    event: null,
    submitted_at: Math.floor(Date.now() / 1000) - 600,
    width: 800,
    height: 600,
    size_bytes: 12345,
    content_type: 'image/jpeg',
    ip_hash: 'abc',
    status: 'pending',
    reviewed_at: null,
    rejection_reason: null,
    gallery_item_id: null,
    r2_key: 'submissions/1.jpg',
    ...overrides,
  }
}

beforeEach(() => {
  _resetForTests()
  setLanguage('zh')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('PendingQueue', () => {
  it('renders loading then empty state', async () => {
    vi.spyOn(api, 'listPendingSubmissions').mockResolvedValue({
      items: [],
      next_cursor: null,
    })
    const { findByText } = render(<PendingQueue />)
    expect(await findByText('当前没有待审核照片')).toBeTruthy()
  })

  it('renders rows when items returned', async () => {
    vi.spyOn(api, 'listPendingSubmissions').mockResolvedValue({
      items: [sampleItem({ id: 1 }), sampleItem({ id: 2, nickname: 'bob' })],
      next_cursor: null,
    })
    const { findByTestId } = render(<PendingQueue />)
    expect(await findByTestId('pending-row-1')).toBeTruthy()
    expect(await findByTestId('pending-row-2')).toBeTruthy()
  })

  it('clicking approve calls api + removes row optimistically', async () => {
    vi.spyOn(api, 'listPendingSubmissions').mockResolvedValue({
      items: [sampleItem({ id: 5 })],
      next_cursor: null,
    })
    const approveSpy = vi
      .spyOn(api, 'approveSubmission')
      .mockResolvedValue({ submission_id: 5, gallery_item_id: 11 })
    const onStats = vi.fn()
    const { findByTestId, queryByTestId } = render(
      <PendingQueue onStatsChanged={onStats} />,
    )
    const approveBtn = await findByTestId('pending-approve-5')
    fireEvent.click(approveBtn)
    await waitFor(() => {
      expect(queryByTestId('pending-row-5')).toBeNull()
    })
    expect(approveSpy).toHaveBeenCalledWith(5)
    expect(onStats).toHaveBeenCalled()
  })

  it('clicking reject opens modal; confirming calls api + removes row', async () => {
    vi.spyOn(api, 'listPendingSubmissions').mockResolvedValue({
      items: [sampleItem({ id: 7 })],
      next_cursor: null,
    })
    const rejectSpy = vi
      .spyOn(api, 'rejectSubmission')
      .mockResolvedValue({ submission_id: 7, status: 'rejected' })
    const { findByTestId, queryByTestId, getByTestId } = render(<PendingQueue />)
    const rejectBtn = await findByTestId('pending-reject-7')
    fireEvent.click(rejectBtn)
    // modal opens
    expect(await findByTestId('rm-reason-quality')).toBeTruthy()
    fireEvent.click(getByTestId('rm-reason-quality'))
    fireEvent.click(getByTestId('rm-confirm'))
    await waitFor(() => {
      expect(queryByTestId('pending-row-7')).toBeNull()
    })
    expect(rejectSpy).toHaveBeenCalledWith(7, '图片模糊或质量不佳')
  })

  it('surfaces auth error via onAuthExpired', async () => {
    vi.spyOn(api, 'listPendingSubmissions').mockRejectedValue(
      new ApiError('unauth', { status: 401 }),
    )
    const onAuthExpired = vi.fn()
    render(<PendingQueue onAuthExpired={onAuthExpired} />)
    await waitFor(() => {
      expect(onAuthExpired).toHaveBeenCalledTimes(1)
    })
  })

  it('reject error surfaces inline on row', async () => {
    vi.spyOn(api, 'listPendingSubmissions').mockResolvedValue({
      items: [sampleItem({ id: 9 })],
      next_cursor: null,
    })
    vi.spyOn(api, 'rejectSubmission').mockRejectedValue(
      new ApiError('boom', { status: 500, code: 'internal_error' }),
    )
    const { findByTestId, getByTestId, findByText } = render(<PendingQueue />)
    const rejectBtn = await findByTestId('pending-reject-9')
    fireEvent.click(rejectBtn)
    fireEvent.click(getByTestId('rm-reason-quality'))
    fireEvent.click(getByTestId('rm-confirm'))
    expect(await findByText(/500 internal_error/)).toBeTruthy()
  })
})
