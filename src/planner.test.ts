import { describe, expect, it } from 'vitest'
import data from './data/isaac.json'
import {
  type Challenge,
  characterRoutes,
  characterStatuses,
  GOAL_NEEDS,
  planChallenges,
  planRuns,
  playableCharacters,
  type WikiAchievement,
} from './planner'
import { ANY_CHARACTER, parseRequirement } from './requirements'

const wiki = data.achievements as WikiAchievement[]
const idOf = (name: string) => wiki.find((a) => a.name === name)!.id
const all = new Set(wiki.map((a) => a.id))
const without = (...ids: number[]) => new Set([...all].filter((id) => !ids.includes(id)))

/** Look up achievement ids by wiki sentence — keeps numeric ids out of the tests */
const req = (text: string) => wiki.find((a) => a.requirement === text)!.id
const byIdOf = (id: number) => wiki.find((a) => a.id === id)!.requirement

describe('parseRequirement', () => {
  it('reads a plain boss mark', () => {
    expect(parseRequirement('Defeat Isaac as Eden')).toEqual({ character: 'Eden', goals: ['isaac'] })
  })

  it('reads the hard-mode Mom mark regardless of case', () => {
    expect(parseRequirement("Defeat Mom's Heart or It Lives! on hard mode as Keeper")?.goals).toEqual(['momsHeartHard'])
  })

  it('reads the tainted four-boss mark as one requirement needing all four', () => {
    expect(parseRequirement('Defeat Isaac, ???, Satan, and The Lamb as Tainted Cain')).toEqual({
      character: 'Tainted Cain',
      goals: ['isaac', 'blueBaby', 'satan', 'lamb'],
    })
  })

  it('refuses sentences with extra conditions', () => {
    expect(parseRequirement('Defeat Isaac as Cain and destroy 10 Tinted Rocks')).toBeNull()
    expect(parseRequirement("Defeat Mom's Heart or It Lives! on hard mode as Lazarus, without dying at all")).toBeNull()
  })

  it("reads Judas's either-or ??? mark as a ??? mark", () => {
    expect(parseRequirement('Defeat Ultra Pride as any character, or ??? as Judas')).toEqual({
      character: 'Judas',
      goals: ['blueBaby'],
    })
  })

  it('refuses unknown bosses and characters', () => {
    expect(parseRequirement('Defeat Ultra Pride as Judas')).toBeNull()
    expect(parseRequirement('Defeat Isaac as Somebody')).toBeNull()
  })

  it('covers every per-character mark in the wiki data', () => {
    const parsed = wiki.filter((a) => {
      const r = parseRequirement(a.requirement)
      return r && r.character !== ANY_CHARACTER
    }).length
    // 17 × 14 + 17 × 7 = 357, plus Cain's Isaac mark grants two achievements in Repentance+ (A Bag of Pennies, PAY TO PLAY)
    expect(parsed).toBe(358)
  })

  it('reads a plain boss kill as any character', () => {
    expect(parseRequirement('Defeat Mom')).toEqual({ character: ANY_CHARACTER, goals: ['mom'] })
    expect(parseRequirement('Defeat Mother')).toEqual({ character: ANY_CHARACTER, goals: ['mother'] })
  })

  it('does not read counted or extra-condition kills as any character', () => {
    expect(parseRequirement("Defeat Mom's Heart 11 times")).toBeNull()
    expect(parseRequirement('Defeat The Lamb in under 20 minutes')).toBeNull()
  })
})

describe('playableCharacters', () => {
  it('starts with Isaac only', () => {
    expect([...playableCharacters(new Set(), wiki)]).toEqual(['Isaac'])
  })

  it('adds a base character once its unlock achievement is earned', () => {
    expect(playableCharacters(new Set([idOf('Cain')]), wiki).has('Cain')).toBe(true)
  })

  it('adds a tainted character once the Home closet is opened as its base', () => {
    const closet = req('Use Red Key (etc.) to open the hidden closet in Home as Cain')
    const playable = playableCharacters(new Set([closet]), wiki)
    expect(playable.has('Tainted Cain')).toBe(true)
  })
})

