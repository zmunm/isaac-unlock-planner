import type { ApiError } from '../src/types'
import { ISAAC_APPID, mergeProgress } from './isaac'
import { isSteamId, parseProfile } from './profile'
import { globalPercents, playerAchievements, resolveVanity, SteamError, schema, summary } from './steam'

export interface Env {
  ASSETS: Fetcher
  STEAM_API_KEY: string
  /** Every lookup spends the API key's quota */
  LOOKUP_LIMIT: RateLimit
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })

const fail = (error: ApiError['error'], status: number) => json({ error } satisfies ApiError, status)

/** An IPv6 client owns a whole /64 — count the prefix, or rotating addresses walks past the limit */
export function rateKey(ip: string | null): string {
  if (!ip) return 'local'
  if (!ip.includes(':')) return ip
  const [head, tail = ''] = ip.split('::')
  const left = head ? head.split(':') : []
  const right = tail ? tail.split(':') : []
  const groups = [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill('0'), ...right]
  return `${groups
    .slice(0, 4)
    .map((g) => Number.parseInt(g, 16).toString(16))
    .join(':')}::/64`
}

async function withinLimit(req: Request, env: Env): Promise<boolean> {
  return (await env.LOOKUP_LIMIT.limit({ key: rateKey(req.headers.get('CF-Connecting-IP')) })).success
}

function steamFailure(e: unknown): Response {
  if (e instanceof SteamError) {
    if (e.kind === 'private_profile') return fail('private_profile', 403)
    if (e.kind === 'no_game') return fail('no_game', 404)
  }
  // Steam URLs carry the API key in the query — never let one reach the logs
  console.error('steam call failed', String(e).replace(/key=[^&\s]+/g, 'key=…'))
  return fail('steam_unavailable', 502)
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)

    // Only public profiles are readable
    if (url.pathname === '/api/resolve') {
      const ref = parseProfile(url.searchParams.get('profile') ?? '')
      if (!ref) return fail('profile_not_found', 404)
      if (!(await withinLimit(req, env))) return fail('rate_limited', 429)
      try {
        const steamid = 'steamid' in ref ? ref.steamid : await resolveVanity(env.STEAM_API_KEY, ref.vanity)
        const who = steamid ? await summary(env.STEAM_API_KEY, steamid) : null
        return who ? json(who) : fail('profile_not_found', 404)
      } catch (e) {
        return steamFailure(e)
      }
    }

    if (url.pathname === '/api/isaac') {
      const steamid = url.searchParams.get('steamid')
      if (!isSteamId(steamid)) return fail('profile_not_found', 404)
      if (!(await withinLimit(req, env))) return fail('rate_limited', 429)
      try {
        const [s, p, g] = await Promise.all([
          schema(env.STEAM_API_KEY, ISAAC_APPID),
          playerAchievements(env.STEAM_API_KEY, steamid, ISAAC_APPID),
          globalPercents(ISAAC_APPID),
        ])
        return json(mergeProgress(s, p, g))
      } catch (e) {
        return steamFailure(e)
      }
    }

    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return fail('not_found', 404)
    return env.ASSETS.fetch(req)
  },
} satisfies ExportedHandler<Env>
