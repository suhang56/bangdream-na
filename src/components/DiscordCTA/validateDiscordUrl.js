const DISCORD_PREFIXES = ['https://discord.gg/', 'https://discord.com/invite/']

export function isValidDiscordUrl(url) {
  if (typeof url !== 'string') return false
  const trimmed = url.trim()
  if (!trimmed) return false
  return DISCORD_PREFIXES.some((p) => trimmed.startsWith(p))
}