describe('planRuns', () => {
  it('suggests nothing when everything is done', () => {
    expect(planRuns(all, wiki)).toEqual([])
  })

  it('groups the missing chest-path marks of one character into one run', () => {
    const isaac = req('Defeat Isaac as Eden')
    const blue = req('Defeat ??? as Eden')
    const [top] = planRuns(without(isaac, blue), wiki)
    expect(top.character).toBe('Eden')
    expect(top.route).toBe('chest')
    expect(top.gains.map((g) => g.id).sort()).toEqual([isaac, blue].sort())
    expect(top.mode).toBe('normal')
  })

  it('asks for hard mode only when the hard Mom mark is still missing', () => {
    const hard = req("Defeat Mom's Heart or It Lives! on Hard mode as Keeper")
    const [top] = planRuns(without(hard), wiki)
    expect(top.mode).toBe('hard')
    expect(top.character).toBe('Keeper')
  })

  it('skips characters that are not unlocked yet', () => {
    const marks = [req('Defeat Isaac as Eden'), idOf('Eden')]
    expect(planRuns(without(...marks), wiki)).toEqual([])
  })

  it('ranks a run with more marks above a run with fewer', () => {
    const eden = [req('Defeat Isaac as Eden'), req('Defeat ??? as Eden')]
    const cain = [req('Defeat Satan as Cain')]
    const plans = planRuns(without(...eden, ...cain), wiki)
    expect(plans[0].character).toBe('Eden')
  })

  it('counts a tainted four-boss mark as partial progress, not a full unlock', () => {
    const four = req('Defeat Isaac, ???, Satan, and The Lamb as Tainted Cain')
    const [top] = planRuns(without(four), wiki)
    expect(top.character).toBe('Tainted Cain')
    expect(top.gains[0].partial).toBe(true)
  })

  it('gates goals behind the achievements the wiki names', () => {
    const names = (goal: keyof typeof GOAL_NEEDS) => GOAL_NEEDS[goal]!.map((id) => wiki.find((a) => a.id === id)!.name)
    expect(names('blueBaby')).toEqual(['The Womb', 'It Lives!', 'The Polaroid'])
    expect(names('lamb')).toEqual(['The Womb', 'It Lives!', 'The Negative'])
    expect(names('megaSatan')).toEqual(['Angels'])
    expect(names('hush')).toEqual(['Blue Womb'])
    expect(names('delirium')).toEqual(['New Area'])
    expect(names('greedier')).toEqual(['Greedier!'])
    expect(names('mother')).toEqual(['A Secret Exit'])
    expect(names('beast')).toEqual(['A Strange Door'])
  })

  it('does not send anyone to Greedier mode before Greedier! unlocks it', () => {
    const greedier = req('Defeat Ultra Greedier as Isaac')
    const plans = planRuns(without(greedier), wiki, 50)
    expect(plans.some((p) => p.route === 'greedier')).toBe(true)
    const locked = planRuns(without(greedier, idOf('Greedier!')), wiki, 50)
    expect(locked.some((p) => p.route === 'greedier')).toBe(false)
  })

  it('does not count goals behind a locked floor — Hush needs Blue Womb', () => {
    const hush = req('Defeat Hush as Eden')
    const has = (achieved: Set<number>) => planRuns(achieved, wiki, 50).some((p) => p.gains.some((g) => g.id === hush))
    expect(has(without(hush))).toBe(true)
    expect(has(without(hush, idOf('Blue Womb')))).toBe(false)
  })

  it('offers only what is reachable on a fresh save — Mom and the Boss Rush behind her', () => {
    const goals = planRuns(new Set(), wiki, 50).flatMap((p) =>
      p.gains.flatMap((g) => parseRequirement(byIdOf(g.id))!.goals),
    )
    expect(new Set(goals)).toEqual(new Set(['mom', 'bossRush']))
  })

  it('ranks a run that unlocks a quality 4 item above an equal run without one', () => {
    const plans = planRuns(without(req('Defeat Satan as Eve'), req('Defeat Mother as Bethany')), wiki)
    expect(plans[0].character).toBe('Bethany')
  })

  it('ranks a sure mark above a timed bonus mark', () => {
    const plans = planRuns(without(req('Complete the Boss Rush as Cain'), req('Defeat Isaac as Keeper')), wiki)
    expect(plans[0].character).toBe('Keeper')
  })

  it('suggests one run per character', () => {
    const marks = [req('Defeat Isaac as Eden'), req('Defeat Satan as Eden')]
    const plans = planRuns(without(...marks), wiki)
    expect(plans.filter((p) => p.character === 'Eden')).toHaveLength(1)
  })

  it('marks timed or keyed goals as bonus', () => {
    const rush = req('Complete the Boss Rush as Eden')
    const [top] = planRuns(without(rush), wiki)
    expect(top.gains[0].bonus).toBe(true)
  })
})

