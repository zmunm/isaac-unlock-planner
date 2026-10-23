import { byId, challenges } from './data'
import { useI18n } from './i18n'
import { UnlockIcon } from './Plans'
import { type Challenge, challengeGains, isChallengeOpen } from './planner'
import { Sprite } from './Sprite'

interface Props {
  achieved: Set<number>
  achievementIcon: Map<number, string>
  characterImage: Record<string, string | null>
}

/** Remaining challenges on one sheet — unlocked first, locked ones faded below like the collection */
export function Challenges({ achieved, achievementIcon, characterImage }: Props) {
  const { t } = useI18n()
  const left = challenges.filter((c) => c.rewards.some((id) => !achieved.has(id)))
  const ordered = [...left].sort(
    (a, b) => Number(!isChallengeOpen(a, achieved)) - Number(!isChallengeOpen(b, achieved)),
  )
  const done = challenges.length - left.length

  const row = (c: Challenge) => {
    const locked = !isChallengeOpen(c, achieved)
    const gains = challengeGains(c, achieved, byId)
    const requirement = c.requires === null ? null : byId.get(c.requires)
    return (
      <li key={c.number} className={locked ? 'ch locked' : 'ch'}>
        <span className="ch-num">{c.number}</span>
        <Sprite className="ch-who" src={characterImage[c.character]} alt={c.character} />
        <div className="ch-text">
          <div className="name">{c.name}</div>
          <div className="note">
            {c.items.length > 0 && `${t.start}: ${c.items.join(', ')}`}
            {c.blindfolded && <div>{t.blindfolded}</div>}
            {locked && requirement && <div>{t.lockedChallenge(requirement.name, requirement.requirement)}</div>}
          </div>
        </div>
        <div className="ch-goal" title={t.goal(c.goal)}>
          {c.goalImage ? (
            <img className="sprite" src={c.goalImage} alt={c.goal} loading="lazy" />
          ) : (
            <span>{c.goal}</span>
          )}
        </div>
        <div className="ch-reward">
          {gains.map((g) => (
            <span key={g.id} title={g.unlocks[0]?.name ?? g.name}>
              <UnlockIcon gain={g} achievementIcon={achievementIcon} />
            </span>
          ))}
        </div>
      </li>
    )
  }

  return (
    <section className="paper">
      <p className="muted">{t.challengesDone(done, challenges.length)}</p>
      {left.length === 0 && <p>{t.allChallengesDone}</p>}
      <ol className="ch-list">{ordered.map(row)}</ol>
    </section>
  )
}
