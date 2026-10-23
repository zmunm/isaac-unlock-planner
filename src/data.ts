// Indexes the fetched wiki data once — so multiple views don't rebuild the same Map
import raw from './data/isaac.json'
import type { Challenge, WikiAchievement } from './planner'
import { parseRequirement, type Requirement } from './requirements'

export const wiki = raw.achievements as WikiAchievement[]
export const challenges = raw.challenges as Challenge[]
export const characterImage: Record<string, string | null> = raw.characters
export const markImage: Record<string, string | null> = raw.marks
export const byId = new Map(wiki.map((a) => [a.id, a]))
export const requirementOf = new Map<number, Requirement | null>(
  wiki.map((a) => [a.id, parseRequirement(a.requirement)]),
)
