import {
  ALL_CHARACTERS,
  ANY_CHARACTER,
  BASE_CHARACTERS,
  CONDITIONAL_GOALS,
  type ConditionalGoal,
  type Goal,
  isConditionalGoal,
  parseRequirement,
  type Requirement,
  TAINTED_OF,
} from './requirements'

export interface WikiAchievement {
  id: number
  name: string
  requirement: string
  unlocks: Unlock[]
}

interface Unlock {
  name: string
  quality: number | null
  image: string | null
  /** Effect as of Repentance+ (English, from the wiki) */
  effect: string
}

export type Mode = 'normal' | 'hard' | 'greed' | 'greedier' | 'challenge'

export interface Challenge {
  number: number
  name: string
  /** Character fixed by the challenge — usable even if not unlocked */
  character: string
  goal: string
  /** Goal boss portrait — absent for challenges whose goal is a floor */
  goalImage: string | null
  items: string[]
  blindfolded: boolean
  /** Achievement that unlocks this challenge. null if unlocked from the start */
  requires: number | null
  /** Achievement granted on completion */
  rewards: number[]
}

export type RouteId = 'momsHeart' | 'chest' | 'darkRoom' | 'mother' | 'beast' | 'greed' | 'greedier' | 'challenge'

interface Route {
  id: RouteId
  /** Main goals of this run — earned by playing it through */
  core: Goal[]
  /** Also attemptable in the same run, but with conditions */
  bonus: Goal[]
  greed?: Mode
}

const ROUTES: Route[] = [
  // First, so a run that reaches nothing past Mom's Heart is not named after the Chest or the Dark Room
  { id: 'momsHeart', core: ['mom', 'momsHeart', 'momsHeartHard'], bonus: [...CONDITIONAL_GOALS] },
  { id: 'chest', core: ['mom', 'momsHeart', 'momsHeartHard', 'isaac', 'blueBaby'], bonus: [...CONDITIONAL_GOALS] },
  { id: 'darkRoom', core: ['mom', 'momsHeart', 'momsHeartHard', 'satan', 'lamb'], bonus: [...CONDITIONAL_GOALS] },
  // The alternate path also goes through Mom in the Mausoleum
  { id: 'mother', core: ['mom', 'mother'], bonus: [] },
  { id: 'beast', core: ['mom', 'homeCloset', 'beast'], bonus: [] },
  { id: 'greed', core: ['greed'], bonus: [], greed: 'greed' },
  // Beating Greedier also awards the Greed mark
  { id: 'greedier', core: ['greedier', 'greed'], bonus: [], greed: 'greedier' },
]

/**
 * Achievements a goal needs before it can be reached, from the wiki's "unlocked by" lines:
 * The Womb #4, It Lives! #34 (Cathedral, Sheol), The Polaroid #57, The Negative #78, Angels #155 (key pieces),
 * Blue Womb #234, New Area #320 (The Void), Greedier! #341, A Secret Exit #407 (Corpse), A Strange Door #635 (Home)
 */
export const GOAL_NEEDS: Partial<Record<Goal, number[]>> = {
  momsHeart: [4],
  momsHeartHard: [4],
  isaac: [4, 34],
  satan: [4, 34],
  blueBaby: [4, 34, 57],
  lamb: [4, 34, 78],
  megaSatan: [155],
  hush: [234],
  delirium: [320],
  greedier: [341],
  mother: [407],
  beast: [635],
  homeCloset: [635],
}

const isGoalOpen = (goal: Goal, achieved: Set<number>): boolean =>
  (GOAL_NEEDS[goal] ?? []).every((id) => achieved.has(id))

export interface PlannedAchievement {
  id: number
  name: string
  unlocks: Unlock[]
  /** Earned via a conditional goal */
  bonus: boolean
  /** Fills only part of a multi-run condition */
  partial: boolean
  /** Attached conditions — goals gated by time or keys, like Boss Rush and Hush */
  conditions?: ConditionalGoal[]
  /** Earnable only on Hard mode */
  hardOnly?: boolean
  /** Any character */
  anyCharacter?: boolean
  /** Challenges this unlocks */
  opens?: Challenge[]
}

export interface Plan {
  character: string
  route: RouteId
  mode: Mode
  gains: PlannedAchievement[]
  score: number
  challenge?: Challenge
}

