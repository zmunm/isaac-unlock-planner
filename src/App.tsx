import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { fetchIsaac, type Result, resolveProfile } from './api'
import { Challenges } from './Challenges'
import { Characters } from './Characters'
import { byId, challenges, characterImage, markImage, requirementOf, wiki } from './data'
import { Grid } from './Grid'
import { useI18n, VIEWS, type View } from './i18n'
import { Plans } from './Plans'
import { planRuns } from './planner'
import { profileRef, remember } from './remember'
import { ANY_CHARACTER } from './requirements'
import { Sprite } from './Sprite'
import type { AchievementView, IsaacProgress, Me } from './types'

const PAGE = 30

/** ?id=<SteamID64 or custom name> shows that player's public profile — shareable as a link */
const viewedRef = profileRef(location.search)

export function App() {
  const { t, lang, setLang } = useI18n()
  const [viewed, setViewed] = useState<Result<Me> | null>(null)

  useEffect(() => {
    if (viewedRef) resolveProfile(viewedRef).then(setViewed)
  }, [])

  useEffect(() => {
    document.title = t.title
    document.documentElement.lang = lang
  }, [t, lang])

  return (
    <main>
      <header className="top">
        <h1>
          <a href="/" className="home">
            {t.title}
          </a>
        </h1>
        <div className="tools">
          {viewed?.ok && (
            <>
              <img className="avatar" src={viewed.data.avatar} alt="" />
              <span className="who-name">{viewed.data.name}</span>
            </>
          )}
          {/* Also when the lookup failed — a remembered profile that went private must not trap the visitor */}
          {viewedRef && (
            <button type="button" className="link" onClick={() => location.assign('/?lookup')}>
              {t.otherProfile}
            </button>
          )}
          <button type="button" className="lang" onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')}>
            {lang === 'ko' ? 'EN' : '한'}
          </button>
        </div>
      </header>

      {!viewedRef ? (
        <Lookup />
      ) : viewed === null ? (
        <p className="muted">{t.loading}</p>
      ) : viewed.ok ? (
        <Progress steamid={viewed.data.steamid} />
      ) : (
        <p className="error">{t.errors[viewed.error]}</p>
      )}

      <footer>
        {t.footer.rights}
        <br />
        {t.footer.privacy}
        <br />
        {t.footer.data}:{' '}
        <a href="https://bindingofisaacrebirth.wiki.gg/wiki/Achievements" target="_blank" rel="noreferrer">
          The Binding of Isaac Wiki
        </a>{' '}
        (CC BY-SA 4.0)
        <br />
        {t.footer.font}:{' '}
        <a href="https://github.com/quiple/galmuri" target="_blank" rel="noreferrer">
          Galmuri
        </a>{' '}
        (SIL OFL 1.1)
      </footer>
    </main>
  )
}

function Lookup() {
  const { t } = useI18n()
  const [profile, setProfile] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const lookUp = async (e: FormEvent) => {
    e.preventDefault()
    if (!profile.trim()) return
    setBusy(true)
    const found = await resolveProfile(profile)
    setBusy(false)
    if (!found.ok) {
      setError(t.errors[found.error])
      return
    }
    remember(found.data.steamid)
    location.assign(`/?id=${found.data.steamid}`)
  }

  return (
    <section className="landing paper">
      <Sprite className="hero" src={characterImage.Isaac} />

      <form className="lookup" onSubmit={lookUp}>
        <label htmlFor="profile">{t.lookup.profileLabel}</label>
        <div className="lookup-row">
          <input
            id="profile"
            value={profile}
            onChange={(e) => setProfile(e.target.value)}
            placeholder={t.lookup.profilePlaceholder}
            autoComplete="off"
            spellCheck={false}
          />
          <button type="submit" disabled={busy}>
            {t.lookup.view}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </form>
    </section>
  )
}

