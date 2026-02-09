export interface Theme {
  id: string;
  name: string;
  description: string;
  colors: {
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    popover: string;
    popoverForeground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    destructive: string;
    destructiveForeground: string;
    border: string;
    input: string;
    ring: string;
  };
}

export const BUILT_IN_THEMES: Theme[] = [
  {
    id: 'default',
    name: 'Aleph Dark',
    description: 'The default dark theme for AlephNet',
    colors: {
      background: '222.2 84% 4.9%',
      foreground: '210 40% 98%',
      card: '222.2 84% 4.9%',
      cardForeground: '210 40% 98%',
      popover: '222.2 84% 4.9%',
      popoverForeground: '210 40% 98%',
      primary: '210 40% 98%',
      primaryForeground: '222.2 47.4% 11.2%',
      secondary: '217.2 32.6% 17.5%',
      secondaryForeground: '210 40% 98%',
      muted: '217.2 32.6% 17.5%',
      mutedForeground: '215 20.2% 65.1%',
      accent: '217.2 32.6% 17.5%',
      accentForeground: '210 40% 98%',
      destructive: '0 62.8% 30.6%',
      destructiveForeground: '210 40% 98%',
      border: '217.2 32.6% 17.5%',
      input: '217.2 32.6% 17.5%',
      ring: '212.7 26.8% 83.9%',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight Blue',
    description: 'Deep blue tones for focused work',
    colors: {
      background: '224 71% 4%',
      foreground: '213 31% 91%',
      card: '224 71% 4%',
      cardForeground: '213 31% 91%',
      popover: '224 71% 4%',
      popoverForeground: '213 31% 91%',
      primary: '210 40% 98%',
      primaryForeground: '222.2 47.4% 11.2%',
      secondary: '222 47% 11%',
      secondaryForeground: '210 40% 98%',
      muted: '223 47% 11%',
      mutedForeground: '215.4 16.3% 56.9%',
      accent: '216 34% 17%',
      accentForeground: '210 40% 98%',
      destructive: '0 63% 31%',
      destructiveForeground: '210 40% 98%',
      border: '216 34% 17%',
      input: '216 34% 17%',
      ring: '216 34% 17%',
    },
  },
  {
    id: 'forest',
    name: 'Deep Forest',
    description: 'Calming green tones',
    colors: {
      background: '150 50% 4%', // Very dark green
      foreground: '150 10% 90%',
      card: '150 50% 4%',
      cardForeground: '150 10% 90%',
      popover: '150 50% 4%',
      popoverForeground: '150 10% 90%',
      primary: '142 70% 50%', // Bright green
      primaryForeground: '144 60% 10%',
      secondary: '150 30% 10%',
      secondaryForeground: '150 10% 90%',
      muted: '150 30% 10%',
      mutedForeground: '150 10% 60%',
      accent: '150 30% 15%',
      accentForeground: '150 10% 90%',
      destructive: '0 62.8% 30.6%',
      destructiveForeground: '210 40% 98%',
      border: '150 30% 15%',
      input: '150 30% 15%',
      ring: '142 70% 50%',
    },
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'High contrast neon aesthetics',
    colors: {
      background: '280 50% 5%', // Deep purple bg
      foreground: '280 10% 90%',
      card: '280 50% 5%',
      cardForeground: '280 10% 90%',
      popover: '280 50% 5%',
      popoverForeground: '280 10% 90%',
      primary: '320 100% 50%', // Neon Pink
      primaryForeground: '0 0% 100%',
      secondary: '260 50% 10%',
      secondaryForeground: '280 10% 90%',
      muted: '260 50% 10%',
      mutedForeground: '260 20% 60%',
      accent: '260 50% 20%',
      accentForeground: '320 100% 50%',
      destructive: '0 100% 50%',
      destructiveForeground: '0 0% 100%',
      border: '320 100% 50%', // Pink borders
      input: '260 50% 20%',
      ring: '320 100% 50%',
    },
  },
  {
    id: 'light',
    name: 'Aleph Light',
    description: 'Clean light mode for bright environments',
    colors: {
      background: '0 0% 100%',
      foreground: '222.2 84% 4.9%',
      card: '0 0% 100%',
      cardForeground: '222.2 84% 4.9%',
      popover: '0 0% 100%',
      popoverForeground: '222.2 84% 4.9%',
      primary: '222.2 47.4% 11.2%',
      primaryForeground: '210 40% 98%',
      secondary: '210 40% 96.1%',
      secondaryForeground: '222.2 47.4% 11.2%',
      muted: '210 40% 96.1%',
      mutedForeground: '215.4 16.3% 46.9%',
      accent: '210 40% 96.1%',
      accentForeground: '222.2 47.4% 11.2%',
      destructive: '0 84.2% 60.2%',
      destructiveForeground: '210 40% 98%',
      border: '214.3 31.8% 91.4%',
      input: '214.3 31.8% 91.4%',
      ring: '222.2 84% 4.9%',
    },
  },
  {
    id: 'daylight',
    name: 'Daylight',
    description: 'Warm day theme with soft neutrals',
    colors: {
      background: '40 40% 98%',
      foreground: '222 45% 12%',
      card: '40 40% 98%',
      cardForeground: '222 45% 12%',
      popover: '40 40% 98%',
      popoverForeground: '222 45% 12%',
      primary: '32 98% 50%',
      primaryForeground: '40 40% 98%',
      secondary: '30 30% 92%',
      secondaryForeground: '222 45% 12%',
      muted: '30 30% 92%',
      mutedForeground: '220 10% 40%',
      accent: '35 80% 60%',
      accentForeground: '222 45% 12%',
      destructive: '0 84.2% 60.2%',
      destructiveForeground: '40 40% 98%',
      border: '30 20% 88%',
      input: '30 20% 88%',
      ring: '32 98% 50%',
    },
  },
];

export const DEFAULT_CUSTOM_THEME: Theme = {
  ...BUILT_IN_THEMES[0],
  id: 'custom',
  name: 'Custom Theme',
  description: 'Your personalized color scheme',
};

export const applyTheme = (themeId: string, customTheme?: Theme) => {
  let theme = BUILT_IN_THEMES.find((t) => t.id === themeId);

  if (themeId === 'custom') {
    theme = customTheme || DEFAULT_CUSTOM_THEME;
  }

  if (!theme) theme = BUILT_IN_THEMES[0];

  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const body = document.body;

  // Apply theme colors
  Object.entries(theme.colors).forEach(([key, value]) => {
    // Convert camelCase to kebab-case for CSS variables
    const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    root.style.setProperty(cssVar, value);
    body?.style.setProperty(cssVar, value);
  });

  root.setAttribute('data-theme', theme.id);
  if (body) body.setAttribute('data-theme', theme.id);

  // Handle dark mode class
  if (themeId === 'light' || themeId === 'daylight') {
    root.classList.remove('dark');
    if (body) body.classList.remove('dark');
    root.style.colorScheme = 'light';
    if (body) body.style.colorScheme = 'light';
  } else {
    root.classList.add('dark');
    if (body) body.classList.add('dark');
    root.style.colorScheme = 'dark';
    if (body) body.style.colorScheme = 'dark';
  }
};
