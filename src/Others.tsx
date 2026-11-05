import { useState } from 'react'
import { byId, challenges, requirementOf } from './data'
import { useI18n } from './i18n'
import { GainRow } from './Plans'
import { ANY_CHARACTER } from './requirements'
import type { AchievementView } from './types'

const PAGE = 30

const challengeRewards = new Set(challenges.flatMap((c) => c.rewards))

/** Left over after runs and challenges — no character to group it under, or any character will do */
export function isOther(a: AchievementView): boolean {
  if (a.achieved) return false
  const id = Number(a.apiname)
  if (challengeRewards.has(id)) return false
  const r = requirementOf.get(id)
  return !r || r.character === ANY_CHARACTER
}

interface Props {
  achievements: AchievementView[]
  achievementIcon: Map<number, string>
}

export function Others({ achievements, achievementIcon }: Props) {
  const { t } = useI18n()
  const [shown, setShown] = useState(PAGE)
  const others = achievements.filter(isOther)

  return (
    <section className="paper">
      {others.length === 0 && <p>{t.allDone}</p>}
      <ul className="gains">
        {others.slice(0, shown).map((a) => {
          const id = Number(a.apiname)
          const entry = byId.get(id)
          const requirement = entry?.requirement || a.description || (a.hidden ? t.hidden : '')
          return (
            <GainRow
              key={id}
              gain={{ id, name: a.name, unlocks: entry?.unlocks ?? [], bonus: false, partial: false }}
              achievementIcon={achievementIcon}
            >
              <div className="note">
                {requirement} · {a.globalPercent.toFixed(1)}%
              </div>
            </GainRow>
          )
        })}
      </ul>
      {shown < others.length && (
        <button type="button" className="more" onClick={() => setShown((n) => n + PAGE)}>
          {t.more(others.length - shown)}
        </button>
      )}
    </section>
  )
}
