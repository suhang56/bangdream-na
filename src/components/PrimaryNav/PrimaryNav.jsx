import { Link, useLocation } from 'react-router-dom'
import {
  FORUM_URL,
  TICKETS_DOC_URL,
  GUIDE_WIKI_URL,
} from '../../data/socialLinks.js'
import './PrimaryNav.css'

const NAV_ITEMS = [
  { id: 'top',     cn: '首页',     en: 'TOP',     to: '/' },
  { id: 'news',    cn: '新闻',     en: 'NEWS',    to: '/news' },
  { id: 'events',  cn: '活动',     en: 'EVENTS',  to: '/events' },
  { id: 'tickets', cn: '出票公告', external: true, to: TICKETS_DOC_URL },
  { id: 'guide',   cn: '现地攻略', external: true, to: GUIDE_WIKI_URL },
  { id: 'gallery', cn: '相册',     en: 'GALLERY', to: '/gallery' },
  // D9-HOTFIX: hidden until member roster is curated; /members route still mounts in App.jsx
  // and Home stat tile + Footer still link to it. Keep entry for future re-enable.
  { id: 'members', cn: '成员',     en: 'MEMBERS', to: '/members', hidden: true },
  { id: 'about',   cn: '关于',     en: 'ABOUT',   to: '/about' },
  { id: 'rules',   cn: '群规',     en: 'RULES',   to: '/rules' },
  { id: 'forum',   cn: '论坛',     external: true, to: FORUM_URL },
]

function isActive(pathname, to) {
  if (to === '/') return pathname === '/'
  return pathname === to || pathname.startsWith(to + '/')
}

/**
 * Sticky primary nav. CN labels are HARDCODED per Designer §4 carve-out
 * (site-chrome nav never translates; only UI controls flip language).
 *
 * External entries (出票公告 / 现地攻略 / 论坛) render plain anchors with
 * target="_blank"; internal entries use React Router <Link>.
 */
export default function PrimaryNav() {
  const { pathname } = useLocation()
  const visibleItems = NAV_ITEMS.filter((item) => !item.hidden)
  return (
    <nav className="bf-nav" aria-label="主导航">
      <div className="bf-container">
        {visibleItems.map((item) => {
          if (item.external) {
            return (
              <a
                key={item.id}
                href={item.to}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="nv-jp">{item.cn}</span>
                <span className="nv-ext-arrow" aria-hidden="true">↗</span>
              </a>
            )
          }
          const active = isActive(pathname, item.to)
          return (
            <Link
              key={item.id}
              to={item.to}
              className={active ? 'active' : ''}
              aria-current={active ? 'page' : undefined}
            >
              <span className="nv-jp">{item.cn}</span>
              <span className="nv-cn bf-hide-mobile">{item.en}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
