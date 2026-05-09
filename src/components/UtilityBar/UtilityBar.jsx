import { useSyncExternalStore } from 'react'
import LangToggle from '../LangToggle/LangToggle.jsx'
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

/**
 * Top utility bar — green pulse + ONLINE label + disclaimer + language toggle.
 * Hardcoded CN labels (在线 / 非官方…) per Designer §4 carve-out for site chrome.
 */
export default function UtilityBar() {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return (
    <div className="bf-utility">
      <div className="bf-container">
        <div className="bf-uleft">
          <span>
            <span className="bf-pulse" aria-hidden="true" />
            {t('utility.online')}
          </span>
        </div>
        <div className="bf-uright">
          <span className="bf-u-disclaimer">{t('utility.disclaimer')}</span>
          <LangToggle />
        </div>
      </div>
    </div>
  )
}
