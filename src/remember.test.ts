import { describe, expect, it } from 'vitest'
import { profileRef, rememberedId } from './remember'

const holding = (value: string | null) => ({ getItem: () => value })

describe('rememberedId', () => {
  it('returns a stored SteamID64', () => {
    expect(rememberedId(holding('76561198000000001'))).toBe('76561198000000001')
  })

  it('ignores anything else in storage', () => {
    expect(rememberedId(holding(null))).toBeNull()
    expect(rememberedId(holding('gaben'))).toBeNull()
    expect(rememberedId(holding('7656119800000000'))).toBeNull()
  })

  it('treats blocked storage as nothing remembered', () => {
    const blocked = {
      getItem: () => {
        throw new Error('SecurityError')
      },
    }
    expect(rememberedId(blocked)).toBeNull()
    expect(rememberedId(null)).toBeNull()
  })
})

describe('profileRef', () => {
  const mine = holding('76561198000000001')

  it('shows a shared link over the remembered profile', () => {
    expect(profileRef('?id=gaben', mine)).toBe('gaben')
  })

  it('falls back to the remembered profile, also for an empty ?id=', () => {
    expect(profileRef('', mine)).toBe('76561198000000001')
    expect(profileRef('?id=', mine)).toBe('76561198000000001')
  })

  it('shows the form for ?lookup without dropping the remembered profile', () => {
    expect(profileRef('?lookup', mine)).toBeNull()
    expect(profileRef('', mine)).toBe('76561198000000001')
  })
})
