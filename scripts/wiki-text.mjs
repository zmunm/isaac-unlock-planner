// Pure wiki-markup helpers — used by fetch-wiki.mjs, guarded by tests
export const REPENTANCE_PLUS = 16

/** Wiki markup → plain text. Links keep their visible text; files and HTML tags are dropped */
export function plain(text) {
  return text
    .replace(/\[\[File:[^\]]*\]\]/g, '')
    .replace(/\[\[:?[^|\]]*\|([^\]]*)\]\]/g, '$1')
    .replace(/\[\[:?([^\]]*)\]\]/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/'{2,3}/g, '')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Item descriptions mix per-version text — text after a "[[File:Dlc ... cf-val-N ...]]" marker applies only to version N.
 * A marker lasts until the next marker or <br>. Keep only the Repentance+ text
 */
export function currentDescription(wikitext) {
  const kept = []
  for (const line of wikitext.replace(/\[\[Category:[^\]]*\]\]/g, '').split(/<br\s*\/?>/)) {
    const parts = line.split(/(\[\[File:Dlc [^\]]*?cf-val-\d+[^\]]*\]\])/)
    let applies = true
    for (const part of parts) {
      const marker = part.match(/^\[\[File:Dlc [^\]]*?cf-val-(\d+)/)
      if (marker) applies = (Number(marker[1]) & REPENTANCE_PLUS) !== 0
      else if (applies) kept.push(part)
    }
  }
  return plain(kept.join(' '))
}

/** Challenge goal cell — the link name if it's a boss portrait file, else plain text */
export function challengeGoal(wikitext) {
  const portrait = wikitext.match(/\[\[File:Boss [^\]]*?link=([^\]|]+)/)
  return portrait ? portrait[1].replace(/ \(Boss\)$/, '') : plain(wikitext)
}

/** Starting-items cell — one per line; lines removed in Repentance+ are dropped */
export function challengeItems(wikitext) {
  return wikitext
    .split(/<br\s*\/?>/)
    .map((line) => currentDescription(line))
    .filter(Boolean)
}

/** Boss portrait file name in a challenge goal cell (null if none) */
export function challengeGoalFile(wikitext) {
  return wikitext.match(/\[\[File:(Boss [^|\]]*?portrait\.png)/)?.[1] ?? null
}

/** Challenge number when the condition is nothing but beating that challenge — "Beat X (challenge #19), defeat Lokii…" is not */
export function challengeReward(requirement) {
  const n = requirement.match(/^Complete .+ \(challenge #(\d+)\)$/)?.[1]
  return n ? Number(n) : null
}

/**
 * Name → achievement id. Names repeat ("Suicide King" is #120 and #160), and the wiki then
 * writes the later ones as "Suicide King 2" — the nth achievement of that name by id.
 */
export function achievementIdByName(achievements) {
  const byName = new Map()
  for (const a of [...achievements].sort((x, y) => Number(x.id) - Number(y.id))) {
    const key = a.name.toLowerCase()
    byName.set(key, [...(byName.get(key) ?? []), Number(a.id)])
  }
  return (ref) => {
    const key = ref.toLowerCase()
    const exact = byName.get(key)
    if (exact?.length === 1) return exact[0]
    const [, base, nth] = key.match(/^(.+) (\d+)$/) ?? []
    return (base && byName.get(base)?.[Number(nth) - 1]) ?? null
  }
}
