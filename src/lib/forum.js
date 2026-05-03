/**
 * isForumEnabled — kill-switch gate for the forum entry-points
 * (Navbar nav item + Footer Communities row).
 *
 * Returns true ONLY when social.json contains a forum row that is
 * enabled AND has a non-empty url. PlatformTileRow handles its own
 * disabled-state rendering and does NOT use this helper.
 *
 * Branches:
 *   (a) social array missing/non-array → false
 *   (b) no forum row in array          → false
 *   (c) forum row enabled !== true     → false
 *   (d) url missing/empty/non-string   → false
 *
 * @param {unknown} social
 * @returns {boolean}
 */
export function isForumEnabled(social) {
  if (!Array.isArray(social)) return false
  const forum = social.find((entry) => entry && entry.platform === 'forum')
  if (!forum) return false
  if (forum.enabled !== true) return false
  if (typeof forum.url !== 'string' || forum.url.length === 0) return false
  return true
}
