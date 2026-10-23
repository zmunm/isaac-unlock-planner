import { describe, expect, it } from 'vitest'
import { isSteamId, parseProfile } from './profile'

const ID = '76561198000000001'

describe('parseProfile', () => {
  it('takes a bare SteamID64', () => {
    expect(parseProfile(ID)).toEqual({ steamid: ID })
  })

  it('takes a /profiles/ URL with or without scheme and trailing slash', () => {
    expect(parseProfile(`https://steamcommunity.com/profiles/${ID}/`)).toEqual({ steamid: ID })
    expect(parseProfile(`steamcommunity.com/profiles/${ID}`)).toEqual({ steamid: ID })
  })

  it('takes a custom /id/ URL as a vanity name', () => {
    expect(parseProfile('https://steamcommunity.com/id/GabeLoganNewell/')).toEqual({ vanity: 'GabeLoganNewell' })
  })

  it('takes a bare custom name', () => {
    expect(parseProfile('  some_name ')).toEqual({ vanity: 'some_name' })
  })

  it('rejects other sites and junk', () => {
    expect(parseProfile(`https://steamcommunity.evil.com/profiles/${ID}`)).toBeNull()
    expect(parseProfile(`https://steamcommunityxcom/profiles/${ID}`)).toBeNull()
    expect(parseProfile('https://steamcommunity.com/profiles/123')).toBeNull()
    expect(parseProfile('../../etc/passwd')).toBeNull()
    expect(parseProfile('a')).toBeNull()
  })
})

describe('isSteamId', () => {
  it('accepts exactly 17 digits', () => {
    expect(isSteamId(ID)).toBe(true)
    expect(isSteamId(`${ID}0`)).toBe(false)
    expect(isSteamId(null)).toBe(false)
  })
})
