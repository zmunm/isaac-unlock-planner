import { beforeEach, describe, expect, it, vi } from 'vitest'
import worker, { type Env } from './index'

const ORIGIN = 'https://isaac.example'
const OTHER = '76561198000000002'

const limit = vi.fn(async () => ({ success: true }))
const env = {
  ASSETS: { fetch: vi.fn(async () => new Response('page')) },
  STEAM_API_KEY: 'k',
  LOOKUP_LIMIT: { limit },
} as unknown as Env

/** Picks the Steam response by URL */
function steam(players: unknown[] = [{ personaname: 'p', avatarmedium: 'a' }]) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.includes('GetPlayerSummaries')) return Response.json({ response: { players } })
      if (url.includes('GetSchemaForGame')) return Response.json({ game: { availableGameStats: { achievements: [] } } })
      if (url.includes('GetPlayerAchievements'))
        return Response.json({ playerstats: { success: true, achievements: [] } })
      if (url.includes('GetGlobalAchievementPercentages'))
        return Response.json({ achievementpercentages: { achievements: [] } })
      return new Response('?', { status: 500 })
    }),
  )
}

async function call(path: string) {
  return worker.fetch(new Request(ORIGIN + path), env)
}

beforeEach(() => {
  vi.unstubAllGlobals()
  vi.stubGlobal('caches', { default: { match: vi.fn(async () => undefined), put: vi.fn() } })
  limit.mockClear()
  steam()
})

describe('/api/isaac', () => {
  it('refuses a missing or malformed steamid', async () => {
    for (const path of ['/api/isaac', '/api/isaac?steamid=gaben']) {
      const res = await call(path)
      expect(res.status).toBe(404)
      expect(await res.json()).toEqual({ error: 'profile_not_found' })
    }
  })

  it('rate-limits every lookup', async () => {
    expect((await call(`/api/isaac?steamid=${OTHER}`)).status).toBe(200)
    expect(limit).toHaveBeenCalledTimes(1)
  })

  it('answers 429 when the limit is hit', async () => {
    limit.mockResolvedValueOnce({ success: false })
    expect((await call(`/api/isaac?steamid=${OTHER}`)).status).toBe(429)
  })
})

describe('/api/resolve', () => {
  it('reports an id Steam does not know as not found, not as an outage', async () => {
    steam([])
    const res = await call(`/api/resolve?profile=${OTHER}`)
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'profile_not_found' })
  })
})

describe('routing', () => {
  it('answers unknown api paths with a typed 404', async () => {
    const res = await call('/api/nope')
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'not_found' })
  })

  it('no longer serves the removed login and image routes', async () => {
    for (const path of ['/api/auth/login', '/api/me']) expect((await call(path)).status).toBe(404)
  })

  it('hands everything else to the static assets', async () => {
    expect(await (await call('/somewhere')).text()).toBe('page')
  })
})
