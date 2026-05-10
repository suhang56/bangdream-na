import { Link, useLocation } from 'react-router-dom'
import './PrimaryNav.css'

const NAV_ITEMS = [
  { id: 'top', cn: '首页', en: 'TOP', to: '/' },
  { id: 'news', cn: '新闻', en: 'NEWS', to: '/news' },
  { id: 'events', cn: '活动', en: 'EVENTS', to: '/events' },
  { id: 'gallery', cn: '相册', en: 'GALLERY', to: '/gallery' },
  { id: 'members', cn: '成员', en: 'MEMBERS', to: '/members' },
  { id: 'about', cn: '关于', en: 'ABOUT', to: '/about' },
  { id: 'rules', cn: '群规', en: 'RULES', to: '/rules' },
]

function isActive(pathname, to) {
  if (to === '/') return pathname === '/'
  if (to.startsWith('#')) return false
  return pathname === to || pathname.startsWith(to + '/')
}

/**
 * Sticky primary nav. CN labels are HARDCODED per Designer §4 carve-out
 * (site-chrome nav never translates; only UI controls flip language).
 */
export default function PrimaryNav() {
  const { pathname } = useLocation()
  return (
    <nav className="bf-nav" aria-label="主导航">
      <div className="bf-container">
        {NAV_ITEMS.map((item) => {
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
        <div className="bf-nav-spacer" />
        <div className="bf-nav-misc bf-hide-mobile">
          <span>加入 QQ 群 ↗</span>
          <span>·</span>
          <span>Discord ↗</span>
          <span>·</span>
          <span>X @BandoriNACC ↗</span>
        </div>
      </div>
    </nav>
  )
}
