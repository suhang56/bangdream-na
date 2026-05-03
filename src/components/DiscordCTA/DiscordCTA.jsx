import { isValidDiscordUrl } from './validateDiscordUrl.js'
import './DiscordCTA.css'

function DiscordIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden="true"
      fill="currentColor"
    >
      <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3.2a.074.074 0 0 0-.079.037c-.34.605-.719 1.394-.984 2.013a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-1-2.013.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 5.17 4.369a.07.07 0 0 0-.032.027C2.498 8.36 1.79 12.246 2.137 16.085a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.027.078.078 0 0 0 .084-.028 14.31 14.31 0 0 0 1.226-1.994.075.075 0 0 0-.041-.105 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.371-.291a.074.074 0 0 1 .077-.01c3.928 1.794 8.18 1.794 12.061 0a.074.074 0 0 1 .078.009c.12.099.245.198.372.292a.077.077 0 0 1-.006.128 12.298 12.298 0 0 1-1.873.891.077.077 0 0 0-.04.106c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.029 19.835 19.835 0 0 0 6.002-3.028.077.077 0 0 0 .032-.054c.4-4.397-.713-8.252-3.014-11.689a.061.061 0 0 0-.031-.028zM8.02 13.715c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.955 2.419-2.157 2.419zm7.978 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.946 2.419-2.157 2.419z" />
    </svg>
  )
}

export default function DiscordCTA({ url, size = 'md' }) {
  const trimmed = typeof url === 'string' ? url.trim() : ''
  const valid = isValidDiscordUrl(url)
  const sizeClass = size === 'lg' ? 'discord-cta--lg' : 'discord-cta--md'

  if (!valid) {
    return (
      <button
        type="button"
        className={`discord-cta discord-cta--disabled ${sizeClass}`}
        disabled
        aria-disabled="true"
        title="Discord coming soon"
      >
        <DiscordIcon className="discord-cta-icon" />
        <span>Discord coming soon</span>
      </button>
    )
  }

  return (
    <a
      className={`discord-cta discord-cta--active ${sizeClass}`}
      href={trimmed}
      target="_blank"
      rel="noopener noreferrer"
    >
      <DiscordIcon className="discord-cta-icon" />
      <span>Join Discord</span>
    </a>
  )
}
