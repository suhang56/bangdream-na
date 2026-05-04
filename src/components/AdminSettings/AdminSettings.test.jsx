import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('../../lib/api.js', async () => {
  const actual = await vi.importActual('../../lib/api.js')
  return {
    ...actual,
    getAdminSetting: vi.fn(),
    putAdminSetting: vi.fn(),
    testAdminWebhook: vi.fn(),
  }
})

import AdminSettings from './AdminSettings.jsx'
import * as api from '../../lib/api.js'
import { _resetForTests, setLanguage } from '../../lib/uiLanguage.js'

describe('<AdminSettings />', () => {
  beforeEach(() => {
    _resetForTests()
    setLanguage('zh')
    api.getAdminSetting.mockReset()
    api.putAdminSetting.mockReset()
    api.testAdminWebhook.mockReset()
  })
  afterEach(() => {
    _resetForTests()
  })

  it('loads existing setting and populates input', async () => {
    api.getAdminSetting.mockResolvedValue({
      key: 'webhook.comment.url',
      value: 'https://discord.com/api/webhooks/1/abc',
      updated_at: 1700000000,
    })
    render(<AdminSettings />)
    await waitFor(() => {
      const input = screen.getByLabelText(/评论 Webhook URL/)
      expect(input).toHaveValue('https://discord.com/api/webhooks/1/abc')
    })
  })

  it('renders empty input when no setting saved (404 → null)', async () => {
    api.getAdminSetting.mockResolvedValue(null)
    render(<AdminSettings />)
    await waitFor(() => {
      const input = screen.getByLabelText(/评论 Webhook URL/)
      expect(input).toHaveValue('')
    })
  })

  it('save button submits putAdminSetting and shows saved status', async () => {
    api.getAdminSetting.mockResolvedValue(null)
    api.putAdminSetting.mockResolvedValue({
      key: 'webhook.comment.url',
      value: 'https://x.com/h',
      updated_at: 1,
    })
    render(<AdminSettings />)
    await waitFor(() => expect(screen.getByLabelText(/评论 Webhook URL/)).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText(/评论 Webhook URL/), {
      target: { value: 'https://x.com/h' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^保存$/ }))
    await waitFor(() =>
      expect(api.putAdminSetting).toHaveBeenCalledWith(
        'webhook.comment.url',
        'https://x.com/h',
      ),
    )
    await waitFor(() => expect(screen.getByText(/已保存/)).toBeInTheDocument())
  })

  it('shows error message on save failure', async () => {
    api.getAdminSetting.mockResolvedValue(null)
    api.putAdminSetting.mockRejectedValue(
      new api.ApiError('400', { status: 400, code: 'bad_request' }),
    )
    render(<AdminSettings />)
    await waitFor(() => expect(screen.getByLabelText(/评论 Webhook URL/)).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText(/评论 Webhook URL/), {
      target: { value: 'https://example.com/bad' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^保存$/ }))
    await waitFor(() => expect(api.putAdminSetting).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/保存失败/))
  })

  it('test button is disabled until URL entered', async () => {
    api.getAdminSetting.mockResolvedValue(null)
    render(<AdminSettings />)
    await waitFor(() => expect(screen.getByLabelText(/评论 Webhook URL/)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /测试 Webhook/ })).toBeDisabled()
  })

  it('test button calls testAdminWebhook and shows success', async () => {
    api.getAdminSetting.mockResolvedValue({
      key: 'webhook.comment.url',
      value: 'https://x.com/h',
      updated_at: 1,
    })
    api.testAdminWebhook.mockResolvedValue({ ok: true, url: 'https://x.com/h' })
    render(<AdminSettings />)
    await waitFor(() => {
      expect(screen.getByLabelText(/评论 Webhook URL/)).toHaveValue('https://x.com/h')
    })
    fireEvent.click(screen.getByRole('button', { name: /测试 Webhook/ }))
    await waitFor(() => expect(api.testAdminWebhook).toHaveBeenCalled())
    await waitFor(() =>
      expect(screen.getByText(/测试已发送/)).toBeInTheDocument(),
    )
  })

  it('shows test failure error on 422', async () => {
    api.getAdminSetting.mockResolvedValue({
      key: 'webhook.comment.url',
      value: 'https://x.com/h',
      updated_at: 1,
    })
    api.testAdminWebhook.mockRejectedValue(
      new api.ApiError('422', { status: 422, code: 'webhook_url_invalid_or_missing' }),
    )
    render(<AdminSettings />)
    await waitFor(() => {
      expect(screen.getByLabelText(/评论 Webhook URL/)).toHaveValue('https://x.com/h')
    })
    fireEvent.click(screen.getByRole('button', { name: /测试 Webhook/ }))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/测试失败/),
    )
  })

  it('triggers onAuthExpired on 401', async () => {
    const onAuthExpired = vi.fn()
    api.getAdminSetting.mockRejectedValue(
      new api.ApiError('401', { status: 401, code: 'unauthorized' }),
    )
    render(<AdminSettings onAuthExpired={onAuthExpired} />)
    await waitFor(() => expect(onAuthExpired).toHaveBeenCalled())
  })

  it('triggers onForbidden on 403', async () => {
    const onForbidden = vi.fn()
    api.getAdminSetting.mockRejectedValue(
      new api.ApiError('403', { status: 403, code: 'forbidden' }),
    )
    render(<AdminSettings onForbidden={onForbidden} />)
    await waitFor(() => expect(onForbidden).toHaveBeenCalled())
  })
})
