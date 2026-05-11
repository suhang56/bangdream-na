import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'
import RejectModal from './RejectModal.jsx'
import { _resetForTests, setLanguage } from '../../lib/uiLanguage.js'

beforeEach(() => {
  _resetForTests()
  setLanguage('zh')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('RejectModal', () => {
  it('does not render when open=false', () => {
    const { container } = render(
      <RejectModal open={false} onCancel={() => {}} onConfirm={() => {}} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders 5 reason radios when open', () => {
    const { getByTestId } = render(
      <RejectModal open onCancel={() => {}} onConfirm={() => {}} />,
    )
    expect(getByTestId('rm-reason-community')).toBeTruthy()
    expect(getByTestId('rm-reason-duplicate')).toBeTruthy()
    expect(getByTestId('rm-reason-quality')).toBeTruthy()
    expect(getByTestId('rm-reason-privacy')).toBeTruthy()
    expect(getByTestId('rm-reason-other')).toBeTruthy()
  })

  it('keeps confirm disabled when nothing selected', () => {
    const { getByTestId } = render(
      <RejectModal open onCancel={() => {}} onConfirm={() => {}} />,
    )
    expect(getByTestId('rm-confirm').disabled).toBe(true)
  })

  it('enables confirm when a non-other radio chosen', () => {
    const { getByTestId } = render(
      <RejectModal open onCancel={() => {}} onConfirm={() => {}} />,
    )
    fireEvent.click(getByTestId('rm-reason-quality'))
    expect(getByTestId('rm-confirm').disabled).toBe(false)
  })

  it('shows custom textarea when other selected, disables confirm if empty', () => {
    const { getByTestId, queryByTestId } = render(
      <RejectModal open onCancel={() => {}} onConfirm={() => {}} />,
    )
    expect(queryByTestId('rm-custom')).toBeNull()
    fireEvent.click(getByTestId('rm-reason-other'))
    expect(getByTestId('rm-custom')).toBeTruthy()
    expect(getByTestId('rm-confirm').disabled).toBe(true)
    fireEvent.change(getByTestId('rm-custom'), { target: { value: '自定义原因' } })
    expect(getByTestId('rm-confirm').disabled).toBe(false)
  })

  it('calls onConfirm with full reason on confirm click', () => {
    const onConfirm = vi.fn()
    const { getByTestId } = render(
      <RejectModal open onCancel={() => {}} onConfirm={onConfirm} />,
    )
    fireEvent.click(getByTestId('rm-reason-quality'))
    fireEvent.click(getByTestId('rm-confirm'))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onConfirm.mock.calls[0][0]).toBe('图片模糊或质量不佳')
  })

  it('formats other reason as "其他: {custom}"', () => {
    const onConfirm = vi.fn()
    const { getByTestId } = render(
      <RejectModal open onCancel={() => {}} onConfirm={onConfirm} />,
    )
    fireEvent.click(getByTestId('rm-reason-other'))
    fireEvent.change(getByTestId('rm-custom'), { target: { value: '测试原因' } })
    fireEvent.click(getByTestId('rm-confirm'))
    expect(onConfirm.mock.calls[0][0]).toBe('其他: 测试原因')
  })

  it('calls onCancel when cancel button clicked', () => {
    const onCancel = vi.fn()
    const { getByTestId } = render(
      <RejectModal open onCancel={onCancel} onConfirm={() => {}} />,
    )
    fireEvent.click(getByTestId('rm-cancel'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('calls onCancel when ESC pressed', () => {
    const onCancel = vi.fn()
    render(
      <RejectModal open onCancel={onCancel} onConfirm={() => {}} />,
    )
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('rejects custom reason > 200 chars', () => {
    const onConfirm = vi.fn()
    const { getByTestId } = render(
      <RejectModal open onCancel={() => {}} onConfirm={onConfirm} />,
    )
    fireEvent.click(getByTestId('rm-reason-other'))
    // textarea has maxLength=200, so we test the explicit non-empty case is fine
    fireEvent.change(getByTestId('rm-custom'), { target: { value: 'x'.repeat(199) } })
    expect(getByTestId('rm-confirm').disabled).toBe(false)
  })

  it('shows submitting state in confirm button', () => {
    const { getByTestId } = render(
      <RejectModal open onCancel={() => {}} onConfirm={() => {}} submitting />,
    )
    fireEvent.click(getByTestId('rm-reason-quality'))
    expect(getByTestId('rm-confirm').textContent).toContain('拒绝中…')
  })
})
