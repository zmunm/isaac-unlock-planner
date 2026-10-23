// Fetches achievement unlock conditions and unlocked-item quality from the Isaac wiki (wiki.gg) Cargo tables into src/data/isaac.json.
// Wiki content is CC BY-SA 4.0 — do not remove the attribution in the page footer.
// wiki.gg serves a Cloudflare challenge (403) to browser UAs. Use a short bot UA.
import { writeFileSync } from 'node:fs'
import {
  achievementIdByName,
  challengeGoal,
  challengeGoalFile,
  challengeItems,
  challengeReward,
  currentDescription,
  plain,
  REPENTANCE_PLUS,
} from './wiki-text.mjs'

const API = 'https://bindingofisaacrebirth.wiki.gg/api.php'
const UA = 'isaac-unlock-planner/0.1'

async function cargo(tables, fields, where) {
  const rows = []
  for (let offset = 0; ; offset += 500) {
    const params = new URLSearchParams({
      action: 'cargoquery',
      format: 'json',
      limit: '500',
      offset: String(offset),
      tables,
      fields,
    })
    if (where) params.set('where', where)
    const res = await fetch(`${API}?${params}`, { headers: { 'User-Agent': UA } })
    if (!res.ok) throw new Error(`${tables}: HTTP ${res.status}`)
    const body = await res.json()
    if (body.error) throw new Error(`${tables}: ${body.error.info}`)
    const page = body.cargoquery.map((r) => r.title)
    rows.push(...page)
    if (page.length < 500) return rows
  }
}

/** Each entry has one row per version — the row that includes Repentance+ is current */
function current(rows, key, value) {
  const byName = new Map()
  for (const r of rows) {
    const now = (Number(r.dlc) & REPENTANCE_PLUS) !== 0
    const prev = byName.get(r[key])
    if (!prev || (now && !prev.now)) byName.set(r[key], { value: value(r), now })
  }
  return new Map([...byName].map(([k, v]) => [k, v.value]))
}

/**
 * File name → image URL. Special:FilePath is blocked by the challenge; direct /images/ links work.
 * Queries up to 50 at a time
 */
async function imageUrls(files) {
  const urls = new Map()
  const list = [...new Set(files)]
  for (let i = 0; i < list.length; i += 50) {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      prop: 'imageinfo',
      iiprop: 'url',
      titles: list
        .slice(i, i + 50)
        .map((f) => `File:${f}`)
        .join('|'),
    })
    const body = await (await fetch(`${API}?${params}`, { headers: { 'User-Agent': UA } })).json()
    const normalized = new Map((body.query.normalized ?? []).map((n) => [n.to, n.from]))
    for (const page of Object.values(body.query.pages)) {
      const url = page.imageinfo?.[0]?.url
      if (url) urls.set((normalized.get(page.title) ?? page.title).replace(/^File:/, ''), url)
    }
  }
  return urls
}

/** Grid column headers — the in-game completion-mark icons. Hard marks are _Hard; Greedier is Greed_Hard */
const MARK_FILES = {
  momsHeartHard: 'Completion_Heart_Hard.png',
  isaac: 'Completion_Cathedral.png',
  blueBaby: 'Completion_Chest.png',
  satan: 'Completion_Sheol.png',
  lamb: 'Completion_DarkRoom.png',
  megaSatan: 'Completion_Brimstone.png',
  bossRush: 'Completion_BossRush.png',
  hush: 'Completion_BlueWomb.png',
  delirium: 'Completion_Void.png',
  mother: 'Completion_Mother.png',
  beast: 'Completion_Beast.png',
  greed: 'Completion_Greed.png',
  greedier: 'Completion_Greed_Hard.png',
}

/** Wiki character names that differ from the achievement text */
const PLAYER_ALIAS = { 'Jacob and Esau': 'Jacob' }
/** Character name in the challenge table → name used in achievement text */
const CHALLENGE_ALIAS = Object.fromEntries(Object.entries(PLAYER_ALIAS).map(([full, short]) => [short, full]))

