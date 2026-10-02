// Theme and palette tokens for Medi Bud
// Using refined off-black, off-white, and emerald healthcare hues

export const colors = {
  primary: {
    DEFAULT: '#0d9488', // Teal 600
    hover: '#0f766e',
    light: '#ccfbf1',
    surface: '#f0fdfa',
  },
  secondary: {
    DEFAULT: '#0284c7', // Sky 600
    hover: '#0369a1',
    light: '#e0f2fe',
  },
  accent: {
    DEFAULT: '#10b981', // Emerald 500
    hover: '#059669',
  },
  background: {
    light: '#fafafa', // Premium off-white
    dark: '#090d16',  // Modern deep slate
    surface: '#ffffff',
    surfaceSubtle: '#f4f6f8',
  },
  text: {
    primary: '#0f172a',   // Off-black for reduced eye strain
    secondary: '#475569',
    muted: '#94a3b8',
    inverse: '#f8fafc',
  },
  border: {
    subtle: 'rgba(15, 23, 42, 0.08)',
    medium: 'rgba(15, 23, 42, 0.16)',
    focus: '#0d9488',
  },
  urgency: {
    emergency: {
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.12)',
      border: 'rgba(239, 68, 68, 0.35)',
    },
    soon: {
      color: '#f97316',
      bg: 'rgba(249, 115, 22, 0.12)',
      border: 'rgba(249, 115, 22, 0.35)',
    },
    monitor: {
      color: '#eab308',
      bg: 'rgba(234, 179, 8, 0.12)',
      border: 'rgba(234, 179, 8, 0.35)',
    },
    selfCare: {
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.12)',
      border: 'rgba(16, 185, 129, 0.35)',
    },
  },
} as const;

export const spacing = {
  unit: 4,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;
