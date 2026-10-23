// The in-game completion-mark screen as a table — 34 character rows × mark columns.
// Tainted characters bundle several marks into one achievement, so their cells span columns
import { playableCharacters, type WikiAchievement } from './planner'
import { ALL_CHARACTERS, type Goal, parseRequirement } from './requirements'

/** Column order — bundled marks (Isaac·???·Satan·Lamb, Boss Rush·Hush) must be adjacent for a cell to span them */
export const MARK_COLUMNS = [
  'momsHeartHard',
  'isaac',
  'blueBaby',
  'satan',
  'lamb',
  'megaSatan',
  'bossRush',
  'hush',
  'delirium',
  'mother',
  'beast',
  'greed',
  'greedier',
] as const satisfies readonly Goal[]
export type MarkGoal = (typeof MARK_COLUMNS)[number]
const isMarkGoal = (g: Goal): g is MarkGoal => (MARK_COLUMNS as readonly Goal[]).includes(g)

type CellStatus = 'done' | 'todo' | 'none'

interface GridCell {
  goal: MarkGoal
  status: CellStatus
  /** How many columns the cell spans — 2+ for bundled marks */
  span: number
  achievementId: number | null
}

interface GridRow {
  character: string
  playable: boolean
  cells: GridCell[]
}

export interface Grid {
  rows: GridRow[]
  /** Per column: cleared cells / existing cells (bundled cells count toward their first column) */
  totals: { goal: MarkGoal; done: number; of: number }[]
}

export function completionGrid(achieved: Set<number>, wiki: WikiAchievement[]): Grid {
  const playable = playableCharacters(achieved, wiki)
  // character → that character's mark achievements
  const marks = new Map<string, { id: number; goals: Goal[] }[]>()
  for (const a of wiki) {
    const r = parseRequirement(a.requirement)
    if (!r?.goals.every(isMarkGoal)) continue
    marks.set(r.character, [...(marks.get(r.character) ?? []), { id: a.id, goals: r.goals }])
  }

  const rows = ALL_CHARACTERS.map((character) => {
    const own = marks.get(character) ?? []
    const cells: GridCell[] = []
    for (let i = 0; i < MARK_COLUMNS.length; ) {
      const goal = MARK_COLUMNS[i]
      // A bundled mark starts at its earliest column (Hush+Boss Rush starts at Boss Rush)
      // One mark can grant several achievements (Cain's Isaac) — the cell is cleared only when all are earned
      const here = own.filter((m) => Math.min(...m.goals.map((g) => MARK_COLUMNS.indexOf(g as MarkGoal))) === i)
      const span = here.length > 0 ? here[0].goals.length : 1
      cells.push({
        goal,
        status: here.length === 0 ? 'none' : here.every((m) => achieved.has(m.id)) ? 'done' : 'todo',
        span,
        achievementId: here[0]?.id ?? null,
      })
      i += span
    }
    return { character, playable: playable.has(character), cells }
  })

  const totals = MARK_COLUMNS.map((goal) => {
    const cells = rows.flatMap((r) => r.cells.filter((c) => c.goal === goal && c.status !== 'none'))
    return { goal, done: cells.filter((c) => c.status === 'done').length, of: cells.length }
  })
  return { rows, totals }
}