const [achievements, collectibles, qualities, collectibleImages, playerImages, challengeRows] = await Promise.all([
  cargo('achievement', 'id,name,requirements'),
  cargo('collectible', 'alias,link,unlocked_by,description', "unlocked_by IS NOT NULL AND unlocked_by<>''"),
  cargo('collectible_quality', 'collectible,quality,dlc'),
  cargo('collectible_image', 'collectible,file,dlc'),
  cargo('player_image', 'player,file,dlc'),
  cargo('challenge', 'alias,number,used_character,goal,unlocked_by,unlocks,item,blindfolded'),
])

const quality = current(qualities, 'collectible', (r) => Number(r.quality))
const itemFile = current(collectibleImages, 'collectible', (r) => r.file)
const playerFile = current(playerImages, 'player', (r) => r.file)

const unlocksByAchievement = new Map()
for (const c of collectibles) {
  const name = c.alias || c.link
  const list = unlocksByAchievement.get(c['unlocked by']) ?? []
  list.push({
    name,
    quality: quality.get(name) ?? null,
    file: itemFile.get(name),
    effect: currentDescription(c.description ?? ''),
  })
  unlocksByAchievement.set(c['unlocked by'], list)
}

const characterNames = [...new Set(achievements.map((a) => plain(a.requirements).match(/ as (.+)$/)?.[1]))].filter(
  (name) => name && playerFile.has(PLAYER_ALIAS[name] ?? name),
)
const urls = await imageUrls([
  ...[...unlocksByAchievement.values()]
    .flat()
    .map((u) => u.file)
    .filter(Boolean),
  ...characterNames.map((name) => playerFile.get(PLAYER_ALIAS[name] ?? name)),
  ...Object.values(MARK_FILES),
  ...challengeRows.map((c) => challengeGoalFile(c.goal ?? '')).filter(Boolean),
])
const marks = Object.fromEntries(Object.entries(MARK_FILES).map(([goal, file]) => [goal, urls.get(file) ?? null]))
const characters = Object.fromEntries(
  characterNames.map((name) => [name, urls.get(playerFile.get(PLAYER_ALIAS[name] ?? name)) ?? null]),
)

const data = achievements
  .map((a) => ({
    id: Number(a.id),
    name: a.name,
    // Conditions also mix per-version text (Azazel/Lazarus hard marks differ by version) — keep Repentance+ only
    requirement: currentDescription(a.requirements),
    unlocks: (unlocksByAchievement.get(a.name) ?? []).map(({ name, quality, file, effect }) => ({
      name,
      quality,
      image: file ? (urls.get(file) ?? null) : null,
      effect,
    })),
  }))
  .sort((a, b) => a.id - b.id)

const idByName = achievementIdByName(achievements)
// Challenge reward achievements share names ("2 new pills") — link them via "(challenge #N)" in the condition text
const rewardsOf = new Map()
for (const a of data) {
  const n = challengeReward(a.requirement)
  if (n) rewardsOf.set(n, [...(rewardsOf.get(n) ?? []), a.id])
}
const challenges = challengeRows
  .map((c) => ({
    number: Number(c.number),
    name: c.alias,
    character: CHALLENGE_ALIAS[c['used character']] ?? c['used character'],
    goal: challengeGoal(c.goal ?? ''),
    goalImage: urls.get(challengeGoalFile(c.goal ?? '') ?? '') ?? null,
    items: challengeItems(c.item ?? ''),
    blindfolded: c.blindfolded === '1',
    // The wiki capitalizes inconsistently ("Aprils fool")
    requires: c['unlocked by'] ? idByName(c['unlocked by']) : null,
    rewards: rewardsOf.get(Number(c.number)) ?? [],
  }))
  .sort((a, b) => a.number - b.number)

writeFileSync(
  new URL('../src/data/isaac.json', import.meta.url),
  `${JSON.stringify(
    {
      source: 'https://bindingofisaacrebirth.wiki.gg (CC BY-SA 4.0)',
      characters,
      marks,
      challenges,
      achievements: data,
    },
    null,
    1,
  )}\n`,
)
const items = data.flatMap((a) => a.unlocks)
console.log(
  `achievements=${data.length} items=${items.length} item images=${items.filter((u) => u.image).length}`,
  `characters=${Object.keys(characters).length} with image=${Object.values(characters).filter(Boolean).length}`,
  `challenges=${challenges.length} linked=${challenges.filter((c) => c.rewards.length).length}`,
  `marks=${Object.values(marks).filter(Boolean).length}/${Object.keys(marks).length}`,
)
