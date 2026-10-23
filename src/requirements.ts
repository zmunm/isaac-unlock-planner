// Wiki unlock-condition sentence → which character must reach which goals.
// Only exact patterns match — unknown sentences return null, and the UI lists those separately as "can't be grouped into a run".

export type Goal =
  | 'mom'
  | 'momsHeart'
  | 'momsHeartHard'
  | 'isaac'
  | 'blueBaby'
  | 'satan'
  | 'lamb'
  | 'megaSatan'
  | 'bossRush'
  | 'hush'
  | 'delirium'
  | 'mother'
  | 'beast'
  | 'greed'
  | 'greedier'
  | 'homeCloset'

export const BASE_CHARACTERS = [
  'Isaac',
  'Magdalene',
  'Cain',
  'Judas',
  '???',
  'Eve',
  'Samson',
  'Azazel',
  'Lazarus',
  'Eden',
  'The Lost',
  'Lilith',
  'Keeper',
  'Apollyon',
  'The Forgotten',
  'Bethany',
  'Jacob and Esau',
] as const

/** The wiki names some tainted characters without the leading "The" or "and Esau" */
export const TAINTED_OF: Record<string, string> = {
  Isaac: 'Tainted Isaac',
  Magdalene: 'Tainted Magdalene',
  Cain: 'Tainted Cain',
  Judas: 'Tainted Judas',
  '???': 'Tainted ???',
  Eve: 'Tainted Eve',
  Samson: 'Tainted Samson',
  Azazel: 'Tainted Azazel',
  Lazarus: 'Tainted Lazarus',
  Eden: 'Tainted Eden',
  'The Lost': 'Tainted Lost',
  Lilith: 'Tainted Lilith',
  Keeper: 'Tainted Keeper',
  Apollyon: 'Tainted Apollyon',
  'The Forgotten': 'Tainted Forgotten',
  Bethany: 'Tainted Bethany',
  'Jacob and Esau': 'Tainted Jacob',
}

/** Just beat the boss, as any character */
export const ANY_CHARACTER = '*'

/** 17 base + 17 tainted, in display order */
export const ALL_CHARACTERS: readonly string[] = [...BASE_CHARACTERS, ...BASE_CHARACTERS.map((b) => TAINTED_OF[b])]

const CHARACTERS = new Set<string>(ALL_CHARACTERS)

/** Goals attemptable in the same run but gated by time, keys, etc. — the UI (i18n) supplies the condition text */
export const CONDITIONAL_GOALS = ['bossRush', 'hush', 'megaSatan', 'delirium'] as const satisfies readonly Goal[]
export type ConditionalGoal = (typeof CONDITIONAL_GOALS)[number]
export const isConditionalGoal = (g: Goal): g is ConditionalGoal => (CONDITIONAL_GOALS as readonly Goal[]).includes(g)

const BOSS_GOAL: Record<string, Goal> = {
  Mom: 'mom',
  "Mom's Heart": 'momsHeart',
  Isaac: 'isaac',
  '???': 'blueBaby',
  Satan: 'satan',
  'The Lamb': 'lamb',
  'Mega Satan': 'megaSatan',
  Hush: 'hush',
  Delirium: 'delirium',
  Mother: 'mother',
  'The Beast': 'beast',
  'Ultra Greed': 'greed',
  'Ultra Greedier': 'greedier',
}

export interface Requirement {
  character: string
  /** All must be reached to unlock */
  goals: Goal[]
}

const PATTERNS: [RegExp, (m: RegExpMatchArray) => Goal[] | null][] = [
  [/^Defeat Mom's Heart or It Lives! on hard mode as (.+)$/i, () => ['momsHeartHard']],
  [/^Defeat Isaac, \?\?\?, Satan, and The Lamb as (.+)$/, () => ['isaac', 'blueBaby', 'satan', 'lamb']],
  [/^Defeat Hush and Boss Rush as (.+)$/, () => ['hush', 'bossRush']],
  [/^Complete (?:the )?Boss Rush as (.+)$/, () => ['bossRush']],
  [/^Use Red Key \(etc\.\) to open the hidden closet in Home as (.+)$/, () => ['homeCloset']],
  // Judas's ??? mark (The Left Hand) is "Ultra Pride as anyone, or ??? as Judas"
  [/^Defeat Ultra Pride as any character, or \?\?\? as (.+)$/, () => ['blueBaby']],
  [/^Defeat (.+?) as (.+)$/, (m) => (BOSS_GOAL[m[1]] ? [BOSS_GOAL[m[1]]] : null)],
]

const ANY_PATTERNS: [RegExp, (m: RegExpMatchArray) => Goal[] | null][] = [
  [/^Defeat \?\?\? and The Lamb$/, () => ['blueBaby', 'lamb']],
  // Chapter 4 ends at Mom's Heart (It Lives! later)
  [/^Complete Chapter 4$/, () => ['momsHeart']],
  [/^Defeat Delirium for the 1st time$/, () => ['delirium']],
  [/^Defeat (.+)$/, (m) => (BOSS_GOAL[m[1]] ? [BOSS_GOAL[m[1]]] : null)],
]

export function parseRequirement(text: string): Requirement | null {
  for (const [re, toGoals] of PATTERNS) {
    const m = text.match(re)
    if (!m) continue
    const character = m[m.length - 1]
    const goals = toGoals(m)
    if (!goals || !CHARACTERS.has(character)) return null
    return { character, goals }
  }
  for (const [re, toGoals] of ANY_PATTERNS) {
    const m = text.match(re)
    const goals = m && toGoals(m)
    if (goals) return { character: ANY_CHARACTER, goals }
  }
  return null
}
