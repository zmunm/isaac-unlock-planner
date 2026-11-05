import { describe, expect, it } from 'vitest'
import data from './data/isaac.json'
import { isOther } from './Others'
import type { AchievementView } from './types'

const idOf = (name: string) => data.achievements.find((a) => a.name === name)!.id
const view = (id: number, achieved = false): AchievementView => ({
  apiname: String(id),
  name: '',
  description: '',
  icon: '',
  iconColor: '',
  hidden: false,
  achieved,
  unlockedAt: null,
  globalPercent: 0,
})

describe('isOther', () => {
  it('leaves challenge rewards to the Challenges tab', () => {
    const reward = data.challenges.find((c) => c.name === 'Pitch Black')!.rewards[0]
    expect(isOther(view(reward))).toBe(false)
  })

  it('keeps achievements no run can be built around', () => {
    expect(isOther(view(idOf('Magdalene')))).toBe(true)
  })

  it('leaves character marks to the run and grid tabs', () => {
    const mark = data.achievements.find((a) => a.requirement === 'Defeat Satan as Isaac')!.id
    expect(isOther(view(mark))).toBe(false)
  })

  it('drops what is already earned', () => {
    expect(isOther(view(idOf('Magdalene'), true))).toBe(false)
  })
})
