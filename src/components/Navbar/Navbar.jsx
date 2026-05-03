import { Link, NavLink } from 'react-router-dom'
import ThemeSwitcher from '../ThemeSwitcher/ThemeSwitcher.jsx'
import './Navbar.css'

const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/events', label: 'Events' },
  { to: '/members', label: 'Members' },
]

export default function Navbar() {
  return (
    <nav className="navbar" aria-label="Primary">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand" aria-label="BanG Dream North America — Home">
          <img src="/logo.png" alt="" className="navbar-logo" width="32" height="32" />
          <span className="navbar-brand-text">BD!NA</span>
        </Link>
        <ul className="navbar-links">
          {NAV_LINKS.map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  'navbar-link' + (isActive ? ' navbar-link--active' : '')
                }
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="navbar-tail">
          <ThemeSwitcher />
        </div>
      </div>
    </nav>
  )
}
