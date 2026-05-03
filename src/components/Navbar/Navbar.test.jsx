import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/utils.jsx'
import Navbar from './Navbar.jsx'

describe('<Navbar />', () => {
  it('renders brand link, primary nav links, and theme switcher', () => {
    renderWithProviders(<Navbar />, { route: '/' })
    expect(screen.getByRole('link', { name: /bang dream north america.*home/i })).toHaveAttribute('href', '/')
    expect(screen.getByText(/bd!na/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Events' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Members' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /choose theme/i })).toBeInTheDocument()
  })

  it('marks the active route with --active class via NavLink', () => {
    renderWithProviders(<Navbar />, { route: '/events' })
    const eventsLink = screen.getByRole('link', { name: 'Events' })
    expect(eventsLink.className).toMatch(/navbar-link--active/)
  })

  it('Home is not active when route is /events (edge: end-matching)', () => {
    renderWithProviders(<Navbar />, { route: '/events' })
    const home = screen.getByRole('link', { name: 'Home' })
    expect(home.className).not.toMatch(/navbar-link--active/)
  })
})
