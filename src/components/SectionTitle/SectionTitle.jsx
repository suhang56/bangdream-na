import { Link } from 'react-router-dom'
import './SectionTitle.css'

/**
 * Reusable bilingual section title with optional "more" link.
 * - href starting with `/` → React Router <Link>
 * - external href (http*) → raw <a>
 * - missing href → no more link rendered
 */
export default function SectionTitle({
  cn,
  jp,
  more = '查看全部 →',
  href,
}) {
  return (
    <div className="bf-section-title">
      <div className="st-title">
        {cn}
        {jp ? <span className="st-jp">{jp}</span> : null}
      </div>
      {href ? (
        href.startsWith('/') ? (
          <Link className="st-more" to={href}>
            {more}
          </Link>
        ) : (
          <a className="st-more" href={href}>
            {more}
          </a>
        )
      ) : (
        <span className="st-more">{more}</span>
      )}
    </div>
  )
}
