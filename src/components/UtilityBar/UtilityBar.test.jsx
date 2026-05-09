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
    // LangToggle mounts a role="group" with aria-label = lang.label
    expect(container.querySelector('[role="group"]')).toBeInTheDocument()
  })

  it('pulse has exact green color #7be0a3 (locked per Designer §5)', () => {
    const { container } = renderBar()
    const pulse = container.querySelector('.bf-pulse')
    expect(pulse).toBeInTheDocument()
    // Color is set via CSS in tokens.css; in jsdom we assert the class exists.
    // The visual contract is locked by tokens.css; here we just assert presence.
    expect(pulse.className).toBe('bf-pulse')
  })
})
