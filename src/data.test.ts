import { describe, expect, it } from 'vitest'
import { byId, challenges, characterImage, wiki } from './data'
import { ALL_CHARACTERS } from './requirements'

describe('wiki data', () => {
  it('has every challenge reward in the achievement list', () => {
    for (const c of challenges) for (const id of c.rewards) expect(byId.has(id)).toBe(true)
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
