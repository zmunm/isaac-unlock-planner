// UI strings in two languages. Game terms (achievement, item, boss, character names) stay in the original English in both
import { createContext, type ReactNode, useContext, useState } from 'react'
import type { MarkGoal } from './completion'
import type { GroupId, Mode, RouteId } from './planner'
import type { ConditionalGoal } from './requirements'
import type { ApiError } from './types'

export type Lang = 'ko' | 'en'
export const VIEWS = ['plan', 'grid', 'character', 'challenge', 'other'] as const
export type View = (typeof VIEWS)[number]

interface Messages {
  title: string
  loading: string
  readingAchievements: string
  otherProfile: string
  tabs: Record<View, string>
  marks: Record<MarkGoal, string>
  errors: Record<ApiError['error'], string>
  privacyFix: [before: string, link: string, after: string]
  lookup: {
    profileLabel: string
    profilePlaceholder: string
    view: string
  }
  modes: Record<Mode, string>
  routes: Record<RouteId, string>
  groups: Record<GroupId, string>
  conditions: Record<ConditionalGoal, string>
  hardOnly: string
  partial: string
  anyCharacter: string
  anyCharacterTitle: string
  opens: (n: number, name: string) => string
  shared: (n: number) => string
  noPlans: string
  start: string
  blindfolded: string
  goal: (boss: string) => string
  challengeRoute: (n: number, name: string, goal: string) => string
  marksLeft: (n: number) => string
  lockedCharacter: string
  closet: (base: string) => string
  characterDone: string
  challengesDone: (done: number, total: number) => string
  allChallengesDone: string
  lockedChallenge: (name: string, requirement: string) => string
  allDone: string
  more: (n: number) => string
  hidden: string
  footer: { rights: string; privacy: string; data: string; font: string }
}

