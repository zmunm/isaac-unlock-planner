import type { AchievementView, IsaacProgress } from '../src/types'

export const ISAAC_APPID = 250900

export interface SchemaAchievement {
  name: string
  displayName: string
  description?: string
  hidden: number
  icon: string
  icongray: string
}

export interface PlayerAchievement {
  apiname: string
  achieved: number
  unlocktime: number
}

/** Steam returns percent as a string ("84.6") */
export interface GlobalPercent {
  name: string
  percent: string | number
}

/** Unearned: most earned by others first (easiest first); earned: most recent first */
export function mergeProgress(
  schema: SchemaAchievement[],
  player: PlayerAchievement[],
  global: GlobalPercent[],
): IsaacProgress {
  const mine = new Map(player.map((p) => [p.apiname, p]))
  const pct = new Map(global.map((g) => [g.name, Number(g.percent)]))

  const achievements: AchievementView[] = schema.map((s) => {
    const p = mine.get(s.name)
    const achieved = p?.achieved === 1
    return {
      apiname: s.name,
      name: s.displayName,
      description: s.description ?? '',
      icon: achieved ? s.icon : s.icongray,
      iconColor: s.icon,
      hidden: s.hidden === 1,
      achieved,
      unlockedAt: achieved && p ? p.unlocktime : null,
      globalPercent: pct.get(s.name) ?? 0,
    }
  })

  const sorted = [...achievements].sort((a, b) => {
    if (a.achieved !== b.achieved) return a.achieved ? 1 : -1
    if (!a.achieved) return b.globalPercent - a.globalPercent
    return (b.unlockedAt ?? 0) - (a.unlockedAt ?? 0)
  })

  return {
    total: achievements.length,
    unlocked: achievements.filter((a) => a.achieved).length,
    achievements: sorted,
  }
}
