import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Masthead.css'

/**
 * Masthead — paper background with logo lockup, description, and search.
 * Logo + description CN strings are HARDCODED per Designer §4 carve-out
 * (site-chrome wordmark never translates).
 *
 * The search form navigates to /search?q=<encoded> on submit. Empty/whitespace
 * queries early-return (no navigation, no error). Cmd+K (macOS) and Ctrl+K
 * (Windows/Linux) focus the input via a window-level keydown listener.
 */
export default function Masthead() {
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const inputRef = useRef(null)

  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function onSubmit(e) {
    e.preventDefault()
    const q = search.trim()
    if (!q) return
    navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  return (
    <header className="bf-mast">
      <div className="bf-container">
        <Link to="/" className="bf-logo" aria-label="北美炸梦同好会">
          <span className="lg-words">
            <span className="lg-tag" aria-hidden="true">
              F A N &nbsp;&nbsp; C O M M U N I T Y
            </span>
            <span className="lg-brand">
              <img src="/logo.png" alt="北美炸梦同好会" className="bf-logo-img" />
              <span className="lg-site-name" aria-hidden="true">
                北美炸梦同好会
              </span>
            </span>
            <span className="lg-strip">
              <span className="lg-strip-jp">
                BanG Dream! 北米華人コミュニティ
              </span>
              <span className="lg-strip-sep">/</span>
              <span>EST. 2024</span>
            </span>
          </span>
        </Link>
        <div className="bf-mast-meta bf-hide-mobile">
          <span className="ml-tag">// 关于</span>
          <span className="ml-desc">
            北美华人 BanG Dream! 同好社群 —— 散落在洛杉矶、纽约、湾区、西雅图、
            多伦多、匹兹堡、休斯顿、芝加哥、温哥华的同好们在这里相遇。组织线下聚会、
            协调远征、应援花篮、出票互助。150+ 名同好，9 个分会。
          </span>
        </div>
        <form className="bf-search" onSubmit={onSubmit} role="search">
          <input
            ref={inputRef}
            placeholder="搜索 — 现地报告 / 活动 / 城市 / 同好"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="搜索"
          />
          <span className="bf-skbd" aria-label="按 Command K 聚焦搜索框">
            ⌘ K
          </span>
          <button type="submit">搜索</button>
        </form>
      </div>
    </header>
  )
}
