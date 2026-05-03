import Hero from '../components/Hero/Hero.jsx'
import site from '../data/site.json'

export default function Home() {
  return (
    <main>
      <Hero
        communityName={site.communityName}
        communityNameZh={site.communityNameZh}
        communityNameJp={site.communityNameJp}
        tagline={site.tagline}
        discordUrl={site.discordInvite}
      />
    </main>
  )
}