/** Is this character selectable — base characters need the same-named achievement, tainted ones the Home closet */
export function playableCharacters(achieved: Set<number>, wiki: WikiAchievement[]): Set<string> {
  const byName = new Map(wiki.map((a) => [a.name, a.id]))
  const playable = new Set<string>(['Isaac'])
  for (const base of BASE_CHARACTERS) {
    const id = byName.get(base)
    if (id !== undefined && achieved.has(id)) playable.add(base)
  }
  for (const a of wiki) {
    const r = parseRequirement(a.requirement)
    if (r?.goals[0] === 'homeCloset' && achieved.has(a.id)) playable.add(TAINTED_OF[r.character])
  }
  return playable
}

function qualityBonus(unlocks: PlannedAchievement['unlocks']): number {
  const best = Math.max(-1, ...unlocks.map((u) => u.quality ?? -1))
  return best >= 4 ? 1 : best === 3 ? 0.5 : 0
}

function scoreOf(gains: PlannedAchievement[], wiki: Map<number, WikiAchievement>): number {
  return gains.reduce((sum, g) => {
    const base = g.partial ? 0.25 : g.bonus ? 0.6 : 1
    // If a challenge gets unlocked, count its rewards up front too
    const opened = (g.opens ?? []).reduce((s, c) => {
      const rewards = c.rewards.flatMap((id) => wiki.get(id)?.unlocks ?? [])
      return s + 0.5 + qualityBonus(rewards)
    }, 0)
    return sum + base + qualityBonus(g.unlocks) + opened
  }, 0)
}

export function isChallengeOpen(c: Challenge, achieved: Set<number>): boolean {
  return c.requires === null || achieved.has(c.requires)
}

/** What completing the challenge newly grants — rewards already earned are excluded */
export function challengeGains(
  c: Challenge,
  achieved: Set<number>,
  byId: Map<number, WikiAchievement>,
): PlannedAchievement[] {
  return c.rewards
    .filter((id) => !achieved.has(id))
    .map((id) => byId.get(id))
    .filter((a): a is WikiAchievement => a !== undefined)
    .map((a) => ({ id: a.id, name: a.name, unlocks: a.unlocks, bonus: false, partial: false }))
}

/** One remaining challenge = one run. Unlocked ones only */
export function planChallenges(achieved: Set<number>, wiki: WikiAchievement[], challenges: Challenge[]): Plan[] {
  const byId = new Map(wiki.map((a) => [a.id, a]))
  const plans: Plan[] = []
  for (const c of challenges) {
    if (!isChallengeOpen(c, achieved)) continue
    const gains = challengeGains(c, achieved, byId)
    if (gains.length === 0) continue
    plans.push({
      character: c.character,
      route: 'challenge',
      mode: 'challenge',
      gains,
      score: scoreOf(gains, byId),
      challenge: c,
    })
  }
  return plans
}

interface Context {
  achieved: Set<number>
  todo: { a: WikiAchievement; r: Requirement }[]
  byId: Map<number, WikiAchievement>
  /** achievement id → challenges it unlocks */
  opens: Map<number, Challenge[]>
}

function contextOf(achieved: Set<number>, wiki: WikiAchievement[], challenges: Challenge[]): Context {
  const opens = new Map<number, Challenge[]>()
  for (const c of challenges) {
    if (c.requires !== null) opens.set(c.requires, [...(opens.get(c.requires) ?? []), c])
  }
  return { achieved, todo: remaining(achieved, wiki), byId: new Map(wiki.map((a) => [a.id, a])), opens }
}

function planFor(character: string, route: Route, { achieved, todo, byId, opens }: Context): Plan | null {
  const reachable = new Set([...route.core, ...route.bonus].filter((g) => isGoalOpen(g, achieved)))
  const gains: PlannedAchievement[] = []
  let needsHard = false

  for (const { a, r } of todo) {
    const any = r.character === ANY_CHARACTER
    if (r.character !== character && !any) continue
    const hit = r.goals.filter((g) => reachable.has(g))
    if (hit.length === 0) continue
    if (hit.includes('momsHeartHard')) needsHard = true
    const bonus = hit.every((g) => route.bonus.includes(g))
    gains.push({
      id: a.id,
      name: a.name,
      unlocks: a.unlocks,
      bonus,
      partial: hit.length < r.goals.length,
      conditions: bonus ? hit.filter(isConditionalGoal) : undefined,
      anyCharacter: any || undefined,
      opens: opens.get(a.id),
    })
  }
  // Any-character extras alone are no reason to pick this character — the "any character" run covers those
  if (gains.length === 0 || (character !== ANY_CHARACTER && !gains.some((g) => !g.anyCharacter))) return null

  const score = scoreOf(gains, byId)
  const mode: Mode = route.greed ?? (needsHard ? 'hard' : 'normal')
  return { character, route: route.id, mode, gains, score }
}

