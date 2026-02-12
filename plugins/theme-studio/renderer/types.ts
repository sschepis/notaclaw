export interface ThemeColors {
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
    [key: string]: string; // Index signature for iteration
}

export interface ThemeTypography {
    fontFamily: string;
    headingFontFamily?: string;
    monoFontFamily?: string;
    baseFontSize: string;
}

export interface Theme {
    id: string;
    name: string;
    description: string;
    type: 'light' | 'dark';
    colors: ThemeColors;
    typography?: ThemeTypography;
    createdAt?: string;
    updatedAt?: string;
    author?: string;
}

export const DEFAULT_THEME: Theme = {
    id: 'custom',
    name: 'New Custom Theme',
    description: 'A custom theme created in Theme Studio',
    type: 'dark',
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
    typography: {
        fontFamily: 'Inter',
        monoFontFamily: 'JetBrains Mono',
        baseFontSize: '16px'
    }
};
