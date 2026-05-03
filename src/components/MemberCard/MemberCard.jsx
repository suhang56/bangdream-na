import { useState } from 'react'
import RoleBadge from '../RoleBadge/RoleBadge.jsx'
import { getInitials } from '../../lib/members.js'
import './MemberCard.css'

/**
 * @typedef {Object} Member
 * @property {string} id
 * @property {string} name
 * @property {'organizer'|'member'|'alumnus'|'cover-band-lead'} role
 * @property {string} [oshiBand]
 * @property {string} [oshiCharacter]
 * @property {string} [coverBand]
 * @property {string} [coverBandRole]
 * @property {string} [city]
 * @property {string} [bio]
 * @property {string} [avatar]
 * @property {Object<string,string>} [socials]
 * @property {string} [joinedAt]
 * @property {boolean} [alumnus]
 *
 * Schema reference: docs/p3-design.md "Member data shape"
 */

const SOCIAL_RENDERERS = {
  twitter: (handle, name) => ({
    href: `https://twitter.com/${handle}`,
    label: `Twitter for ${name}`,
    text: `@${handle}`,
  }),
  instagram: (handle, name) => ({
    href: `https://instagram.com/${handle}`,
    label: `Instagram for ${name}`,
    text: `@${handle}`,
  }),
  bilibili: (handle, name) => ({
    href: `https://space.bilibili.com/${handle}`,
    label: `bilibili for ${name}`,
    text: `bilibili · ${handle}`,
  }),
}

function renderSocials(socials, name) {
  if (!socials || typeof socials !== 'object') return null
  const entries = Object.entries(socials).filter(
    ([, v]) => typeof v === 'string' && v.trim() !== '',
  )
  if (entries.length === 0) return null

  return (
    <ul className="member-card-socials" aria-label="Social links">
      {entries.map(([platform, value]) => {
        if (platform === 'discord') {
          return (
            <li key={platform}>
              <span
                className="member-card-social member-card-social--discord"
                title={`Discord username: ${value}`}
              >
                Discord · {value}
              </span>
            </li>
          )
        }
        const renderer = SOCIAL_RENDERERS[platform]
        if (!renderer) {
          return (
            <li key={platform}>
              <span className="member-card-social" title={`${platform}: ${value}`}>
                {platform} · {value}
              </span>
            </li>
          )
        }
        const { href, label, text } = renderer(value, name)
        return (
          <li key={platform}>
            <a
              className="member-card-social"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
            >
              {text}
            </a>
          </li>
        )
      })}
    </ul>
  )
}

export default function MemberCard({ member }) {
  const [imgFailed, setImgFailed] = useState(false)
  const showImg = !!member.avatar && !imgFailed

  const initials = getInitials(member.name)
  const isAlumnus = member.alumnus === true || member.role === 'alumnus'
  const cardClass = `member-card${isAlumnus ? ' member-card--alumnus' : ''}`

  return (
    <article className={cardClass} aria-label={member.name}>
      {member.coverBand && (
        <div
          className="member-card-cover-ribbon"
          aria-label={`Cover band: ${member.coverBand}${member.coverBandRole ? ` · ${member.coverBandRole}` : ''}`}
          title={`Cover: ${member.coverBand}${member.coverBandRole ? ` · ${member.coverBandRole}` : ''}`}
        >
          <span className="member-card-cover-band">{member.coverBand}</span>
          {member.coverBandRole && (
            <span className="member-card-cover-role"> · {member.coverBandRole}</span>
          )}
        </div>
      )}

      <div className="member-card-avatar">
        {showImg ? (
          <img
            src={member.avatar}
            alt={member.name}
            loading="lazy"
            decoding="async"
            width={88}
            height={88}
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="member-card-initials" aria-hidden="true">
            {initials}
          </div>
        )}
      </div>

      <div className="member-card-body">
        <h3 className="member-card-name" title={member.name}>
          {member.name}
        </h3>
        <div className="member-card-meta">
          <RoleBadge role={member.role} alumnus={member.alumnus} />
          {member.city && (
            <span className="member-card-city">{member.city}</span>
          )}
        </div>
        {member.oshiBand && (
          <p className="member-card-oshi">
            <span className="member-card-oshi-label">Oshi: </span>
            <span className="member-card-oshi-value">
              {member.oshiBand}
              {member.oshiCharacter && ` · ${member.oshiCharacter}`}
            </span>
          </p>
        )}
        {member.bio && <p className="member-card-bio">{member.bio}</p>}
        {renderSocials(member.socials, member.name)}
      </div>
    </article>
  )
}
