import type { Me } from '../src/types'
import type { GlobalPercent, PlayerAchievement, SchemaAchievement } from './isaac'

const API = 'https://api.steampowered.com'

const DAY_SEC = 24 * 3600
const HOUR_SEC = 3600
const PLAYER_TTL_SEC = 5 * 60
// Steam can accept the connection and then never answer
const TIMEOUT_MS = 8000

export class SteamError extends Error {
  constructor(readonly kind: 'private_profile' | 'no_game' | 'steam_unavailable') {
    super(kind)
  }
}

/**
 * Caches Steam responses at the edge. The API key must not end up in the cache key, so a fake URL is used as the key.
 * The Cache API is a no-op on workers.dev — caching only works on a custom domain.
 */
async function cached<T>(
  cacheKey: string,
  ttlSec: number | ((value: T) => number),
  load: () => Promise<T>,
): Promise<T> {
  const cache = caches.default
  const key = new Request(`https://cache.isaac-unlock-planner.internal/${cacheKey}`)
  const hit = await cache.match(key)
  if (hit) return hit.json<T>()
  const value = await load()
  await cache.put(
    key,
    new Response(JSON.stringify(value), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `max-age=${typeof ttlSec === 'function' ? ttlSec(value) : ttlSec}`,
      },
    }),
  )
  return value
}

async function getJson(url: string): Promise<{ status: number; body: unknown }> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  const body = await res.json().catch(() => null)
  return { status: res.status, body }
}

export function schema(key: string, appid: number): Promise<SchemaAchievement[]> {
  return cached(`schema/${appid}`, DAY_SEC, async () => {
    const { body } = await getJson(`${API}/ISteamUserStats/GetSchemaForGame/v2/?key=${key}&appid=${appid}`)
    const list = (body as { game?: { availableGameStats?: { achievements?: SchemaAchievement[] } } })?.game
      ?.availableGameStats?.achievements
    if (!list) throw new SteamError('steam_unavailable')
    return list
  })
}

export function globalPercents(appid: number): Promise<GlobalPercent[]> {
  return cached(`global/${appid}`, DAY_SEC, async () => {
    const { body } = await getJson(`${API}/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/?gameid=${appid}`)
    const list = (body as { achievementpercentages?: { achievements?: GlobalPercent[] } })?.achievementpercentages
      ?.achievements
    if (!list) throw new SteamError('steam_unavailable')
    return list
  })
}

export function playerAchievements(key: string, steamid: string, appid: number): Promise<PlayerAchievement[]> {
  return cached(`player/${steamid}/${appid}`, PLAYER_TTL_SEC, async () => {
    const { body } = await getJson(
      `${API}/ISteamUserStats/GetPlayerAchievements/v1/?key=${key}&steamid=${steamid}&appid=${appid}`,
    )
    const stats = (
      body as {
        playerstats?: { success?: boolean; error?: string; achievements?: PlayerAchievement[] }
      }
    )?.playerstats
    if (stats?.success) return stats.achievements ?? []
    // A private profile and a bad key are both 403 — only the JSON body tells them apart
    if (/not public/i.test(stats?.error ?? '')) throw new SteamError('private_profile')
    if (/no stats/i.test(stats?.error ?? '')) throw new SteamError('no_game')
    throw new SteamError('steam_unavailable')
  })
}

/** null for a nonexistent SteamID — Steam answers with an empty list */
export function summary(key: string, steamid: string): Promise<Me | null> {
  return cached(`summary/${steamid}`, PLAYER_TTL_SEC, async () => {
    const { body } = await getJson(`${API}/ISteamUser/GetPlayerSummaries/v2/?key=${key}&steamids=${steamid}`)
    const players = (body as { response?: { players?: { personaname: string; avatarmedium: string }[] } })?.response
      ?.players
    if (!players) throw new SteamError('steam_unavailable')
    const player = players[0]
    return player ? { steamid, name: player.personaname, avatar: player.avatarmedium } : null
  })
}

/**
 * Custom profile name → SteamID64. null if the name doesn't exist.
 * A miss is kept briefly — someone may be setting that name on Steam right now
 */
export function resolveVanity(key: string, vanity: string): Promise<string | null> {
  return cached(
    `vanity/${vanity.toLowerCase()}`,
    (id) => (id ? HOUR_SEC : PLAYER_TTL_SEC),
    async () => {
      const { body } = await getJson(
        `${API}/ISteamUser/ResolveVanityURL/v1/?key=${key}&vanityurl=${encodeURIComponent(vanity)}`,
      )
      const response = (body as { response?: { success?: number; steamid?: string } })?.response
      if (!response) throw new SteamError('steam_unavailable')
      return response.success === 1 && response.steamid ? response.steamid : null
    },
  )
}