const ko: Messages = {
  title: '아이작 해금 플래너',
  loading: '불러오는 중…',
  readingAchievements: '도전과제를 읽는 중…',
  otherProfile: '다른 프로필',
  tabs: { plan: '추천', grid: '그리드', character: '캐릭터별', challenge: '챌린지', other: '기타' },
  marks: {
    momsHeartHard: "Mom's Heart (하드)",
    isaac: 'Isaac',
    blueBaby: '???',
    satan: 'Satan',
    lamb: 'The Lamb',
    megaSatan: 'Mega Satan',
    bossRush: 'Boss Rush',
    hush: 'Hush',
    delirium: 'Delirium',
    mother: 'Mother',
    beast: 'The Beast',
    greed: 'Ultra Greed',
    greedier: 'Ultra Greedier',
  },
  errors: {
    private_profile: '스팀 프로필의 "게임 세부 정보"가 비공개라 도전과제를 읽을 수 없습니다.',
    no_game: '이 계정에 아이작 기록이 없습니다.',
    steam_unavailable: '스팀에서 답이 오지 않습니다. 잠시 뒤 다시 열어 주세요.',
    profile_not_found: '그 프로필을 찾지 못했습니다. 주소를 다시 확인해 주세요.',
    rate_limited: '조회가 너무 잦습니다. 1분 뒤 다시 해 주세요.',
    not_found: '없는 주소입니다.',
  },
  privacyFix: [
    '',
    '스팀 공개 설정',
    '에서 "프로필"과 "게임 세부 정보"를 둘 다 공개로 바꾼 뒤 새로 고침 하세요. 바꾼 직후면 스팀에 퍼지기까지 몇 분 걸릴 수 있습니다.',
  ],
  lookup: {
    profileLabel: '스팀 프로필 주소',
    profilePlaceholder: 'steamcommunity.com/id/...',
    view: '보기',
  },
  modes: { normal: '노말', hard: '하드', greed: '그리드', greedier: '그리디어', challenge: '챌린지' },
  routes: {
    momsHeart: "Mom → Mom's Heart",
    chest: '체스트 루트 (Isaac → ???)',
    darkRoom: '다크룸 루트 (Satan → The Lamb)',
    mother: '대체 경로 → Mother',
    beast: '홈 → The Beast',
    greed: '그리드 모드',
    greedier: '그리디어 모드',
    challenge: '챌린지',
  },
  groups: {
    anyEnding: '어느 엔딩이든 가는 길에',
    chest: '체스트 (Isaac → ???)',
    darkRoom: '다크룸 (Satan → The Lamb)',
    both: '체스트와 다크룸 둘 다 (여러 판)',
    mother: '대체 경로 → Mother',
    beast: '홈 → The Beast',
    greed: '그리드 · 그리디어',
  },
  conditions: {
    bossRush: 'Boss Rush 클리어 (Mom 을 20분 안에 잡아야 열림)',
    hush: "Hush 처치 (Mom's Heart 를 30분 안에 잡아야 열림)",
    megaSatan: 'Mega Satan 처치 (열쇠 조각 2개)',
    delirium: 'Delirium 처치 (보이드 포털이 열리면)',
  },
  hardOnly: '하드 모드',
  partial: '여러 판 중 하나',
  anyCharacter: '아무 캐릭터',
  anyCharacterTitle: '아무 캐릭터',
  opens: (n, name) => `챌린지 #${n} ${name} 열림`,
  shared: (n) => `이 판에 같이 따라오는 것 ${n}개 (아무 캐릭터)`,
  noPlans: '남은 도전과제를 판으로 묶을 게 없습니다.',
  start: '시작',
  blindfolded: '눈가리개 — 눈물 공격 불가',
  goal: (boss) => `목표 ${boss}`,
  challengeRoute: (n, name, goal) => `챌린지 #${n} ${name} · 목표 ${goal}`,
  marksLeft: (n) => `남은 마크 ${n}`,
  lockedCharacter: '아직 못 고릅니다 — 여는 조건',
  closet: (base) => `${base} 로 홈의 숨은 옷장 열기 (Red Key 등)`,
  characterDone: '이 캐릭터로 깰 마크는 다 깼습니다.',
  challengesDone: (done, total) => `깬 챌린지 ${done} / ${total}`,
  allChallengesDone: '챌린지를 전부 깼습니다.',
  lockedChallenge: (name, requirement) => `잠김 — ${name} 도전과제를 따면 열립니다 (${requirement})`,
  allDone: '전부 깼습니다.',
  more: (n) => `더 보기 (${n}개 남음)`,
  hidden: '숨김 도전과제',
  footer: {
    rights:
      'The Binding of Isaac 과 게임 그림의 권리는 Edmund McMillen·Nicalis 에 있습니다. 이 사이트는 Nicalis·Valve 와 무관한 비영리 팬 도구입니다.',
    privacy:
      '저장하는 것: 공개 도전과제 응답을 최대 5분 캐시합니다. 조회한 프로필은 이 브라우저에만 기억합니다. 그 밖엔 아무것도 남기지 않습니다.',
    data: '해금 조건·아이템 퀄리티',
    font: '글꼴',
  },
}

