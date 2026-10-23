import { describe, expect, it } from 'vitest'
// @ts-expect-error untyped build script
import {
  achievementIdByName,
  challengeGoal,
  challengeGoalFile,
  challengeReward,
  currentDescription,
  plain,
} from './wiki-text.mjs'

const marker = (val: number) => `[[File:Dlc x indicator.png|link=|class=dlc cf-tag cf-val-${val} |alt=|x]]`

describe('plain', () => {
  it('keeps link text and drops files and tags', () => {
    expect(plain('Grants [[flight]] and [[Hearts#Soul|Soul Hearts]] [[File:x.png|y]] <span>ok</span>')).toBe(
      'Grants flight and Soul Hearts ok',
    )
  })
})

describe('currentDescription', () => {
  it('keeps text that applies to every version', () => {
    expect(currentDescription('Grants [[flight]].')).toBe('Grants flight.')
  })

  it('drops a sentence removed in Repentance+', () => {
    expect(currentDescription(`Grants flight. ${marker(15)} Also grants two Soul Hearts.`)).toBe('Grants flight.')
  })

  it('keeps the Repentance+ line and drops the older one', () => {
    const text = `${marker(7)} Old effect.<br>${marker(24)} New effect.`
    expect(currentDescription(text)).toBe('New effect.')
  })

  it('ends a marker at the line break', () => {
    expect(currentDescription(`${marker(7)} Old.<br>Always.`)).toBe('Always.')
  })

  it('ignores category links', () => {
    expect(currentDescription('[[Category:Modified in Repentance]] Effect.')).toBe('Effect.')
  })
})

describe('challenge goal', () => {
  const portrait = "[[File:Boss Mom's Heart portrait.png|100x100px|Mom's Heart|link=Mom's Heart]]"

  it('names the boss from its portrait link', () => {
    expect(challengeGoal(portrait)).toBe("Mom's Heart")
    expect(challengeGoal('[[File:Boss Isaac Rebirth portrait.png|100x100px|Isaac|link=Isaac (Boss)]]')).toBe('Isaac')
  })

  it('keeps the portrait file for the picture', () => {
    expect(challengeGoalFile(portrait)).toBe("Boss Mom's Heart portrait.png")
    expect(challengeGoalFile('[[:Basement|Basement]]')).toBeNull()
  })
})

describe('challengeReward', () => {
  it('takes only conditions that are just the challenge', () => {
    expect(challengeReward('Complete Suicide King (challenge #7)')).toBe(7)
    expect(
      challengeReward('Beat The Family Man (challenge #19), defeat Lokii, and unlock Judas and It Lives!'),
    ).toBeNull()
  })
})

describe('achievementIdByName', () => {
  const lookup = achievementIdByName([
    { id: '160', name: 'Suicide King' },
    { id: '120', name: 'Suicide King' },
    { id: '1', name: 'Magdalene' },
  ])

  it('reads "Name 2" as the second achievement of that name by id', () => {
    expect(lookup('Suicide King 2')).toBe(160)
    expect(lookup('suicide king 1')).toBe(120)
  })

  it('refuses a bare name that is ambiguous, and an unknown one', () => {
    expect(lookup('Suicide King')).toBeNull()
    expect(lookup('Nobody')).toBeNull()
    expect(lookup('magdalene')).toBe(1)
  })
})
