import { useState } from 'react'
import { useI18n } from './i18n'
import type { Plan, PlannedAchievement } from './planner'
import { ANY_CHARACTER } from './requirements'
import { Sprite } from './Sprite'

function ChallengeNote({ items, blindfolded }: { items: string[]; blindfolded: boolean }) {
  const { t } = useI18n()
  if (items.length === 0 && !blindfolded) return null
  return (
    <div className="note">
      {items.length > 0 && (
        <>
          {t.start}: {items.join(', ')}
        </>
      )}
      {blindfolded && <div>{t.blindfolded}</div>}
    </div>
  )
}

function Quality({ q }: { q: number | null }) {
  if (q === null) return null
  return <span className={`q q${q}`}>Q{q}</span>
}

/** Row icon — the unlocked item's sprite if any, otherwise (babies, trinkets, etc.) the Steam achievement icon */
export function UnlockIcon({
  gain,
  achievementIcon,
}: {
  gain: PlannedAchievement
  achievementIcon: Map<number, string>
}) {
  const image = gain.unlocks.find((u) => u.image)?.image
  if (image) return <Sprite className="gain-icon" src={image} />
  const icon = achievementIcon.get(gain.id)
  return icon ? <img className="gain-icon ach" src={icon} alt="" loading="lazy" /> : <span className="gain-icon" />
}

function GainLabel({ gain }: { gain: PlannedAchievement }) {
  return (
    <>
      {gain.name}
      {gain.unlocks.map((u) => (
        <span key={u.name} className="item">
          {u.name !== gain.name && <> → {u.name}</>} <Quality q={u.quality} />
        </span>
      ))}
    </>
  )
}

/** One row — name · unlock · quality. The effect expands when the name is clicked */
function GainRow({ gain, achievementIcon }: { gain: PlannedAchievement; achievementIcon: Map<number, string> }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const effects = gain.unlocks.filter((u) => u.effect)
  const notes = [
    gain.conditions?.length ? `+ ${gain.conditions.map((c) => t.conditions[c]).join(', ')}` : null,
    gain.hardOnly ? t.hardOnly : null,
    gain.partial ? t.partial : null,
    gain.anyCharacter ? t.anyCharacter : null,
  ].filter(Boolean)

  return (
    <li className="gain">
      <UnlockIcon gain={gain} achievementIcon={achievementIcon} />
      <div className="gain-text">
        {effects.length ? (
          <button
            type="button"
            className="gain-name expandable"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <GainLabel gain={gain} />
          </button>
        ) : (
          <span className="gain-name">
            <GainLabel gain={gain} />
          </span>
        )}
        {notes.length > 0 && <div className={gain.bonus ? 'note bonus' : 'note'}>{notes.join(' · ')}</div>}
        {gain.opens?.map((c) => (
          <div key={c.number} className="note opens">
            {t.opens(c.number, c.name)}
          </div>
        ))}
        {open &&
          effects.map((u) => (
            <p key={u.name} className="effect">
              {u.effect}
            </p>
          ))}
      </div>
    </li>
  )
}

interface GainListProps {
  gains: PlannedAchievement[]
  /** achievement id → Steam color icon */
  achievementIcon: Map<number, string>
}

export function GainList({ gains, achievementIcon }: GainListProps) {
  return (
    <ul className="gains">
      {gains.map((g) => (
        <GainRow key={g.id} gain={g} achievementIcon={achievementIcon} />
      ))}
    </ul>
  )
}

/** Any-character extras repeat identically on every card, so keep them collapsed */
function PlanGains({ plan, achievementIcon }: { plan: Plan; achievementIcon: Map<number, string> }) {
  const { t } = useI18n()
  if (plan.character === ANY_CHARACTER) return <GainList gains={plan.gains} achievementIcon={achievementIcon} />
  const own = plan.gains.filter((g) => !g.anyCharacter)
  const shared = plan.gains.filter((g) => g.anyCharacter)
  return (
    <>
      <GainList gains={own} achievementIcon={achievementIcon} />
      {shared.length > 0 && (
        <details className="shared">
          <summary>{t.shared(shared.length)}</summary>
          <GainList gains={shared} achievementIcon={achievementIcon} />
        </details>
      )}
    </>
  )
}

interface PlansProps {
  plans: Plan[]
  achievementIcon: Map<number, string>
  characterImage: Record<string, string | null>
}

export function Plans({ plans, achievementIcon, characterImage }: PlansProps) {
  const { t } = useI18n()
  if (plans.length === 0) return <p className="muted">{t.noPlans}</p>
  return (
    <ol className="plans">
      {plans.map((p, i) => (
        <li key={p.challenge ? `challenge-${p.challenge.number}` : `${p.character}-${p.route}`} className="plan paper">
          <div className="plan-head">
            <span className="rank">{i + 1}</span>
            <Sprite className="who-img" src={characterImage[p.character]} />
            <div className="who-block">
              <span className="who">{p.character === ANY_CHARACTER ? t.anyCharacterTitle : p.character}</span>
              <span className="route">
                {p.challenge
                  ? t.challengeRoute(p.challenge.number, p.challenge.name, p.challenge.goal)
                  : t.routes[p.route]}
              </span>
            </div>
            <span className={`mode mode-${p.mode}`}>{t.modes[p.mode]}</span>
          </div>
          {p.challenge && <ChallengeNote items={p.challenge.items} blindfolded={p.challenge.blindfolded} />}
          <PlanGains plan={p} achievementIcon={achievementIcon} />
        </li>
      ))}
    </ol>
  )
}
