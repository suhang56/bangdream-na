import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '../theme/ThemeContext.jsx'

export function renderWithProviders(ui, { route, ...renderOptions } = {}) {
  const Wrapper = ({ children }) => {
    const wrapped = <ThemeProvider>{children}</ThemeProvider>
    if (route !== undefined) {
      return <MemoryRouter initialEntries={[route]}>{wrapped}</MemoryRouter>
    }
    return wrapped
  }
  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

export function renderWithRouter(ui, { route = '/', ...renderOptions } = {}) {
  const Wrapper = ({ children }) => (
    <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
  )
  return render(ui, { wrapper: Wrapper, ...renderOptions })
}
