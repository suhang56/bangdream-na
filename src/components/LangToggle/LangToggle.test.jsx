import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LangToggle from './LangToggle.jsx'
import {
  STORAGE_KEY,
  getLanguage,
  setLanguage,
  _resetForTests,
} from '../../lib/uiLanguage.js'

describe('<LangToggle />', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
  })

  afterEach(() => {
    _resetForTests()
    window.localStorage.clear()
  })

  it('renders 中 / EN buttons inside an aria group', () => {
    render(<LangToggle />)
    const group = screen.getByRole('group')
    expect(group).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '中' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'EN' })).toBeInTheDocument()
  })

  it('marks current lang button as aria-pressed=true', () => {
    setLanguage('zh')
    render(<LangToggle />)
    expect(screen.getByRole('button', { name: '中' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('clicking 中 sets lang to zh', async () => {
    const user = userEvent.setup()
    render(<LangToggle />)
    await user.click(screen.getByRole('button', { name: '中' }))
    expect(getLanguage()).toBe('zh')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('zh')
  })

  it('clicking EN sets lang to en', async () => {
    const user = userEvent.setup()
    setLanguage('zh')
    render(<LangToggle />)
    await user.click(screen.getByRole('button', { name: 'EN' }))
    expect(getLanguage()).toBe('en')
  })

  it('rapid toggle does not thrash state (edge)', async () => {
    const user = userEvent.setup()
    render(<LangToggle />)
    const zh = screen.getByRole('button', { name: '中' })
    const en = screen.getByRole('button', { name: 'EN' })
    await user.click(zh)
    await user.click(en)
    await user.click(zh)
    await user.click(en)
    expect(getLanguage()).toBe('en')
  })

  it('persists across reload (edge — simulated by re-mount)', () => {
    setLanguage('zh')
    const { unmount } = render(<LangToggle />)
    unmount()
    render(<LangToggle />)
    expect(screen.getByRole('button', { name: '中' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('default fallback when localStorage missing key (edge)', () => {
    window.localStorage.clear()
    render(<LangToggle />)
    const lang = getLanguage()
    expect(['en', 'zh']).toContain(lang)
  })

  it('inline variant adds modifier class', () => {
    const { container } = render(<LangToggle variant="inline" />)
    expect(container.querySelector('.lang-toggle--inline')).not.toBeNull()
  })

  it('container has aria-label and title (bilingual)', () => {
    render(<LangToggle />)
    const group = screen.getByRole('group')
    expect(group).toHaveAttribute('aria-label')
    expect(group).toHaveAttribute('title')
  })

  it('buttons carry lang attributes for screen-reader pronunciation', () => {
    render(<LangToggle />)
    expect(screen.getByRole('button', { name: '中' })).toHaveAttribute('lang', 'zh')
    expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute('lang', 'en')
  })
})
