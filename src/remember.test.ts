import { describe, expect, it } from 'vitest'
import { rememberedId } from './remember'

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
