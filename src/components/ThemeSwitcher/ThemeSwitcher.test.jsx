import { describe, it, expect, beforeEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/utils.jsx'
import ThemeSwitcher from './ThemeSwitcher.jsx'
import { themeOrder, themes } from '../../theme/themes.js'

describe('<ThemeSwitcher />', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.removeAttribute('style')
  })

  it('renders trigger button with correct aria attributes (closed)', () => {
    renderWithProviders(<ThemeSwitcher />)
    const trigger = screen.getByRole('button', { name: /choose theme/i })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveAttribute('aria-haspopup', 'true')
  })

  it('opens popover with 8 swatches on click', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ThemeSwitcher />)
    await user.click(screen.getByRole('button', { name: /choose theme/i }))
    const dialog = screen.getByRole('dialog', { name: /theme picker/i })
    expect(dialog).toBeInTheDocument()
    const swatches = within(dialog).getAllByRole('button')
    expect(swatches).toHaveLength(themeOrder.length)
  })

  it('selects theme + closes popover + applies CSS vars to :root', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ThemeSwitcher />)
    await user.click(screen.getByRole('button', { name: /choose theme/i }))
    await user.click(screen.getByRole('button', { name: /^Roselia theme$/ }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe(
      themes.roselia.tokens['--color-primary'],
    )
  })

  it('marks active swatch with aria-pressed=true', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ThemeSwitcher />)
    await user.click(screen.getByRole('button', { name: /choose theme/i }))
    const neutralSwatch = screen.getByRole('button', { name: /^Neutral theme$/ })
    expect(neutralSwatch).toHaveAttribute('aria-pressed', 'true')
  })

  it('rapid double-click on same swatch is idempotent (edge: race)', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ThemeSwitcher />)
    await user.click(screen.getByRole('button', { name: /choose theme/i }))
    const popipa = screen.getByRole('button', { name: /^Poppin'Party theme$/ })
    await user.click(popipa)
    // popover closed; reopen and click again
    await user.click(screen.getByRole('button', { name: /choose theme/i }))
    const popipa2 = screen.getByRole('button', { name: /^Poppin'Party theme$/ })
    await user.click(popipa2)
    expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe(
      themes.popipa.tokens['--color-primary'],
    )
  })

  it('closes popover on Escape and refocuses trigger', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ThemeSwitcher />)
    const trigger = screen.getByRole('button', { name: /choose theme/i })
    await user.click(trigger)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(trigger).toHaveFocus()
  })

  it('closes popover on outside click', async () => {
    const user = userEvent.setup()
    const { container } = renderWithProviders(
      <div>
        <ThemeSwitcher />
        <div data-testid="outside">outside</div>
      </div>,
    )
    await user.click(screen.getByRole('button', { name: /choose theme/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.click(screen.getByTestId('outside'))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(container).toBeDefined()
  })

  it('toggles popover off when trigger clicked again', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ThemeSwitcher />)
    const trigger = screen.getByRole('button', { name: /choose theme/i })
    await user.click(trigger)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.click(trigger)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('shows current theme name label inside popover', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ThemeSwitcher />)
    await user.click(screen.getByRole('button', { name: /choose theme/i }))
    expect(screen.getByText('Neutral')).toBeInTheDocument()
  })
})
