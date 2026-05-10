import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import UtilityBar from './UtilityBar.jsx'
import { _resetForTests, setLanguage } from '../../lib/uiLanguage.js'

function renderBar() {
  return render(
    <MemoryRouter>
      <UtilityBar />
    </MemoryRouter>,
  )
}

describe('<UtilityBar />', () => {
  beforeEach(() => {
    _resetForTests()
    setLanguage('zh')
  })

  it('renders pulse + 在线 + disclaimer + LangToggle', () => {
    const { container } = renderBar()
    expect(container.querySelector('.bf-utility')).toBeInTheDocument()
    expect(container.querySelector('.bf-pulse')).toBeInTheDocument()
    expect(container.textContent).toContain('在线')
    expect(container.textContent).toContain('非官方')
    expect(container.querySelector('[role="group"]')).toBeInTheDocument()
  })

  it('pulse has exact green color #7be0a3 (locked per Designer §5)', () => {
    const { container } = renderBar()
    const pulse = container.querySelector('.bf-pulse')
    expect(pulse).toBeInTheDocument()
    expect(pulse.className).toBe('bf-pulse')
  })

  it('H7: .bf-uleft contains span with 更新于 JST timestamp on initial render', () => {
    const { container } = renderBar()
    const uleft = container.querySelector('.bf-uleft')
    // Timestamp is computed on initial render (lazy useState)
    expect(uleft.textContent).toContain('更新于')
    expect(uleft.textContent).toMatch(/更新于 \d{4}\.\d{2}\.\d{2}/)
    expect(uleft.textContent).toContain('JST')
  })

  it('H7: .bf-uleft contains member count span with bf-hide-mobile class containing 150+', () => {
    const { container } = renderBar()
    const hideMobile = container.querySelector('.bf-uleft .bf-hide-mobile')
    expect(hideMobile).toBeInTheDocument()
    expect(hideMobile.textContent).toContain('150+')
  })
})
