// The last profile looked up from the form, kept only in this browser

const KEY = 'steamid'
const STEAMID = /^\d{17}$/

/** Storage is user-editable — anything but a SteamID64 counts as nothing */
export function rememberedId(storage: Pick<Storage, 'getItem'> | null = safeStorage()): string | null {
  try {
    const value = storage?.getItem(KEY) ?? null
    return value && STEAMID.test(value) ? value : null
  } catch {
    return null
  }
}

export function remember(steamid: string | null): void {
  try {
    if (steamid) localStorage.setItem(KEY, steamid)
    else localStorage.removeItem(KEY)
  } catch {
    // If storage is blocked, the profile is not remembered
  }
}

function safeStorage(): Storage | null {
  try {
    return localStorage
  } catch {
    return null
  }
}
