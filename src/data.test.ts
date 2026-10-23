import { describe, expect, it } from 'vitest'
import { byId, challenges, characterImage, wiki } from './data'
import { ALL_CHARACTERS } from './requirements'

describe('wiki data', () => {
  it('has every challenge reward in the achievement list', () => {
    for (const c of challenges) for (const id of c.rewards) expect(byId.has(id)).toBe(true)
  })

  it('rewards a challenge only with achievements that need nothing but that challenge', () => {
    for (const c of challenges)
      for (const id of c.rewards)
        expect(byId.get(id)?.requirement).toMatch(new RegExp(`^Complete .+ \\(challenge #${c.number}\\)$`))
  })

  it('locks Suicide King behind its own unlock, not the same-named reward', () => {
    expect(challenges.find((c) => c.number === 7)?.requires).toBe(160)
  })

  it('names every challenge character the way the rest of the data does', () => {
    for (const c of challenges) expect(ALL_CHARACTERS).toContain(c.character)
  })

  it('has a picture for every character', () => {
    for (const name of ALL_CHARACTERS) expect(characterImage[name]).toBeTruthy()
  })

  it('has all 641 achievements', () => {
    expect(wiki).toHaveLength(641)
  })
})
