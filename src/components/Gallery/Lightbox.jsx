import YARLightbox from 'yet-another-react-lightbox'
import Captions from 'yet-another-react-lightbox/plugins/captions'
import Counter from 'yet-another-react-lightbox/plugins/counter'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/captions.css'
import 'yet-another-react-lightbox/plugins/counter.css'
import './Lightbox.css'

function isoDate(sec) {
  if (typeof sec !== 'number' || !Number.isFinite(sec)) return ''
  const d = new Date(sec * 1000)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function buildSlide(item) {
  const groupLabel = item.eventTitleZh || item.album || ''
  const dateLabel = isoDate(item.takenAt)
  const description = [dateLabel, groupLabel].filter(Boolean).join(' · ')
  return {
    src: item.imageUrl,
    title: item.caption || '',
    description,
  }
}

/**
 * Wraps yet-another-react-lightbox. Builds slides from adapted items
 * (post-adaptGalleryRow). Keyboard nav (←/→/Esc) is handled natively by YARL.
 */
export default function Lightbox({ items, open, index, onClose }) {
  const slides = Array.isArray(items) ? items.map(buildSlide) : []
  return (
    <YARLightbox
      open={!!open}
      close={onClose}
      index={typeof index === 'number' && index >= 0 ? index : 0}
      slides={slides}
      plugins={[Captions, Counter]}
    />
  )
}
