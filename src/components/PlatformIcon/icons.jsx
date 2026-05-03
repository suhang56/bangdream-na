/**
 * Brand-mark SVG glyphs shared between PlatformIcon (footer/list)
 * and PlatformTileRow (home tiles). Strokes/fills use `currentColor`
 * so the parent controls the color via CSS.
 */

export function DiscordSvg({ size = 18, className = 'platform-icon-svg' } = {}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      fill="currentColor"
    >
      <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3.2a.074.074 0 0 0-.079.037c-.34.605-.719 1.394-.984 2.013a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-1-2.013.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 5.17 4.369a.07.07 0 0 0-.032.027C2.498 8.36 1.79 12.246 2.137 16.085a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.027.078.078 0 0 0 .084-.028 14.31 14.31 0 0 0 1.226-1.994.075.075 0 0 0-.041-.105 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.371-.291a.074.074 0 0 1 .077-.01c3.928 1.794 8.18 1.794 12.061 0a.074.074 0 0 1 .078.009c.12.099.245.198.372.292a.077.077 0 0 1-.006.128 12.298 12.298 0 0 1-1.873.891.077.077 0 0 0-.04.106c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.029 19.835 19.835 0 0 0 6.002-3.028.077.077 0 0 0 .032-.054c.4-4.397-.713-8.252-3.014-11.689a.061.061 0 0 0-.031-.028zM8.02 13.715c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.955 2.419-2.157 2.419zm7.978 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.946 2.419-2.157 2.419z" />
    </svg>
  )
}

export function QQSvg({ size = 18, className = 'platform-icon-svg' } = {}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2.5c-3.5 0-6 3-6 6.5 0 1.5.4 2.7 1 3.5l-1.4 2.7c-.3.5.1 1 .7.9l2.5-.5c.9.6 2 1 3.2 1s2.3-.4 3.2-1l2.5.5c.6.1 1-.4.7-.9L17 12.5c.6-.8 1-2 1-3.5 0-3.5-2.5-6.5-6-6.5z" />
      <circle cx="10" cy="9" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="14" cy="9" r="0.8" fill="currentColor" stroke="none" />
      <path d="M9 18v2.5M15 18v2.5" />
    </svg>
  )
}

export function XiaohongshuSvg({
  size = 18,
  className = 'platform-icon-svg',
} = {}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <path
        d="M12 9.5l-1.2 2.4-2.6.4 1.9 1.8-.4 2.6 2.3-1.2 2.3 1.2-.4-2.6 1.9-1.8-2.6-.4z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  )
}

export function XSvg({ size = 18, className = 'platform-icon-svg' } = {}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      fill="currentColor"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

export function WechatSvg({ size = 18, className = 'platform-icon-svg' } = {}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 4.5c-3.6 0-6.5 2.5-6.5 5.7 0 1.7.8 3.2 2.1 4.2L4 17l3-1.4c.6.2 1.3.3 2 .3M15 9c-3.3 0-6 2.2-6 5s2.7 5 6 5c.6 0 1.2-.1 1.8-.3l2.7 1.3-.5-2.4c1.1-.9 1.8-2.2 1.8-3.6 0-2.8-2.7-5-5.8-5z" />
      <circle cx="13" cy="14" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="17" cy="14" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function ForumSvg({ size = 18, className = 'platform-icon-svg' } = {}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 4h14a2.5 2.5 0 0 1 2.5 2.5v8a2.5 2.5 0 0 1-2.5 2.5h-9l-4 3.5V17H5a2.5 2.5 0 0 1-2.5-2.5v-8A2.5 2.5 0 0 1 5 4z" />
      <circle cx="8.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="10.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