const en: Messages = {
  title: 'Isaac Unlock Planner',
  loading: 'Loading…',
  readingAchievements: 'Reading achievements…',
  otherProfile: 'Another profile',
  tabs: { plan: 'Runs', grid: 'Grid', character: 'Characters', challenge: 'Challenges', other: 'Other' },
  marks: {
    momsHeartHard: "Mom's Heart (Hard)",
    isaac: 'Isaac',
    blueBaby: '???',
    satan: 'Satan',
    lamb: 'The Lamb',
    megaSatan: 'Mega Satan',
    bossRush: 'Boss Rush',
    hush: 'Hush',
    delirium: 'Delirium',
    mother: 'Mother',
    beast: 'The Beast',
    greed: 'Ultra Greed',
    greedier: 'Ultra Greedier',
  },
  errors: {
    private_profile: 'This Steam profile keeps "Game details" private, so its achievements cannot be read.',
    no_game: 'This account has no Isaac records.',
    steam_unavailable: 'Steam is not answering. Please try again in a moment.',
    profile_not_found: 'Could not find that profile. Please check the address.',
    rate_limited: 'Too many lookups. Please try again in a minute.',
    not_found: 'Not found.',
  },
  privacyFix: [
    'Set both "My profile" and "Game details" to public in your ',
    'Steam privacy settings',
    ', then reload. Right after a change, Steam can take a few minutes to catch up.',
  ],
  lookup: {
    profileLabel: 'Steam profile address',
    profilePlaceholder: 'steamcommunity.com/id/...',
    view: 'View',
  },
  modes: { normal: 'Normal', hard: 'Hard', greed: 'Greed', greedier: 'Greedier', challenge: 'Challenge' },
  routes: {
    momsHeart: "Mom → Mom's Heart",
    chest: 'Chest route (Isaac → ???)',
    darkRoom: 'Dark Room route (Satan → The Lamb)',
    mother: 'Alt path → Mother',
    beast: 'Home → The Beast',
    greed: 'Greed mode',
    greedier: 'Greedier mode',
    challenge: 'Challenge',
  },
  groups: {
    anyEnding: 'On the way to any ending',
    chest: 'Chest (Isaac → ???)',
    darkRoom: 'Dark Room (Satan → The Lamb)',
    both: 'Both Chest and Dark Room (several runs)',
    mother: 'Alt path → Mother',
    beast: 'Home → The Beast',
    greed: 'Greed · Greedier',
  },
  conditions: {
    bossRush: 'clear Boss Rush (opens if Mom dies within 20 min)',
    hush: "beat Hush (opens if Mom's Heart dies within 30 min)",
    megaSatan: 'beat Mega Satan (both key pieces)',
    delirium: 'beat Delirium (if a Void portal opens)',
  },
  hardOnly: 'Hard mode',
  partial: 'one of several runs',
  anyCharacter: 'any character',
  anyCharacterTitle: 'Any character',
  opens: (n, name) => `opens challenge #${n} ${name}`,
  shared: (n) => `${n} more ${n === 1 ? 'comes' : 'come'} along in this run (any character)`,
  noPlans: 'Nothing left to group into runs.',
  start: 'Start',
  blindfolded: 'blindfolded — cannot shoot tears',
  goal: (boss) => `Goal: ${boss}`,
  challengeRoute: (n, name, goal) => `Challenge #${n} ${name} · goal ${goal}`,
  marksLeft: (n) => `${n} ${n === 1 ? 'mark' : 'marks'} left`,
  lockedCharacter: 'Not unlocked yet — to unlock',
  closet: (base) => `open the hidden closet in Home as ${base} (Red Key etc.)`,
  characterDone: 'Every mark for this character is done.',
  challengesDone: (done, total) => `Challenges done ${done} / ${total}`,
  allChallengesDone: 'Every challenge is done.',
  lockedChallenge: (name, requirement) => `Locked — unlocks with the ${name} achievement (${requirement})`,
  allDone: 'All done.',
  more: (n) => `Show more (${n} left)`,
  hidden: 'Hidden achievement',
  footer: {
    rights:
      'The Binding of Isaac and its art belong to Edmund McMillen and Nicalis. This is a non-commercial fan tool, not affiliated with Nicalis or Valve.',
    privacy:
      'What is stored: public achievement responses cached for up to 5 minutes. The profile you look up is remembered in this browser only. Nothing else is kept.',
    data: 'Unlock conditions and item quality',
    font: 'Font',
  },
}

const MESSAGES: Record<Lang, Messages> = { ko, en }
const STORAGE_KEY = 'lang'

/** Saved choice → browser language (ko if Korean) → English */
export function initialLang(stored: string | null, browser: readonly string[]): Lang {
  if (stored === 'ko' || stored === 'en') return stored
  return browser.some((l) => l.toLowerCase().startsWith('ko')) ? 'ko' : 'en'
}

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

interface I18n {
  lang: Lang
  t: Messages
  setLang: (lang: Lang) => void
}

const I18nContext = createContext<I18n | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => initialLang(readStored(), navigator.languages ?? []))
  const setLang = (next: Lang) => {
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // If storage is blocked, the change lasts only for this visit
    }
  }
  return <I18nContext.Provider value={{ lang, t: MESSAGES[lang], setLang }}>{children}</I18nContext.Provider>
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n outside I18nProvider')
  return ctx
}

export { MESSAGES }