describe('characterRoutes', () => {
  it('files each missing mark under the route that reaches it', () => {
    const marks = [req('Defeat Isaac as Eden'), req('Defeat Hush as Eden'), req('Defeat Mother as Eden')]
    const cain = req('Defeat Isaac as Cain')
    const groups = characterRoutes('Eden', without(...marks, cain), wiki)
    expect(groups.flatMap((g) => g.gains).map((x) => x.id)).not.toContain(cain)
    const where = (id: number) => groups.find((g) => g.gains.some((x) => x.id === id))?.id
    expect(where(marks[0])).toBe('chest')
    expect(where(marks[1])).toBe('anyEnding')
    expect(where(marks[2])).toBe('mother')
  })

  it('carries the condition of a timed mark', () => {
    const hush = req('Defeat Hush as Eden')
    const [group] = characterRoutes('Eden', without(hush), wiki)
    expect(group.gains[0].conditions).toEqual(['hush'])
  })

  it('flags the hard-mode mark', () => {
    const hard = req("Defeat Mom's Heart or It Lives! on Hard mode as Keeper")
    const [group] = characterRoutes('Keeper', without(hard), wiki)
    expect(group.gains[0].hardOnly).toBe(true)
  })

  it('keeps the tainted four-boss mark in its own multi-run group', () => {
    const four = req('Defeat Isaac, ???, Satan, and The Lamb as Tainted Cain')
    const [group] = characterRoutes('Tainted Cain', without(four), wiki)
    expect(group.id).toBe('both')
  })

  it('lists nothing for a finished character', () => {
    expect(characterRoutes('Eden', all, wiki)).toEqual([])
  })
})

describe('characterStatuses', () => {
  it('lists all 34 characters', () => {
    expect(characterStatuses(all, wiki)).toHaveLength(34)
  })

  it('counts what is left per character', () => {
    const marks = [req('Defeat Isaac as Eden'), req('Defeat Hush as Eden')]
    const eden = characterStatuses(without(...marks), wiki).find((s) => s.character === 'Eden')!
    expect(eden.remaining).toBe(2)
  })

  it('tells how to unlock a locked character', () => {
    const eden = characterStatuses(without(idOf('Eden')), wiki).find((s) => s.character === 'Eden')!
    expect(eden.playable).toBe(false)
    expect(eden.unlock).toEqual({ requirement: 'Complete Chapter 4' })
  })

  it('points a locked tainted character at the Home closet', () => {
    const closet = req('Use Red Key (etc.) to open the hidden closet in Home as Cain')
    const t = characterStatuses(without(closet), wiki).find((s) => s.character === 'Tainted Cain')!
    expect(t.unlock).toEqual({ closetAs: 'Cain' })
  })
})

const challenges = data.challenges as Challenge[]
const challenge = (name: string) => challenges.find((c) => c.name === name)!

describe('challenges in plans', () => {
  it('suggests an open challenge whose reward is still missing', () => {
    const c = challenge('The Family Man')
    const plans = planChallenges(without(...c.rewards), wiki, challenges)
    expect(plans.map((p) => p.challenge?.number)).toEqual([c.number])
    expect(plans[0].mode).toBe('challenge')
  })

  it('skips a challenge that is still locked', () => {
    const c = challenge('Seeing Double')
    expect(planChallenges(without(...c.rewards, c.requires!), wiki, challenges)).toEqual([])
  })

  it('mixes challenges into run suggestions', () => {
    const c = challenge('The Family Man')
    const plans = planRuns(without(...c.rewards), wiki, 5, challenges)
    expect(plans.some((p) => p.challenge?.number === c.number)).toBe(true)
  })
})

describe('any-character kills', () => {
  const mother = req('Defeat Mother')

  it('rides along in a run that passes the boss', () => {
    const plans = planRuns(without(mother, req('Defeat Mother as Eden')), wiki)
    const eden = plans.find((p) => p.character === 'Eden')!
    expect(eden.gains.find((g) => g.id === mother)?.anyCharacter).toBe(true)
  })

  it('picks up a Mom kill on the alternate path too', () => {
    const mom = req('Defeat Mom')
    const eden = planRuns(without(mom, req('Defeat Mother as Eden')), wiki).find((p) => p.character === 'Eden')!
    expect(eden.route).toBe('mother')
    expect(eden.gains.map((g) => g.id)).toContain(mom)
  })

  it('gets its own any-character run when nothing character-specific is left', () => {
    const [top] = planRuns(without(mother), wiki)
    expect(top.character).toBe(ANY_CHARACTER)
    expect(top.route).toBe('mother')
  })

  it('weighs a kill that opens a challenge above one that does not', () => {
    const opener = challenges.find((c) => c.name === 'Seeing Double')!.requires!
    const plain = wiki.find(
      (a) => a.requirement === 'Defeat Mother' && !challenges.some((c) => c.requires === a.id),
    )!.id
    const plans = planRuns(without(opener, plain), wiki, 5, challenges)
    const gain = plans[0].gains.find((g) => g.id === opener)!
    expect(gain.opens?.map((c) => c.name)).toContain('Seeing Double')
    const withOpener = planRuns(without(opener), wiki, 5, challenges)[0].score
    const withPlain = planRuns(without(plain), wiki, 5, challenges)[0].score
    expect(withOpener).toBeGreaterThan(withPlain)
  })
})
