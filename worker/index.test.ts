import { beforeEach, describe, expect, it, vi } from 'vitest'
import worker, { type Env, rateKey } from './index'

const ORIGIN = 'https://isaac.example'
const OTHER = '76561198000000002'

const limit = vi.fn(async () => ({ success: true }))
const env = {
  ASSETS: { fetch: vi.fn(async () => new Response('page')) },
  STEAM_API_KEY: 'SECRETKEY123',
  LOOKUP_LIMIT: { limit },
} as unknown as Env

/** Picks the Steam response by URL */
function steam(
  players: unknown[] = [{ personaname: 'p', avatarmedium: 'a' }],
  playerAchievements = () => Response.json({ playerstats: { success: true, achievements: [] } }),
) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.includes('GetPlayerSummaries')) return Response.json({ response: { players } })
      if (url.includes('GetSchemaForGame')) return Response.json({ game: { availableGameStats: { achievements: [] } } })
      if (url.includes('GetPlayerAchievements')) return playerAchievements()
      if (url.includes('GetGlobalAchievementPercentages'))
        return Response.json({ achievementpercentages: { achievements: [] } })
      return new Response('?', { status: 500 })
    }),
  )
}

async function call(path: string, headers: HeadersInit = {}) {
  return worker.fetch(new Request(ORIGIN + path, { headers }), env)
}

const edge = new Map<string, Response>()
const put = vi.fn(async (key: Request, res: Response) => {
  edge.set(key.url, res.clone())
})
const match = async (key: Request) => edge.get(key.url)?.clone()

beforeEach(() => {
  vi.unstubAllGlobals()
  edge.clear()
  vi.stubGlobal('caches', { default: { match, put } })
  vi.spyOn(console, 'error').mockImplementation(() => {})
  limit.mockClear()
  put.mockClear()
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

  it('tells a private profile from a rejected API key — Steam answers 403 to both', async () => {
    steam(undefined, () =>
      Response.json({ playerstats: { error: 'Profile is not public', success: false } }, { status: 403 }),
    )
    expect((await call(`/api/isaac?steamid=${OTHER}`)).status).toBe(403)

    steam(undefined, () => new Response('<html>Forbidden. Please verify your key= parameter.</html>', { status: 403 }))
    const res = await call(`/api/isaac?steamid=${OTHER}`)
    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ error: 'steam_unavailable' })
    expect(console.error).toHaveBeenCalled()
  })

  it('gives up on a Steam call that never answers', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => {
      throw new DOMException('timed out', 'TimeoutError')
    })
    vi.stubGlobal('fetch', fetchMock)
    expect((await call(`/api/isaac?steamid=${OTHER}`)).status).toBe(502)
    for (const [, init] of fetchMock.mock.calls) expect(init?.signal).toBeInstanceOf(AbortSignal)
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

describe('Steam calls', () => {
  it('serves a repeat lookup from the edge cache', async () => {
    await call(`/api/isaac?steamid=${OTHER}`)
    await call(`/api/isaac?steamid=${OTHER}`)
    expect(vi.mocked(fetch).mock.calls.filter(([url]) => String(url).includes('GetPlayerAchievements'))).toHaveLength(1)
  })

  it('keeps the API key out of cache keys', async () => {
    await call(`/api/isaac?steamid=${OTHER}`)
    expect(put).toHaveBeenCalled()
    for (const [key] of put.mock.calls) expect(key.url).not.toContain('SECRETKEY123')
  })

  it('caches nothing when Steam refuses — a private profile can go public a minute later', async () => {
    steam(undefined, () => Response.json({ playerstats: { error: 'Profile is not public', success: false } }))
    await call(`/api/isaac?steamid=${OTHER}`)
    for (const [key] of put.mock.calls) expect(key.url).not.toContain('/player/')
  })

  it('keeps the API key out of the logs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        throw new Error(`failed ${url}`)
      }),
    )
    await call(`/api/isaac?steamid=${OTHER}`)
    expect(console.error).toHaveBeenCalled()
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('SECRETKEY123')
  })

  it('remembers an unknown custom URL only briefly, a known one longer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.includes('ResolveVanityURL')
          ? Response.json({ response: url.includes('nobody') ? { success: 42 } : { success: 1, steamid: OTHER } })
          : Response.json({ response: { players: [{ personaname: 'p', avatarmedium: 'a' }] } }),
      ),
    )
    const ttlOf = async (name: string) => {
      put.mockClear()
      await call(`/api/resolve?profile=${name}`)
      const [, res] = put.mock.calls.find(([key]) => key.url.includes('/vanity/'))!
      return Number(res.headers.get('Cache-Control')!.replace('max-age=', ''))
    }
    expect(await ttlOf('nobody')).toBe(300)
    expect(await ttlOf('somebody')).toBe(3600)
  })
})

describe('rate limit', () => {
  it('counts profile lookups too', async () => {
    await call(`/api/resolve?profile=${OTHER}`)
    expect(limit).toHaveBeenCalledTimes(1)
  })

  it('limits per client IP', async () => {
    await call(`/api/isaac?steamid=${OTHER}`, { 'CF-Connecting-IP': '203.0.113.7' })
    expect(limit).toHaveBeenCalledWith({ key: '203.0.113.7' })
  })

  it('counts an IPv6 client by its /64, however the address is written', () => {
    expect(rateKey('2001:db8:1:2:3:4:5:6')).toBe('2001:db8:1:2::/64')
    expect(rateKey('2001:db8:1:2:ffff::1')).toBe('2001:db8:1:2::/64')
    expect(rateKey('2001:0db8:0001:0002::')).toBe('2001:db8:1:2::/64')
    expect(rateKey('2001:db8::1')).toBe('2001:db8:0:0::/64')
    expect(rateKey('203.0.113.7')).toBe('203.0.113.7')
  })
})

describe('routing', () => {
  it('answers unknown api paths with a typed 404', async () => {
    for (const path of ['/api/nope', '/api']) {
      const res = await call(path)
      expect(res.status).toBe(404)
      expect(await res.json()).toEqual({ error: 'not_found' })
    }
  })

  it('no longer serves the removed login and image routes', async () => {
    for (const path of ['/api/auth/login', '/api/me']) expect((await call(path)).status).toBe(404)
  })

  it('hands everything else to the static assets', async () => {
    expect(await (await call('/somewhere')).text()).toBe('page')
  })
})
