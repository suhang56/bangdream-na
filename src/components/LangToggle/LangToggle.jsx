import { useSyncExternalStore } from 'react'
import {
  getLanguage,
  setLanguage,
  subscribeLanguage,
  t,
} from '../../lib/uiLanguage.js'
import './LangToggle.css'

function subscribe(cb) {
  return subscribeLanguage(cb)
}

function getSnapshot() {
  return getLanguage()
}

export default function LangToggle({ variant = 'default' }) {
  const lang = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const cls =
    'lang-toggle' + (variant === 'inline' ? ' lang-toggle--inline' : '')

  return (
    <div
      className={cls}
      role="group"
      aria-label={t('lang.label')}
      title={t('lang.tooltip')}
    >
      <button
        type="button"
        className={
          'lang-toggle-btn' + (lang === 'zh' ? ' lang-toggle-btn--active' : '')
        }
        aria-pressed={lang === 'zh'}
        lang="zh"
        onClick={() => setLanguage('zh')}
      >
        中
      </button>
      <button
        type="button"
        className={
          'lang-toggle-btn' + (lang === 'en' ? ' lang-toggle-btn--active' : '')
        }
        aria-pressed={lang === 'en'}
        lang="en"
        onClick={() => setLanguage('en')}
      >
        EN
      </button>
    </div>
  )
}
