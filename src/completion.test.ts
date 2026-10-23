import { describe, expect, it } from 'vitest'
import { completionGrid, MARK_COLUMNS } from './completion'
import data from './data/isaac.json'
import type { WikiAchievement } from './planner'

const wiki = data.achievements as WikiAchievement[]
const all = new Set(wiki.map((a) => a.id))
const req = (text: string) => wiki.find((a) => a.requirement === text)!.id
const row = (achieved: Set<number>, character: string) =>
  completionGrid(achieved, wiki).rows.find((r) => r.character === character)!

describe('completionGrid', () => {
  it('has 34 rows that each cover every column exactly once', () => {
    const { rows } = completionGrid(all, wiki)
    expect(rows).toHaveLength(34)
    for (const r of rows) expect(r.cells.reduce((n, c) => n + c.span, 0)).toBe(MARK_COLUMNS.length)
  })

  it('gives a base character one cell per mark, all filled', () => {
    const isaac = row(all, 'Isaac')
    expect(isaac.cells).toHaveLength(MARK_COLUMNS.length)
    expect(isaac.cells.every((c) => c.status === 'done')).toBe(true)
  })

  it('joins the tainted four-boss mark into one wide cell starting at Isaac', () => {
    const cell = row(all, 'Tainted Cain').cells.find((c) => c.goal === 'isaac')!
    expect(cell.span).toBe(4)
    expect(cell.achievementId).toBe(req('Defeat Isaac, ???, Satan, and The Lamb as Tainted Cain'))
  })

  it('joins Hush and Boss Rush for tainted characters starting at the Boss Rush column', () => {
    const cells = row(all, 'Tainted Cain').cells
    const rush = cells.find((c) => c.goal === 'bossRush')!
    expect(rush.span).toBe(2)
    expect(cells.find((c) => c.goal === 'delirium')?.span).toBe(1)
  })

  it('marks columns a character has no mark for as none', () => {
    const cells = row(all, 'Tainted Cain').cells
    expect(cells.find((c) => c.goal === 'momsHeartHard')?.status).toBe('none')
    expect(cells.find((c) => c.goal === 'greed')?.status).toBe('none')
  })

  it('shows a missing mark as todo', () => {
    const lamb = req('Defeat The Lamb as Cain')
    const cells = row(new Set([...all].filter((id) => id !== lamb)), 'Cain').cells
    expect(cells.find((c) => c.goal === 'lamb')?.status).toBe('todo')
  })

  it('keeps a mark open until every achievement it gives is earned', () => {
    const payToPlay = req('Defeat Isaac as Cain')
    const others = wiki.filter((a) => a.requirement === 'Defeat Isaac as Cain').map((a) => a.id)
    expect(others.length).toBe(2)
    const cells = row(new Set([...all].filter((id) => id !== others[1])), 'Cain').cells
    expect(cells.find((c) => c.goal === 'isaac')?.status).toBe('todo')
    expect(payToPlay).toBe(others[0])
  })

  it('totals each column over characters that have that mark', () => {
    const lamb = req('Defeat The Lamb as Cain')
    const { totals } = completionGrid(new Set([...all].filter((id) => id !== lamb)), wiki)
    const t = totals.find((x) => x.goal === 'lamb')!
    expect(t.of).toBe(17)
    expect(t.done).toBe(16)
  })
})
