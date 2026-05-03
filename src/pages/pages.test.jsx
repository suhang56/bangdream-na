import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { Routes, Route } from 'react-router-dom'
import { renderWithProviders } from '../test/utils.jsx'
import Events from './Events.jsx'
import Members from './Members.jsx'

function RoutesUnderTest() {
  return (
    <Routes>
      <Route path="/events" element={<Events />} />
      <Route path="/members" element={<Members />} />
    </Routes>
  )
}

describe('placeholder pages', () => {
  it('Events page renders title + filter + empty state via /events route', () => {
    renderWithProviders(<RoutesUnderTest />, { route: '/events' })
    expect(screen.getByRole('heading', { level: 1, name: 'Events' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Concerts' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/no events/i)
  })

  it('Members page renders title via /members route', () => {
    renderWithProviders(<RoutesUnderTest />, { route: '/members' })
    expect(screen.getByRole('heading', { level: 1, name: 'Members' })).toBeInTheDocument()
  })

  it('unknown route renders nothing in test routes (edge: 404 handling)', () => {
    renderWithProviders(<RoutesUnderTest />, { route: '/does-not-exist' })
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
  })
})
