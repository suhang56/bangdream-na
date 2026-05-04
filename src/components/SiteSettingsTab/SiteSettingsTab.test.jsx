import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('../../lib/api.js', async () => {
  const actual = await vi.importActual('../../lib/api.js')
  return {
    ...actual,
    adminListSettings: vi.fn(),
    putAdminSetting: vi.fn(),
  }
})

import SiteSettingsTab from './SiteSettingsTab.jsx'
import * as api from '../../lib/api.js'
import { _resetForTests, setLanguage } from '../../lib/uiLanguage.js'

describe('<SiteSettingsTab />', () => {
  beforeEach(() => {
    _resetForTests()
    setLanguage('zh')
    api.adminListSettings.mockReset()
    api.putAdminSetting.mockReset()
  })
  afterEach(() => {
    _resetForTests()
  })

  it('renders the 4 default site.* keys when list endpoint returns empty', async () => {
    api.adminListSettings.mockResolvedValue({ items: [] })
    render(<SiteSettingsTab />)
    await waitFor(() =>
      expect(screen.getByLabelText(/site\.communityName$/)).toBeInTheDocument(),
    )
    expect(screen.getByLabelText(/site\.communityNameZh$/)).toBeInTheDocument()
    expect(screen.getByLabelText(/site\.communityNameJp$/)).toBeInTheDocument()
    expect(screen.getByLabelText(/site\.discordInvite$/)).toBeInTheDocument()
    expect(api.adminListSettings).toHaveBeenCalledWith('site.')
  })

  it('hydrates inputs from adminListSettings response', async () => {
    api.adminListSettings.mockResolvedValue({
      items: [
        { key: 'site.communityName', value: 'BanG NA' },
        { key: 'site.communityNameZh', value: '北美邦' },
      ],
    })
    render(<SiteSettingsTab />)
    await waitFor(() =>
      expect(screen.getByLabelText(/site\.communityName$/)).toHaveValue('BanG NA'),
    )
    expect(screen.getByLabelText(/site\.communityNameZh$/)).toHaveValue('北美邦')
    // Unset keys remain empty.
    expect(screen.getByLabelText(/site\.communityNameJp$/)).toHaveValue('')
  })

  it('saves a row via putAdminSetting on its save button click', async () => {
    api.adminListSettings.mockResolvedValue({ items: [] })
    api.putAdminSetting.mockResolvedValue({
      key: 'site.communityName',
      value: 'New Name',
      updated_at: 1,
    })
    render(<SiteSettingsTab />)
    const input = await screen.findByLabelText(/site\.communityName$/)
    fireEvent.change(input, { target: { value: 'New Name' } })
    const row = input.closest('.admin-settings__row')
    expect(row).not.toBeNull()
    fireEvent.click(row.querySelector('button'))
    await waitFor(() =>
      expect(api.putAdminSetting).toHaveBeenCalledWith(
        'site.communityName',
        'New Name',
      ),
    )
  })

  it('shows saved badge after successful row save', async () => {
    api.adminListSettings.mockResolvedValue({ items: [] })
    api.putAdminSetting.mockResolvedValue({ key: 'site.communityName', value: 'X' })
    render(<SiteSettingsTab />)
    const input = await screen.findByLabelText(/site\.communityName$/)
    fireEvent.change(input, { target: { value: 'X' } })
    const row = input.closest('.admin-settings__row')
    fireEvent.click(row.querySelector('button'))
    await waitFor(() =>
      expect(row.querySelector('.admin-settings__status--ok')).not.toBeNull(),
    )
  })

  it('triggers onAuthExpired on 401 from list', async () => {
    const onAuthExpired = vi.fn()
    api.adminListSettings.mockRejectedValue(
      new api.ApiError('401', { status: 401, code: 'unauthenticated' }),
    )
    render(<SiteSettingsTab onAuthExpired={onAuthExpired} />)
    await waitFor(() => expect(onAuthExpired).toHaveBeenCalled())
  })

  it('triggers onForbidden on 403 from list', async () => {
    const onForbidden = vi.fn()
    api.adminListSettings.mockRejectedValue(
      new api.ApiError('403', { status: 403, code: 'forbidden' }),
    )
    render(<SiteSettingsTab onForbidden={onForbidden} />)
    await waitFor(() => expect(onForbidden).toHaveBeenCalled())
  })

  it('shows error message when save fails', async () => {
    api.adminListSettings.mockResolvedValue({ items: [] })
    api.putAdminSetting.mockRejectedValue(
      new api.ApiError('400', { status: 400, code: 'bad_request' }),
    )
    render(<SiteSettingsTab />)
    const input = await screen.findByLabelText(/site\.communityName$/)
    fireEvent.change(input, { target: { value: 'whatever' } })
    const row = input.closest('.admin-settings__row')
    fireEvent.click(row.querySelector('button'))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toBeInTheDocument(),
    )
  })

  it('only triggers a single PUT for the clicked key (does not save siblings)', async () => {
    api.adminListSettings.mockResolvedValue({ items: [] })
    api.putAdminSetting.mockResolvedValue({ key: 'site.communityNameZh', value: 'X' })
    render(<SiteSettingsTab />)
    const target = await screen.findByLabelText(/site\.communityNameZh$/)
    fireEvent.change(target, { target: { value: '北美邦' } })
    const row = target.closest('.admin-settings__row')
    fireEvent.click(row.querySelector('button'))
    await waitFor(() => expect(api.putAdminSetting).toHaveBeenCalledTimes(1))
    expect(api.putAdminSetting).toHaveBeenCalledWith(
      'site.communityNameZh',
      '北美邦',
    )
  })
})
