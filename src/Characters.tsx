import { useState } from 'react'
import { useI18n } from './i18n'
import { GainList } from './Plans'
import { characterRoutes, characterStatuses, type WikiAchievement } from './planner'
import { Sprite } from './Sprite'

interface Props {
  /** Character picked from the grid, if any */
  initial?: string
  achieved: Set<number>
  wiki: WikiAchievement[]
  achievementIcon: Map<number, string>
  characterImage: Record<string, string | null>
}

export function Characters({ initial, achieved, wiki, achievementIcon, characterImage }: Props) {
  const { t } = useI18n()
  const statuses = characterStatuses(achieved, wiki)
  const [selected, setSelected] = useState(
    () => initial ?? statuses.find((s) => s.playable && s.remaining > 0)?.character ?? statuses[0].character,
  )
  const status = statuses.find((s) => s.character === selected) ?? statuses[0]
  const groups = characterRoutes(selected, achieved, wiki)

  return (
    <>
      <div className="char-grid">
        {statuses.map((s) => (
          <button
            key={s.character}
            type="button"
            title={s.character}
            className={['char', s.character === selected && 'on', !s.playable && 'locked'].filter(Boolean).join(' ')}
            onClick={() => setSelected(s.character)}
          >
            <Sprite src={characterImage[s.character]} />
            <span className={s.remaining === 0 ? 'left done' : 'left'}>{s.remaining === 0 ? '✓' : s.remaining}</span>
          </button>
        ))}
      </div>

      <div className="plan paper">
        <div className="plan-head">
          <Sprite className="who-img" src={characterImage[selected]} />
          <span className="who">{selected}</span>
          <span className="mode">{t.marksLeft(status.remaining)}</span>
        </div>
        {status.unlock && (
          <p className="route">
            {t.lockedCharacter}:{' '}
            {'closetAs' in status.unlock ? t.closet(status.unlock.closetAs) : status.unlock.requirement}
          </p>
        )}
        {groups.length === 0 && <p className="muted">{t.characterDone}</p>}
        {groups.map((g) => (
          <section key={g.id} className="char-route">
            <div className="route">{t.groups[g.id]}</div>
            <GainList gains={g.gains} achievementIcon={achievementIcon} />
          </section>
        ))}
      </div>
    </>
  )
}
