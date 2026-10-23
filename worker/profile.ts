// Steam profile as a user pastes it → a SteamID64 or a custom URL (vanity) name

export type ProfileRef = { steamid: string } | { vanity: string }

const STEAMID = /^\d{17}$/
const VANITY = /^[A-Za-z0-9_-]{2,32}$/

export function parseProfile(input: string): ProfileRef | null {
  const text = input.trim().replace(/\/+$/, '')
  if (STEAMID.test(text)) return { steamid: text }

  const url = text.match(/^(?:https?:\/\/)?(?:www\.)?steamcommunity\.com\/(profiles|id)\/([^/?#]+)/i)
  if (url) {
    const [, kind, value] = url
    if (kind.toLowerCase() === 'profiles') return STEAMID.test(value) ? { steamid: value } : null
    return VANITY.test(value) ? { vanity: value } : null
  }
  // Bare custom name, no URL
  return VANITY.test(text) ? { vanity: text } : null
}

export function isSteamId(value: string | null): value is string {
  return value !== null && STEAMID.test(value)
}
