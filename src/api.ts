import type { ApiError, IsaacProgress, Me } from './types'

export type Result<T> = { ok: true; data: T } | { ok: false; error: ApiError['error'] }

async function get<T>(path: string): Promise<Result<T>> {
  try {
    const res = await fetch(path)
    const body = await res.json()
    return res.ok ? { ok: true, data: body as T } : { ok: false, error: (body as ApiError).error }
  } catch {
    return { ok: false, error: 'steam_unavailable' }
  }
}

export const fetchIsaac = (steamid: string) => get<IsaacProgress>(`/api/isaac?steamid=${encodeURIComponent(steamid)}`)
/** Profile URL, SteamID, or custom name → that player */
export const resolveProfile = (profile: string) => get<Me>(`/api/resolve?profile=${encodeURIComponent(profile)}`)
