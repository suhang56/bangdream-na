import { useEffect, useState, useSyncExternalStore } from 'react'
import LangToggle from '../LangToggle/LangToggle.jsx'
import { fetchMembers } from '../../lib/api.js'
import {
  getLanguage,
  subscribeLanguage,
  t,
} from '../../lib/uiLanguage.js'
import './UtilityBar.css'

function subscribe(cb) {
  return subscribeLanguage(cb)
}
function getSnapshot() {
  return getLanguage()
}

function computeJstTimestamp() {
  const fmt = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = fmt.formatToParts(new Date())
  const y = parts.find((p) => p.type === 'year').value
  const mo = parts.find((p) => p.type === 'month').value
  const d = parts.find((p) => p.type === 'day').value
  const h = parts.find((p) => p.type === 'hour').value
  const mi = parts.find((p) => p.type === 'minute').value
  return `更新于 ${y}.${mo}.${d} ${h}:${mi} JST`
}

/**
 * Top utility bar — green pulse + ONLINE label + JST timestamp + member count + disclaimer + language toggle.
 * Hardcoded CN labels (在线 / 非官方…) per Designer §4 carve-out for site chrome.
 */
export default function UtilityBar() {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [jstTimestamp] = useState(computeJstTimestamp)
  const [members, setMembers] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchMembers()
      .then((r) => {
        if (cancelled) return
        const total = typeof r?.total === 'number'
          ? r.total
          : Array.isArray(r?.items) ? r.items.length : null
        setMembers(total)
      })
      .catch(() => {
        if (cancelled) return
        setMembers(null)
      })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="bf-utility">
      <div className="bf-container">
        <div className="bf-uleft">
          <span>
            <span className="bf-pulse" aria-hidden="true" />
            {t('utility.online')}
          </span>
          <span>{jstTimestamp}</span>
          {typeof members === 'number' ? (
            <span className="bf-hide-mobile">{t('utility.membersCount', { count: members })}</span>
          ) : null}
        </div>
        <div className="bf-uright">
          <span className="bf-u-disclaimer">{t('utility.disclaimer')}</span>
          <LangToggle />
        </div>
      </div>
    </div>
  )
}
