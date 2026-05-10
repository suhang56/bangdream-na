/**
 * BANDS — design data for band-color lookups across the site.
 *
 * `id === 'all'` is the fallback / default; ink/black palette is used when a
 * news/event/gallery item has `band_theme = null` or an unknown value.
 *
 * Used by: src/pages/Home.jsx (next-event border color), D2-D7 sub-PRs.
 * NOT rendered as a switcher in D1 (BandSwitcher stripped per Designer §8).
 */
export const BANDS = [
  {
    id: 'all',
    name: '全部',
    jp: 'All',
    romaji: 'ALL',
    color: '#1f1d1a',
    ink: '#ffffff',
    accent: '#1f1d1a',
  },
  {
    id: 'popipa',
    name: "Poppin'Party",
    jp: '波派',
    romaji: "POPPIN'PARTY",
    color: '#ff5a85',
    ink: '#ffffff',
    accent: '#ee3469',
  },
  {
    id: 'afterglow',
    name: 'Afterglow',
    jp: '余晖',
    romaji: 'AFTERGLOW',
    color: '#cd2c34',
    ink: '#ffffff',
    accent: '#a51d24',
  },
  {
    id: 'hhw',
    name: 'Hello, Happy World!',
    jp: '哈罗哈皮',
    romaji: 'HELLO,HAPPY WORLD!',
    color: '#f1b500',
    ink: '#1f1d1a',
    accent: '#c89400',
  },
  {
    id: 'pasupare',
    name: 'Pastel*Palettes',
    jp: '帕斯帕雷',
    romaji: 'PASTEL*PALETTES',
    color: '#7e9bff',
    ink: '#1f1d1a',
    accent: '#4f73e0',
  },
  {
    id: 'roselia',
    name: 'Roselia',
    jp: '罗瑟莉娅',
    romaji: 'ROSELIA',
    color: '#3a3f7a',
    ink: '#ffffff',
    accent: '#2a2f60',
  },
  {
    id: 'morfonica',
    name: 'Morfonica',
    jp: '莫尔福尼卡',
    romaji: 'MORFONICA',
    color: '#a886cf',
    ink: '#ffffff',
    accent: '#7d5aa8',
  },
  {
    id: 'ras',
    name: 'RAISE A SUILEN',
    jp: '雷兹',
    romaji: 'RAISE A SUILEN',
    color: '#5a5a5e',
    ink: '#ffffff',
    accent: '#3d3d40',
  },
  {
    id: 'mygo',
    name: 'MyGO!!!!!',
    jp: '迷子',
    romaji: 'MyGO!!!!!',
    color: '#3b6ea7',
    ink: '#ffffff',
    accent: '#274d80',
  },
  {
    id: 'avemujica',
    name: 'Ave Mujica',
    jp: '万圣音乐',
    romaji: 'AVE MUJICA',
    color: '#2a1d3a',
    ink: '#ffffff',
    accent: '#170c22',
  },
]

export function bandById(id) {
  return BANDS.find((b) => b.id === id) || BANDS[0]
}
