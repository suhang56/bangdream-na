import NewsList from '../components/NewsList/NewsList.jsx'
import NewsSidebar from '../components/NewsSidebar/NewsSidebar.jsx'
import { t } from '../lib/uiLanguage.js'
import './News.desktop.css'

export default function NewsDesktop({ news, visible, filterState, onChange }) {
  const isEmpty = !Array.isArray(news) || news.length === 0
  const emptyMessage = isEmpty
    ? t('empty.noNews')
    : t('empty.noNewsMatch')

  return (
    <main className="news-page news-page--desktop section">
      <div className="section-inner">
        <h1 className="section-title">{t('nav.news')}</h1>
        <div className="news-page__layout">
          <NewsSidebar filterState={filterState} onChange={onChange} />
          <div className="news-page__content">
            <NewsList news={visible} emptyMessage={emptyMessage} />
          </div>
        </div>
      </div>
    </main>
  )
}
