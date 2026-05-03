export const themes = {
  neutral: {
    key: 'neutral',
    name: 'Neutral',
    tokens: {
      '--color-bg': '#0f0f19',
      '--color-bg-card': '#16161f',
      '--color-text': '#f1f1f3',
      '--color-text-muted': '#8b8b9e',
      '--color-primary': '#6366f1',
      '--color-accent': '#a78bfa',
      '--color-border': 'rgba(255, 255, 255, 0.07)',
      '--gradient-hero': 'linear-gradient(135deg, #6366f1, #a78bfa)',
    },
  },
  roselia: {
    key: 'roselia',
    name: 'Roselia',
    tokens: {
      '--color-bg': '#0a0410',
      '--color-bg-card': '#180828',
      '--color-text': '#f4ebff',
      '--color-text-muted': '#b39ccc',
      '--color-primary': '#a020c0',
      '--color-accent': '#d4af37',
      '--color-border': '#2a1838',
      '--gradient-hero': 'linear-gradient(135deg, #a020c0, #d4af37)',
    },
  },
  popipa: {
    key: 'popipa',
    name: "Poppin'Party",
    tokens: {
      '--color-bg': '#1a0a14',
      '--color-bg-card': '#2a1422',
      '--color-text': '#fff0f5',
      '--color-text-muted': '#d8a8b8',
      '--color-primary': '#ff3377',
      '--color-accent': '#ffcc11',
      '--color-border': '#3a1c2a',
      '--gradient-hero': 'linear-gradient(135deg, #ff3377, #ff5522, #ffcc11)',
    },
  },
  mygo: {
    key: 'mygo',
    name: 'MyGO!!!!!',
    tokens: {
      '--color-bg': '#0a1018',
      '--color-bg-card': '#142028',
      '--color-text': '#e6edf5',
      '--color-text-muted': '#8a9aab',
      '--color-primary': '#77bbdd',
      '--color-accent': '#7777aa',
      '--color-border': '#1f2c38',
      '--gradient-hero': 'linear-gradient(135deg, #77bbdd, #7777aa)',
    },
  },
  morfonica: {
    key: 'morfonica',
    name: 'Morfonica',
    tokens: {
      '--color-bg': '#070612',
      '--color-bg-card': '#161228',
      '--color-text': '#ece8ff',
      '--color-text-muted': '#a89cc4',
      '--color-primary': '#33aaff',
      '--color-accent': '#b896e8',
      '--color-border': '#241c40',
      '--gradient-hero': 'linear-gradient(135deg, #33aaff, #b896e8)',
    },
  },
  afterglow: {
    key: 'afterglow',
    name: 'Afterglow',
    tokens: {
      '--color-bg': '#180808',
      '--color-bg-card': '#281414',
      '--color-text': '#ffeae0',
      '--color-text-muted': '#c4907a',
      '--color-primary': '#ee0022',
      '--color-accent': '#ff9999',
      '--color-border': '#3a1f1f',
      '--gradient-hero': 'linear-gradient(135deg, #ee0022, #ff9999, #ffee88)',
    },
  },
  pastel: {
    key: 'pastel',
    name: 'Pastel*Palettes',
    tokens: {
      '--color-bg': '#10101c',
      '--color-bg-card': '#1c1c2c',
      '--color-text': '#fce8f0',
      '--color-text-muted': '#c8a8c0',
      '--color-primary': '#ff88bb',
      '--color-accent': '#99dd88',
      '--color-border': '#2a2a3a',
      '--gradient-hero': 'linear-gradient(135deg, #ff88bb, #ddbbff, #55ddee, #99dd88, #ffeeaa)',
    },
  },
  hhw: {
    key: 'hhw',
    name: 'Hello, Happy, World!',
    tokens: {
      '--color-bg': '#181010',
      '--color-bg-card': '#2c1c20',
      '--color-text': '#fff8e0',
      '--color-text-muted': '#d8c498',
      '--color-primary': '#ffee22',
      '--color-accent': '#aa33cc',
      '--color-border': '#3a2a2a',
      '--gradient-hero': 'linear-gradient(90deg, #aa33cc, #ff9922, #ffee22, #44ddff, #006699)',
    },
  },
}

export const themeOrder = [
  'neutral',
  'roselia',
  'popipa',
  'mygo',
  'morfonica',
  'afterglow',
  'pastel',
  'hhw',
]

export const DEFAULT_THEME_KEY = 'neutral'

export const REQUIRED_TOKENS = [
  '--color-bg',
  '--color-bg-card',
  '--color-text',
  '--color-text-muted',
  '--color-primary',
  '--color-accent',
  '--color-border',
  '--gradient-hero',
]

export function isValidThemeKey(key) {
  return typeof key === 'string' && Object.prototype.hasOwnProperty.call(themes, key)
}
