export const colors = {
  navy: '#023448',
  navyDark: '#012232',
  navyLight: '#056a8a',

  navyAlpha04: 'rgba(2,52,72,0.04)',
  navyAlpha06: 'rgba(2,52,72,0.06)',
  navyAlpha08: 'rgba(2,52,72,0.08)',
  navyAlpha12: 'rgba(2,52,72,0.12)',
  navyAlpha20: 'rgba(2,52,72,0.2)',
  navyAlpha35: 'rgba(2,52,72,0.35)',
  navyAlpha60: 'rgba(2,52,72,0.6)',
  navyAlpha70: 'rgba(2,52,72,0.7)',
  navyAlpha80: 'rgba(2,52,72,0.8)',
  navyAlpha85: 'rgba(2,52,72,0.85)',
  navyAlpha95: 'rgba(2,52,72,0.95)',

  textPrimary: '#111',
  textSecondary: '#444',
  textMuted: '#888',
  textPlaceholder: '#aaa',
  textDisabled: '#ccc',

  border: '#eee',
  borderStrong: '#ddd',

  surface: '#ffffff',
  surfaceAlt: '#faf8f9',
  surfaceMuted: '#f5f5f5',
  surfaceMutedAlt: '#fafafa',
  surfaceTrack: '#f0f0f0',

  authGradient: ['#faf7fb', '#f2e4ef', '#e8d8e8'] as const,
  authBackground: '#faf7fb',
  authInputBg: 'rgba(224,183,202,0.6)',
  authButtonBg: 'rgba(224,183,202,0.85)',

  welcomeGradient: ['#012232', '#023448', '#056a8a'] as const,

  cardOverlay75: 'rgba(255,255,255,0.75)',
  cardOverlay88: 'rgba(255,255,255,0.88)',
  cardOverlay92: 'rgba(255,255,255,0.92)',
  whiteAlpha08: 'rgba(255,255,255,0.08)',
  whiteAlpha50: 'rgba(255,255,255,0.5)',
  whiteAlpha75: 'rgba(255,255,255,0.75)',

  scrim50: 'rgba(0,0,0,0.5)',
  scrim70: 'rgba(0,0,0,0.7)',
  scrim85: 'rgba(0,0,0,0.85)',

  danger: '#c0392b',
  dangerSoft: 'rgba(192,57,43,0.1)',
  success: '#2e7d32',
  voteSuccess: '#1f7a4d',
  freezeIce: 'rgba(120,180,220,0.22)',

  gold: '#f7d24f',
  silver: '#c4c8d0',
  bronze: '#cd8b5a',

  shadow: '#000',
  white: '#ffffff',
} as const;

export type ColorToken = keyof typeof colors;
