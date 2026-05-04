import EventsArt from './events.jsx'
import MembersArt from './members.jsx'
import NewsArt from './news.jsx'
import PostsArt from './posts.jsx'
import SocialArt from './social.jsx'
import SiteArt from './site.jsx'
import AboutArt from './about.jsx'
import DefaultArt from './_default.jsx'

const REGISTRY = {
  events: EventsArt,
  members: MembersArt,
  news: NewsArt,
  posts: PostsArt,
  social: SocialArt,
  site: SiteArt,
  about: AboutArt,
  featuredPosts: PostsArt,
  socialLinks: SocialArt,
  aboutSections: AboutArt,
}

/**
 * @param {string} schemaKey
 * @returns {React.ComponentType}
 */
export function getIllustration(schemaKey) {
  if (typeof schemaKey !== 'string') return DefaultArt
  return Object.prototype.hasOwnProperty.call(REGISTRY, schemaKey)
    ? REGISTRY[schemaKey]
    : DefaultArt
}

export const ILLUSTRATION_KEYS = Object.keys(REGISTRY)
