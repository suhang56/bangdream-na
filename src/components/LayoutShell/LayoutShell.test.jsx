import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import LayoutShell from './LayoutShell.jsx'
import * as api from '../../lib/api.js'
import { _resetForTests, setLanguage } from '../../lib/uiLanguage.js'

function renderShell(children) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <LayoutShell>{children}</LayoutShell>
    </MemoryRouter>,
  )
}

describe('<LayoutShell />', () => {
  beforeEach(() => {
    _resetForTests()
    setLanguage('zh')
    vi.spyOn(api, 'fetchSite').mockResolvedValue({ items: [] })
    vi.spyOn(api, 'fetchSocial').mockResolvedValue({ items: [], total: 0 })
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('mounts UtilityBar, Masthead, PrimaryNav, Footer around children', async () => {
    const { container } = renderShell(<main data-testid="page">PAGE</main>)
    await waitFor(() => {
      expect(container.querySelector('.bf-utility')).toBeInTheDocument()
      expect(container.querySelector('.bf-mast')).toBeInTheDocument()
      expect(container.querySelector('.bf-nav')).toBeInTheDocument()
      expect(container.querySelector('.bf-foot')).toBeInTheDocument()
      expect(container.querySelector('[data-testid="page"]')).toBeInTheDocument()
    })
  })

  it('shell wrapper uses bf-shell class', () => {
    const { container } = renderShell(<div>x</div>)
    expect(container.querySelector('.bf-shell')).toBeInTheDocument()
  })

  it('does NOT mount BandSwitcher', () => {
    const { container } = renderShell(<div>x</div>)
    expect(container.querySelector('.bf-bands')).toBeNull()
    expect(container.querySelector('.bf-band')).toBeNull()
  })
})
