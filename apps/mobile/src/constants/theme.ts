import { Platform } from 'react-native';

export const COLORS = {
  // Brand & Accent Colors
  primaryDark: '#0A0A0A',
  primaryAccent: '#2B3A55',       // Medi Bud Signature Slate Blue
  secondaryAccent: '#E8863A',     // Saffron / Warm Orange
  cta: '#2B2B2B',

  // Apple iOS System Palette
  systemBackground: '#F2F2F7',    // iOS System Grouped Background
  systemCard: '#FFFFFF',          // iOS Primary Inset Card
  systemElevated: '#FFFFFF',
  systemFill: 'rgba(120, 120, 128, 0.08)',
  systemFillSecondary: 'rgba(120, 120, 128, 0.16)',

  // Apple Semantic Colors
  appleBlue: '#007AFF',
  appleGreen: '#34C759',
  appleOrange: '#FF9500',
  appleRed: '#FF3B30',
  applePurple: '#AF52DE',
  appleTeal: '#5AC8FA',

  // Typography Colors
  textPrimary: '#000000',         // True black or near black for Apple iOS crispness
  textSecondary: '#6C6C70',       // iOS Secondary Label
  textTertiary: '#8E8E93',        // iOS Tertiary Label
  textMuted: '#8E8E93',           // Muted secondary label
  textLight: '#FFFFFF',

  // Status & Alerts
  statusWarning: '#FF9500',       // Apple Orange
  statusDanger: '#FF3B30',        // Apple Red
  statusSuccess: '#34C759',       // Apple Green

  // Backgrounds & Subtle Surfaces
  backgroundSubtle: '#F2F2F7',    // System Grouped Background
  backgroundLight: '#FFFFFF',     // Clean white surface
  backgroundSkyTop: '#FFFFFF',    // Sky gradient top
  backgroundSkyBottom: '#EAF2FB', // Sky gradient bottom

  // Borders & Separators
  borderSubtle: 'rgba(60, 60, 67, 0.1)', // Apple hairline separator (0.5 - 1px)
  borderLight: 'rgba(255, 255, 255, 0.2)',
  borderActive: '#2B3A55',

  // Background Gradients
  skyGradient: ['#FFFFFF', '#EAF2FB'] as const,
  appleCardGradient: ['#FFFFFF', '#FBFBFD'] as const,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 40,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  card: 20,             // Apple standard squircle inset card
  bottomSheet: 24,
  full: 9999,
};

export const TYPOGRAPHY = {
  // Apple Type Hierarchy: SF Pro Display / System Sans
  displayFont: Platform.select({
    ios: 'System',
    android: 'sans-serif-medium',
    default: 'system-ui',
  }),
  serifEditorial: Platform.select({
    ios: 'New York',
    android: 'serif',
    default: 'Georgia',
  }),
  serifHeading: Platform.select({
    ios: 'New York',
    android: 'serif',
    default: 'Georgia',
  }),
  bodyFont: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'system-ui',
  }),
  sansBody: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'system-ui',
  }),
};

// Size-specific optical tracking (letter spacing) from Apple WWDC "The Details of UI Typography"
export const TRACKING = {
  display: -0.8,     // Tight negative tracking for large display headings (32px+)
  headline: -0.4,    // Medium negative tracking for section headers (20-28px)
  subheadline: -0.2, // Subtle negative tracking for 15-18px
  body: 0,           // Neutral 0 tracking for 14-16px body copy
  caption: 0.2,      // Positive tracking for small 11-13px captions for legibility
};

export const SHADOWS = {
  appleCard: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  appleFloating: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
  },
  bottomSheet: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
};

// Apple Spring configs from WWDC Designing Fluid Interfaces
export const SPRINGS = {
  default: { damping: 1.0, stiffness: 300, mass: 1 },  // Critically damped, no overshoot
  sheet: { damping: 0.8, stiffness: 250, mass: 0.9 },   // Slight natural settle for sheets
  press: { damping: 1.0, stiffness: 400, mass: 0.8 },   // Instant press response
};
