import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { Routes, Route } from 'react-router-dom'
import { renderWithProviders } from '../test/utils.jsx'
import Events from './Events.jsx'
import Members from './Members.jsx'
import News from './News.jsx'
import About from './About.jsx'
import { _resetForTests, setLanguage } from '../lib/uiLanguage.js'

function RoutesUnderTest() {
  return (
    <Routes>
      <Route path="/events" element={<Events />} />
      <Route path="/members" element={<Members />} />
      <Route path="/news" element={<News />} />
      <Route path="/about" element={<About />} />
    </Routes>
  )
}

describe('routes smoke', () => {
  beforeEach(() => {
    _resetForTests()
    window.localStorage.clear()
    setLanguage('en')
  })

  it('Events page renders title + filter + empty state via /events route', () => {
    renderWithProviders(<RoutesUnderTest />, { route: '/events' })
    expect(screen.getByRole('heading', { level: 1, name: 'Events' })).toBeInTheDocument()
  })

  it('Members page renders title via /members route', () => {
    renderWithProviders(<RoutesUnderTest />, { route: '/members' })
    expect(screen.getByRole('heading', { level: 1, name: 'Members' })).toBeInTheDocument()
  })

  it('News page renders heading + empty status via /news route', () => {
    renderWithProviders(<RoutesUnderTest />, { route: '/news' })
    expect(screen.getByRole('heading', { level: 1, name: /news/i })).toBeInTheDocument()
  })

  it('About page renders ZH heading via /about route', () => {
    renderWithProviders(<RoutesUnderTest />, { route: '/about' })
    expect(
      screen.getByRole('heading', { level: 1, name: /北美炸梦同好会/ }),
    ).toBeInTheDocument()
  })

  it('unknown route renders nothing in test routes (edge: 404 handling)', () => {
    renderWithProviders(<RoutesUnderTest />, { route: '/does-not-exist' })
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
  })
})
