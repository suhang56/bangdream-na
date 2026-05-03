import DiscordCTA from '../DiscordCTA/DiscordCTA.jsx'
import './Hero.css'

export default function Hero({ communityName, communityNameZh, tagline, discordUrl }) {
  return (
    <section className="hero">
      <div className="hero-bg" aria-hidden="true" />
      <div className="hero-content">
        <h1 className="hero-name">{communityName}</h1>
        {communityNameZh ? (
          <p className="hero-name-zh" lang="zh">
            {communityNameZh}
          </p>
        ) : null}
        {tagline ? <p className="hero-tagline">{tagline}</p> : null}
        <div className="hero-cta">
          <DiscordCTA url={discordUrl} size="lg" />
        </div>
      </div>
    </section>
  )
}
