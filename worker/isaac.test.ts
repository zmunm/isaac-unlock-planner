import { describe, expect, it } from 'vitest'
import { mergeProgress, type SchemaAchievement } from './isaac'

const ach = (name: string, hidden = 0): SchemaAchievement => ({
  name,
  displayName: `A${name}`,
  description: hidden ? undefined : `desc ${name}`,
  hidden,
  icon: `color/${name}`,
  icongray: `gray/${name}`,
})

describe('mergeProgress', () => {
  const schema = [ach('1'), ach('2'), ach('3'), ach('4', 1)]
  const player = [
    { apiname: '1', achieved: 1, unlocktime: 100 },
    { apiname: '2', achieved: 0, unlocktime: 0 },
    { apiname: '3', achieved: 1, unlocktime: 200 },
    { apiname: '4', achieved: 0, unlocktime: 0 },
  ]
  const global = [
    { name: '1', percent: '90.0' },
    { name: '2', percent: '12.5' },
    { name: '3', percent: '50' },
    { name: '4', percent: '33.3' },
  ]

  it('counts unlocked against total', () => {
    const p = mergeProgress(schema, player, global)
    expect(p.total).toBe(4)
    expect(p.unlocked).toBe(2)
  })

  it('lists unearned first, most-earned-by-others first, then earned newest first', () => {
    const order = mergeProgress(schema, player, global).achievements.map((a) => a.apiname)
    expect(order).toEqual(['4', '2', '3', '1'])
  })

  it('parses Steam string percents', () => {
    const a = mergeProgress(schema, player, global).achievements.find((x) => x.apiname === '2')
    expect(a?.globalPercent).toBe(12.5)
  })

  it('shows the gray icon until unlocked', () => {
    const byName = new Map(mergeProgress(schema, player, global).achievements.map((a) => [a.apiname, a]))
    expect(byName.get('1')?.icon).toBe('color/1')
    expect(byName.get('2')?.icon).toBe('gray/2')
    expect(byName.get('2')?.iconColor).toBe('color/2')
  })

  it('treats achievements missing from the player list as not achieved', () => {
    const p = mergeProgress(schema, [], global)
    expect(p.unlocked).toBe(0)
    expect(p.achievements.find((a) => a.apiname === '4')?.hidden).toBe(true)
  })
})
