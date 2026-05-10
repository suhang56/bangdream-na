import { Link } from 'react-router-dom'
import {
  QQ_GROUP_URL,
  DISCORD_INVITE_URL,
  X_PROFILE_URL,
  XHS_URL,
  FORUM_URL,
} from '../../data/socialLinks.js'
import './Footer.css'

const COMMUNITY_LINKS = [
  { to: '/about', label: '关于', external: false },
  { to: '/members', label: '成员', external: false },
  { to: '/rules', label: '群规', external: false },
  { to: QQ_GROUP_URL, label: 'QQ 群', external: true },
  { to: DISCORD_INVITE_URL, label: 'Discord', external: true },
]

const RESOURCE_LINKS = [
  { to: '/news', label: '新闻', external: false },
  { to: '/events', label: '活动', external: false },
  { to: '/gallery', label: '相册', external: false },
]

function hostnameOf(url) {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

const EXTERNAL_LINKS = [
  { to: X_PROFILE_URL, label: 'X @BandoriNACC ↗' },
  { to: XHS_URL, label: '小红书 @北美炸梦 ↗' },
  { to: FORUM_URL, label: `论坛 ${hostnameOf(FORUM_URL)} ↗` },
]

/**
 * Site footer — dark ink background, 4-column grid collapsing to 2-col @ 800px.
 * Hardcoded CN strings per Designer §4 site-chrome carve-out.
 */
export default function Footer() {
  const year = new Date().getFullYear()
  const buildDate = `build ${year}.${String(new Date().getMonth() + 1).padStart(2, '0')}.${String(new Date().getDate()).padStart(2, '0')}`
  return (
    <footer className="bf-foot">
      <div className="bf-container">
        <div className="bf-foot-grid">
          <div>
            <div className="bf-foot-mast">北美炸梦同好会</div>
            <p className="bf-foot-discl">
              北美炸梦同好会 / 北美华人 BanG Dream! 粉丝社群。
              与株式会社 Bushiroad、Craft Egg 等版权方无任何关系。
              所有乐队名称、角色形象、商标均为各自所有者的财产。
            </p>
          </div>
          <div>
            <h4>社群</h4>
            <ul>
              {COMMUNITY_LINKS.map((link) =>
                link.external ? (
                  <li key={link.label}>
                    <a
                      href={link.to}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {link.label}
                    </a>
                  </li>
                ) : (
                  <li key={link.label}>
                    <Link to={link.to}>{link.label}</Link>
                  </li>
                ),
              )}
            </ul>
          </div>
          <div>
            <h4>资讯</h4>
            <ul>
              {RESOURCE_LINKS.map((link) => (
                <li key={link.label}>
                  <Link to={link.to}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4>外链</h4>
            <ul>
              {EXTERNAL_LINKS.map((link) => (
                <li key={link.label}>
                  <a href={link.to} target="_blank" rel="noopener noreferrer">{link.label}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="bf-foot-bottom">
          <span>© 2024–{year} 北美炸梦同好会 / fan-run · 非营利 · 非官方</span>
          <span>{buildDate} · 150+ 同好 · 9 分会 · since 2024</span>
        </div>
      </div>
    </footer>
  )
}
