// Response shapes shared by the worker and the UI

export interface Me {
  steamid: string
  name: string
  avatar: string
}

export interface AchievementView {
  apiname: string
  name: string
  description: string
  /** Color if earned, grey otherwise */
  icon: string
  /** Color even if not earned — for showing "what this unlocks" on recommendation cards */
  iconColor: string
  hidden: boolean
  achieved: boolean
  unlockedAt: number | null
  /** Percentage of all players who earned it */
  globalPercent: number
}

export interface IsaacProgress {
  total: number
  unlocked: number
  achievements: AchievementView[]
}

export type ApiError = {
  error: 'private_profile' | 'no_game' | 'steam_unavailable' | 'profile_not_found' | 'rate_limited' | 'not_found'
}
