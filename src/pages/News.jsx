import { useMemo, useState, useSyncExternalStore } from 'react'
import Mobile from '../components/Responsive/Mobile.jsx'
import Desktop from '../components/Responsive/Desktop.jsx'
import NewsMobile from './News.mobile.jsx'
import NewsDesktop from './News.desktop.jsx'
import { filterNews, sortNewsByDate } from '../lib/news.js'
import {
  getLanguage,
  subscribeLanguage,
} from '../lib/uiLanguage.js'
import news from '../data/news.json'
import './News.css'

function subscribe(cb) {
  return subscribeLanguage(cb)
}
function getSnapshot() {
  return getLanguage()
}

const EMPTY_FILTER_STATE = Object.freeze({
  categories: null,
  from: '',
  to: '',
  keyword: '',
})

function makeEmptyState() {
  return { categories: new Set(), from: '', to: '', keyword: '' }
}

export default function News() {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [filterState, setFilterState] = useState(makeEmptyState)

  const visible = useMemo(
    () => sortNewsByDate(filterNews(news, filterState)),
    [filterState],
  )

  const totalCount = news.length
  const layoutProps = {
    news,
    visible,
    filterState,
    onChange: setFilterState,
    onClear: () => setFilterState(makeEmptyState()),
    totalCount,
  }

  return (
    <>
      <Mobile>
        <NewsMobile {...layoutProps} />
      </Mobile>
      <Desktop>
        <NewsDesktop {...layoutProps} />
      </Desktop>
    </>
  )
}

export { EMPTY_FILTER_STATE }