function remaining(achieved: Set<number>, wiki: WikiAchievement[]) {
  return wiki
    .filter((a) => !achieved.has(a.id))
    .map((a) => ({ a, r: parseRequirement(a.requirement) }))
    .filter((x): x is { a: WikiAchievement; r: Requirement } => x.r !== null)
}

/** Groups remaining achievements into runs, highest score first. One run per character; each challenge is its own run */
export function planRuns(
  achieved: Set<number>,
  wiki: WikiAchievement[],
  limit = 5,
  challenges: Challenge[] = [],
): Plan[] {
  const playable = playableCharacters(achieved, wiki)
  const context = contextOf(achieved, wiki, challenges)

  // Only the best run per character — the same character repeated with different routes leaves fewer real choices
  const plans: Plan[] = []
  for (const character of [...playable, ANY_CHARACTER]) {
    const best = ROUTES.map((route) => planFor(character, route, context))
      .filter((p): p is Plan => p !== null)
      .sort((a, b) => b.score - a.score)[0]
    if (best) plans.push(best)
  }
  plans.push(...planChallenges(achieved, wiki, challenges))
  return plans.sort((a, b) => b.score - a.score).slice(0, limit)
}

export type GroupId = 'anyEnding' | 'chest' | 'darkRoom' | 'both' | 'mother' | 'beast' | 'greed'

const CHARACTER_GROUPS: { id: GroupId; goals: Goal[] }[] = [
  { id: 'anyEnding', goals: ['momsHeartHard', 'bossRush', 'hush', 'megaSatan', 'delirium'] },
  { id: 'chest', goals: ['isaac', 'blueBaby'] },
  { id: 'darkRoom', goals: ['satan', 'lamb'] },
  { id: 'both', goals: ['isaac', 'blueBaby', 'satan', 'lamb'] },
  { id: 'mother', goals: ['mother'] },
  { id: 'beast', goals: ['homeCloset', 'beast'] },
  { id: 'greed', goals: ['greed', 'greedier'] },
]

export interface CharacterGroup {
  id: GroupId
  gains: PlannedAchievement[]
}

/** One character's remaining marks, grouped by route. Each mark goes into the first group that covers all its goals */
export function characterRoutes(character: string, achieved: Set<number>, wiki: WikiAchievement[]): CharacterGroup[] {
  const groups = CHARACTER_GROUPS.map((g) => ({ id: g.id, gains: [] as PlannedAchievement[] }))
  for (const { a, r } of remaining(achieved, wiki)) {
    if (r.character !== character) continue
    const i = CHARACTER_GROUPS.findIndex((g) => r.goals.every((goal) => g.goals.includes(goal)))
    if (i < 0) continue
    const conditions = r.goals.filter(isConditionalGoal)
    groups[i].gains.push({
      id: a.id,
      name: a.name,
      unlocks: a.unlocks,
      bonus: conditions.length > 0,
      partial: false,
      conditions: conditions.length > 0 ? conditions : undefined,
      hardOnly: r.goals.includes('momsHeartHard') || undefined,
    })
  }
  return groups.filter((g) => g.gains.length > 0)
}

export interface CharacterStatus {
  character: string
  playable: boolean
  /** Number of remaining character marks */
  remaining: number
  /** How to unlock an unselectable character — the wiki sentence, or for tainted characters the base character that opens the closet */
  unlock: { requirement: string } | { closetAs: string } | null
}

export function characterStatuses(achieved: Set<number>, wiki: WikiAchievement[]): CharacterStatus[] {
  const playable = playableCharacters(achieved, wiki)
  const todo = remaining(achieved, wiki)
  const how = new Map<string, NonNullable<CharacterStatus['unlock']>>()
  for (const a of wiki) {
    if ((BASE_CHARACTERS as readonly string[]).includes(a.name)) how.set(a.name, { requirement: a.requirement })
    const r = parseRequirement(a.requirement)
    if (r?.goals[0] === 'homeCloset') how.set(TAINTED_OF[r.character], { closetAs: r.character })
  }
  return ALL_CHARACTERS.map((character) => ({
    character,
    playable: playable.has(character),
    remaining: todo.filter(({ r }) => r.character === character).length,
    unlock: playable.has(character) ? null : (how.get(character) ?? null),
  }))
}
