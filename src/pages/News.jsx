import { useMemo, useState, useSyncExternalStore } from 'react'
import NewsList from '../components/NewsList/NewsList.jsx'
import NewsSidebar from '../components/NewsSidebar/NewsSidebar.jsx'
import { filterNews, sortNewsByDate } from '../lib/news.js'
import {
  getLanguage,
  subscribeLanguage,
  t,
} from '../lib/uiLanguage.js'
import news from '../data/news.json'
import './News.css'

function subscribe(cb) {
  return subscribeLanguage(cb)
}
function getSnapshot() {
  return getLanguage()
}

export default function News() {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [filterState, setFilterState] = useState({
    categories: new Set(),
    from: '',
    to: '',
    keyword: '',
  })

  const visible = useMemo(
    () => sortNewsByDate(filterNews(news, filterState)),
    [filterState],
  )

  const isEmpty = news.length === 0
  const emptyMessage = isEmpty
    ? t('empty.noNews')
    : t('empty.noNewsMatch')

  return (
    <main className="news-page section">
      <div className="section-inner">
        <h1 className="section-title">{t('nav.news')}</h1>
        <div className="news-page__layout">
          <NewsSidebar
            filterState={filterState}
            onChange={setFilterState}
          />
          <div className="news-page__content">
            <NewsList news={visible} emptyMessage={emptyMessage} />
          </div>
        </div>
      </div>
    </main>
  )
}
