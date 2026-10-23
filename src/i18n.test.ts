import { describe, expect, it } from 'vitest'
import { initialLang, MESSAGES } from './i18n'
import { CONDITIONAL_GOALS } from './requirements'

describe('initialLang', () => {
  it('keeps a stored choice', () => {
    expect(initialLang('en', ['ko-KR'])).toBe('en')
    expect(initialLang('ko', ['en-US'])).toBe('ko')
  })

  it('falls back to Korean only for a Korean browser', () => {
    expect(initialLang(null, ['ko-KR', 'en'])).toBe('ko')
    expect(initialLang(null, ['en-US', 'ko'])).toBe('ko')
    expect(initialLang(null, ['ja-JP'])).toBe('en')
    expect(initialLang('fr', [])).toBe('en')
  })
})

describe('messages', () => {
  it('names the goal in every condition text, not only the gate', () => {
    for (const lang of ['ko', 'en'] as const) {
      for (const goal of CONDITIONAL_GOALS) {
        expect(MESSAGES[lang].conditions[goal]).toContain(MESSAGES[lang].marks[goal])
      }
    }
  })
})

describe('English counts', () => {
  it('uses the singular for one', () => {
    expect(MESSAGES.en.marksLeft(1)).toBe('1 mark left')
    expect(MESSAGES.en.marksLeft(3)).toBe('3 marks left')
    expect(MESSAGES.en.shared(1)).toBe('1 more comes along in this run (any character)')
    expect(MESSAGES.en.shared(2)).toBe('2 more come along in this run (any character)')
  })
})
