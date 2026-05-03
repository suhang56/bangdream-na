import DiscordCTA from '../DiscordCTA/DiscordCTA.jsx'
import './Hero.css'

export default function Hero({
  communityName,
  communityNameZh,
  communityNameJp,
  tagline,
  discordUrl,
  children,
}) {
  const hasJp =
    typeof communityNameJp === 'string' && communityNameJp.length > 0
  const hasZh =
    typeof communityNameZh === 'string' && communityNameZh.length > 0
  const hasEn = typeof communityName === 'string' && communityName.length > 0

  return (
    <section className="hero">
      <div className="hero-bg" aria-hidden="true" />
      <div className="hero-content">
        <img
          src="/logo.png"
          alt="北美邦 — BanG Dream North America fan community emblem"
          className="hero-logo"
          width="200"
          height="200"
        />
        {hasJp ? (
          <p className="hero-name-jp" lang="ja">
            {communityNameJp}
          </p>
        ) : null}
        {hasZh ? (
          <h1 className="hero-name-zh" lang="zh">
            {communityNameZh}
          </h1>
        ) : hasEn ? (
          <h1 className="hero-name-en hero-name-en--solo" lang="en">
            {communityName}
          </h1>
        ) : (
          <h1 className="hero-name-fallback">BanG Dream NA</h1>
        )}
        {hasZh && hasEn ? (
          <p className="hero-name-en" lang="en">
            {communityName}
          </p>
        ) : null}
        {tagline ? <p className="hero-tagline">{tagline}</p> : null}
        <div className="hero-cta">
          <DiscordCTA url={discordUrl} size="lg" />
        </div>
        {children ? <div className="hero-extra">{children}</div> : null}
      </div>
    </section>
  )
}
