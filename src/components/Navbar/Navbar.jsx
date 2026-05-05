import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import ThemeSwitcher from '../ThemeSwitcher/ThemeSwitcher.jsx'
import LangToggle from '../LangToggle/LangToggle.jsx'
import MobileDrawer from '../MobileDrawer/MobileDrawer.jsx'
import { ForumSvg } from '../PlatformIcon/icons.jsx'
import {
  getLanguage,
  subscribeLanguage,
  t,
} from '../../lib/uiLanguage.js'
import { fetchSite, fetchSocial } from '../../lib/api.js'
import {
  adaptSiteSettings,
  adaptSocialList,
} from '../../lib/apiAdapter.js'
import { isForumEnabled } from '../../lib/forum.js'
import './Navbar.css'

const EMPTY_SITE = {
  discordInvite: '',
  communityName: '',
  communityNameZh: '',
  communityNameJp: '',
}

const NAV_LINKS = [
  { to: '/', key: 'nav.home', end: true },
  { to: '/news', key: 'nav.news' },
  { to: '/events', key: 'nav.events' },
  { to: '/gallery', key: 'nav.gallery' },
  {
    to: 'https://docs.qq.com/sheet/DQ3JJdGN6anNyQVhV?tab=BB08J2',
    key: 'nav.tickets',
    external: true,
  },
  {
    to: 'https://arisa114514.feishu.cn/wiki/QCNOwAGPxiAE1Ak39BIcRlGbnjh',
    key: 'nav.guide',
    external: true,
  },
  { to: '/members', key: 'nav.members' },
  { to: '/about', key: 'nav.about' },
  { to: '/rules', key: 'nav.rules' },
  { to: 'https://forum.bangdream.org', key: 'nav.forum', external: true },
]

function subscribe(cb) {
  return subscribeLanguage(cb)
}
function getSnapshot() {
  return getLanguage()
}

function HamburgerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export default function Navbar() {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [site, setSite] = useState(EMPTY_SITE)
  const [socialData, setSocialData] = useState([])
  const triggerRef = useRef(null)
  const location = useLocation()

  // close drawer on route change
  const lastPath = useRef(location.pathname)
  useEffect(() => {
    if (lastPath.current !== location.pathname) {
      lastPath.current = location.pathname
      setDrawerOpen(false)
    }
  }, [location.pathname])

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchSite(), fetchSocial()])
      .then(([siteRes, socialRes]) => {
        if (cancelled) return
        setSite(adaptSiteSettings(siteRes))
        setSocialData(adaptSocialList(socialRes))
      })
      .catch(() => {
        // Render with placeholder strings on error; navbar still functional.
      })
    return () => {
      cancelled = true
    }
  }, [])

  const navLinks = isForumEnabled(socialData)
    ? NAV_LINKS
    : NAV_LINKS.filter((l) => l.key !== 'nav.forum')

  const brandLabel =
    typeof site.communityName === 'string' && site.communityName.length > 0
      ? site.communityName + ' — Home'
      : 'Home'

  return (
    <>
      <nav className="navbar" aria-label={t('aria.navPrimary')}>
        <div className="navbar-inner">
          <Link
            to="/"
            className="navbar-brand"
            aria-label={brandLabel}
            title={site.communityName || ''}
          >
            <img
              src="/logo.png"
              alt=""
              className="navbar-logo"
              width="32"
              height="32"
            />
            <span className="navbar-brand-text" lang="zh">北美炸梦同好会</span>
          </Link>
          <ul className="navbar-links">
            {navLinks.map((link) => (
              <li key={link.to}>
                {link.external ? (
                  <a
                    href={link.to}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="navbar-link"
                  >
                    {t(link.key)}
                  </a>
                ) : (
                  <NavLink
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) =>
                      'navbar-link' + (isActive ? ' navbar-link--active' : '')
                    }
                  >
                    {t(link.key)}
                  </NavLink>
                )}
              </li>
            ))}
          </ul>
          <div className="navbar-tail">
            {isForumEnabled(socialData) ? (
              <a
                href="https://forum.bangdream.org"
                target="_blank"
                rel="noopener noreferrer"
                className="navbar-forum-icon"
                aria-label={t('nav.forum')}
                title={t('nav.forum')}
              >
                <ForumSvg size={20} className="navbar-forum-icon__svg" />
              </a>
            ) : null}
            <LangToggle />
            <ThemeSwitcher />
          </div>
          <button
            ref={triggerRef}
            type="button"
            className="navbar-hamburger"
            aria-label={t('btn.openMenu')}
            aria-haspopup="dialog"
            aria-expanded={drawerOpen}
            aria-controls="mobile-drawer"
            onClick={() => setDrawerOpen((p) => !p)}
          >
            <HamburgerIcon />
          </button>
        </div>
      </nav>

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        ariaLabel={t('drawer.title')}
        returnFocusRef={triggerRef}
      >
        <div className="mobile-drawer-header">
          <Link
            to="/"
            className="navbar-brand"
            onClick={() => setDrawerOpen(false)}
          >
            <img src="/logo.png" alt="" width="24" height="24" />
            <span className="navbar-brand-text" lang="zh">北美炸梦同好会</span>
          </Link>
          <button
            type="button"
            className="mobile-drawer-close"
            aria-label={t('btn.closeMenu')}
            onClick={() => setDrawerOpen(false)}
          >
            <CloseIcon />
          </button>
        </div>
        <ul className="mobile-drawer-nav">
          {navLinks.map((link) => (
            <li key={link.to}>
              {link.external ? (
                <a
                  href={link.to}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mobile-drawer-link"
                  onClick={() => setDrawerOpen(false)}
                >
                  {t(link.key)}
                </a>
              ) : (
                <NavLink
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    'mobile-drawer-link' +
                    (isActive ? ' mobile-drawer-link--active' : '')
                  }
                  onClick={() => setDrawerOpen(false)}
                >
                  {t(link.key)}
                </NavLink>
              )}
            </li>
          ))}
        </ul>
        <div className="mobile-drawer-divider" aria-hidden="true" />
        <div className="mobile-drawer-controls">
          <span className="mobile-drawer-label">{t('lang.drawerLabel')}</span>
          <LangToggle variant="inline" />
        </div>
        <div className="mobile-drawer-controls">
          <ThemeSwitcher />
        </div>
      </MobileDrawer>
    </>
  )
}
