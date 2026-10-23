import { completionGrid, type Grid as GridData } from './completion'
import { useI18n } from './i18n'
import type { WikiAchievement } from './planner'
import { Sprite } from './Sprite'

interface Props {
  achieved: Set<number>
  wiki: WikiAchievement[]
  characterImage: Record<string, string | null>
  markImage: Record<string, string | null>
  /** achievement id → Steam color icon (fallback when no item unlocks) */
  achievementIcon: Map<number, string>
  /** Clicking a row opens that character's view */
  onPick: (character: string) => void
}

export function Grid({ achieved, wiki, characterImage, markImage, achievementIcon, onPick }: Props) {
  const { t } = useI18n()
  const grid: GridData = completionGrid(achieved, wiki)
  const byId = new Map(wiki.map((a) => [a.id, a]))
  /** Each cell shows the item that mark unlocks — for non-items (babies, trinkets, etc.) the achievement icon */
  const cellImage = (id: number | null) => {
    if (id === null) return null
    const item = byId.get(id)?.unlocks.find((u) => u.image)
    return item?.image
      ? { src: item.image, title: item.name, sprite: true }
      : { src: achievementIcon.get(id), title: byId.get(id)?.name, sprite: false }
  }

  return (
    <section className="paper grid-paper">
      <table className="grid">
        <thead>
          <tr>
            <th />
            {grid.totals.map(({ goal }) => (
              <th key={goal} title={t.marks[goal]}>
                <Sprite className="mark" src={markImage[goal]} alt={t.marks[goal]} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.rows.map((row) => (
            <tr
              key={row.character}
              className={[row.playable ? '' : 'locked', row.character === 'Tainted Isaac' ? 'tainted-start' : '']
                .filter(Boolean)
                .join(' ')}
              onClick={() => onPick(row.character)}
            >
              <th>
                {/* The whole row is clickable; keyboard users get this button — clicks bubble up to the row */}
                <button type="button" className="grid-pick" title={row.character}>
                  <Sprite className="grid-who" src={characterImage[row.character]} alt={row.character} />
                </button>
              </th>
              {row.cells.map((cell) => {
                const image = cell.status === 'none' ? null : cellImage(cell.achievementId)
                return (
                  <td key={cell.goal} colSpan={cell.span} className={`cell ${cell.status}`} title={image?.title}>
                    {image?.src && (
                      <img
                        className={image.sprite ? 'sprite unlock' : 'unlock ach'}
                        src={image.src}
                        alt=""
                        loading="lazy"
                      />
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th />
            {grid.totals.map(({ goal, done, of }) => (
              <td key={goal} className={done === of ? 'total full' : 'total'}>
                {of - done}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </section>
  )
}
