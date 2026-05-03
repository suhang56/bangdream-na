import { useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import {
  getLanguage,
  subscribeLanguage,
  t,
} from '../../lib/uiLanguage.js'
import site from '../../data/site.json'
import './Footer.css'

const QUICK_LINKS = [
  { to: '/', key: 'nav.home' },
  { to: '/news', key: 'nav.news' },
  { to: '/events', key: 'nav.events' },
  { to: '/members', key: 'nav.members' },
  { to: '/about', key: 'nav.about' },
]

const ABOUT_LINKS = [
  { href: '/about#mission', key: 'footer.mission' },
  { href: '/about#faq', key: 'footer.faq' },
  { href: '/about#coc', key: 'footer.coc' },
  { href: '/about#disclaimer', key: 'footer.disclaimerLink' },
]

function subscribe(cb) {
  return subscribeLanguage(cb)
}
function getSnapshot() {
  return getLanguage()
}

export default function Footer() {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const year = new Date().getFullYear()
  const hasJp =
    typeof site.communityNameJp === 'string' && site.communityNameJp.length > 0
  const hasZh =
    typeof site.communityNameZh === 'string' && site.communityNameZh.length > 0
  const hasEn =
    typeof site.communityName === 'string' && site.communityName.length > 0

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-columns">
          <section className="footer-column">
            <h3 className="footer-heading">{t('footer.quickLinks')}</h3>
            <ul className="footer-list">
              {QUICK_LINKS.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="footer-link">
                    {t(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="footer-column">
            <h3 className="footer-heading">{t('footer.aboutLegal')}</h3>
            <ul className="footer-list">
              {ABOUT_LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="footer-link">
                    {t(link.key)}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <p className="footer-brand-tri">
          {hasJp ? (
            <span lang="ja">{site.communityNameJp}</span>
          ) : null}
          {hasJp && hasZh ? (
            <span className="footer-brand-sep" aria-hidden="true">
              ·
            </span>
          ) : null}
          {hasZh ? (
            <span lang="zh">{site.communityNameZh}</span>
          ) : null}
          {hasZh && hasEn ? (
            <span className="footer-brand-sep" aria-hidden="true">
              ·
            </span>
          ) : null}
          {hasEn ? (
            <span lang="en">{site.communityName}</span>
          ) : null}
        </p>

        <p className="footer-copy">
          © {year} — {t('footer.disclaimer')}
        </p>
      </div>
    </footer>
  )
}