function Progress({ steamid }: { steamid: string }) {
  const { t } = useI18n()
  const [progress, setProgress] = useState<Result<IsaacProgress> | null>(null)
  const [shown, setShown] = useState(PAGE)
  const [view, setView] = useState<View>('plan')
  const [picked, setPicked] = useState<string | undefined>()

  useEffect(() => {
    fetchIsaac(steamid).then(setProgress)
  }, [steamid])

  const achievements = progress?.ok ? progress.data.achievements : null
  const achieved = useMemo(
    () => new Set((achievements ?? []).filter((a) => a.achieved).map((a) => Number(a.apiname))),
    [achievements],
  )
  const achievementIcon = useMemo(
    () => new Map((achievements ?? []).map((a) => [Number(a.apiname), a.iconColor])),
    [achievements],
  )
  const plans = useMemo(() => planRuns(achieved, wiki, 5, challenges), [achieved])

  if (progress === null) return <p className="muted">{t.readingAchievements}</p>
  if (!progress.ok) {
    const [before, link, after] = t.privacyFix
    return (
      <section>
        <p className="error">{t.errors[progress.error]}</p>
        {progress.error === 'private_profile' && (
          <p>
            {before}
            <a href="https://steamcommunity.com/my/edit/settings" target="_blank" rel="noreferrer">
              {link}
            </a>
            {after}
          </p>
        )}
      </section>
    )
  }

  const { total, unlocked } = progress.data
  // Character marks belong to other tabs — Other holds what can't be grouped into a run, plus "any character" ones
  const others = progress.data.achievements.filter((a) => {
    if (a.achieved) return false
    const r = requirementOf.get(Number(a.apiname))
    return !r || r.character === ANY_CHARACTER
  })
  const percent = total === 0 ? 0 : (unlocked / total) * 100

  const open = (next: View) => {
    setPicked(undefined)
    setView(next)
  }

  return (
    <>
      <section className="tally">
        <span className="count">
          {unlocked}
          <span className="of"> / {total}</span>
        </span>
        <span className="pct">{percent.toFixed(1)}%</span>
        <div className="bar">
          <div style={{ width: `${percent}%` }} />
        </div>
      </section>

      <nav className="tabs">
        {VIEWS.map((id) => (
          <button key={id} type="button" className={view === id ? 'on' : undefined} onClick={() => open(id)}>
            {t.tabs[id]}
          </button>
        ))}
      </nav>

      {view === 'plan' && <Plans plans={plans} achievementIcon={achievementIcon} characterImage={characterImage} />}

      {view === 'grid' && (
        <Grid
          achieved={achieved}
          wiki={wiki}
          characterImage={characterImage}
          markImage={markImage}
          achievementIcon={achievementIcon}
          onPick={(character) => {
            setPicked(character)
            setView('character')
          }}
        />
      )}

      {view === 'character' && (
        <Characters
          initial={picked}
          achieved={achieved}
          wiki={wiki}
          achievementIcon={achievementIcon}
          characterImage={characterImage}
        />
      )}

      {view === 'challenge' && (
        <Challenges achieved={achieved} achievementIcon={achievementIcon} characterImage={characterImage} />
      )}

      {view === 'other' && (
        <section className="paper">
          {others.length === 0 && <p>{t.allDone}</p>}
          <ol className="list">
            {others.slice(0, shown).map((a) => (
              <Row key={a.apiname} a={a} />
            ))}
          </ol>
          {shown < others.length && (
            <button type="button" className="more" onClick={() => setShown((n) => n + PAGE)}>
              {t.more(others.length - shown)}
            </button>
          )}
        </section>
      )}
    </>
  )
}

function Row({ a }: { a: AchievementView }) {
  const { t } = useI18n()
  const description = byId.get(Number(a.apiname))?.requirement || a.description || (a.hidden ? t.hidden : '')
  return (
    <li>
      <img className="ach-icon" src={a.icon} alt="" loading="lazy" />
      <div className="text">
        <div className="name">{a.name}</div>
        <div className="desc">{description}</div>
      </div>
      <div className="pct">{a.globalPercent.toFixed(1)}%</div>
    </li>
  )
}
