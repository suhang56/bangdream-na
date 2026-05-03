import NewsCard from '../NewsCard/NewsCard.jsx'
import './NewsList.css'

export default function NewsList({ news, emptyMessage }) {
  if (!Array.isArray(news) || news.length === 0) {
    return (
      <p className="news-list__empty" role="status" aria-live="polite">
        {emptyMessage || 'No news yet.'}
      </p>
    )
  }
  return (
    <ul className="news-list">
      {news.map((item) => (
        <li key={item.id} className="news-list__item">
          <NewsCard news={item} />
        </li>
      ))}
    </ul>
  )
}
