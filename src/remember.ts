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

/** Whose profile the page shows: ?id= first, else the remembered one. ?lookup asks for the form without forgetting */
export function profileRef(search: string, storage: Pick<Storage, 'getItem'> | null = safeStorage()): string | null {
  const params = new URLSearchParams(search)
  if (params.has('lookup')) return null
  return params.get('id')?.trim() || rememberedId(storage)
}

export function remember(steamid: string): void {
  try {
    localStorage.setItem(KEY, steamid)
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
