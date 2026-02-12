# Theme Studio Design Document

## Overview
This document outlines the design for the enhanced Theme Studio plugin. The goal is to provide a comprehensive theming solution that allows users to create, customize, share, and apply themes across the entire AlephNet application.

## Core Concepts

### 1. Theme Data Model
We will extend the existing `Theme` interface to include typography and metadata.

```typescript
interface ThemeColors {
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
}

interface ThemeTypography {
    fontFamily: string;
    headingFontFamily?: string;
    monoFontFamily?: string;
    baseFontSize: string; // e.g. "16px"
}

interface Theme {
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
```

### 2. Architecture

#### State Management
- **Local State**: The plugin will maintain the "current editing theme" in React state.
- **Persistence**: Themes will be saved to `localStorage` or a file-based store via IPC (if available) to persist across reloads.
- **Application**: The plugin will use the existing `applyTheme` utility from `client/src/renderer/themes.ts` (or a modified version of it) to inject CSS variables into `:root`.

#### Color System
- The application uses HSL values (space-separated, e.g., `222.2 84% 4.9%`) to support Tailwind's opacity modifiers.
- The Theme Studio must provide a Color Picker that converts between Hex/RGB and this specific HSL format.

## Functional Enhancements

### 1. Custom Theme Creation
- **UI**: A form to edit all color slots defined in `ThemeColors`.
- **Live Preview**: Changes to the form immediately call `applyTheme` with the transient state.

### 2. Typography Support
- Add inputs for `font-family` (dropdown of available web-safe fonts + Google Fonts if possible, or just system fonts for now).
- Inject typography CSS variables (e.g., `--font-sans`, `--font-mono`).

### 3. Import/Export
- **Export**: Button to download the current theme as a `.json` file.
- **Import**: File picker to load a `.json` file and populate the state.

### 4. Auto-Theming (Palette Generation)
- **Input**: User picks a "Seed Color".
- **Algorithm**: Generate complementary, analogous, or monochromatic colors for `secondary`, `accent`, etc., based on the seed.
- **Contrast**: Ensure generated foreground colors meet WCAG AA standards against their backgrounds.

### 5. Accessibility Checks
- **Real-time Check**: Calculate contrast ratio between `background` vs `foreground`, `primary` vs `primaryForeground`, etc.
- **Visual Indicator**: Show a warning icon if contrast is < 4.5:1.

### 6. Theme Gallery
- List built-in themes and user-saved themes.
- "Apply" button to switch themes.
- "Edit" button to load a theme into the editor.

## UI Components

1.  **ColorSlot**: A component displaying the color preview, hex code, and a color picker trigger.
2.  **ThemeCard**: Preview card for the gallery.
3.  **ContrastBadge**: Small badge showing the contrast ratio (e.g., "AA 5.2").
4.  **ExportModal**: JSON preview and download button.

## Implementation Plan

1.  **Refactor `ThemePanel`**: Split into tabs (Editor, Gallery, Settings).
2.  **Implement `ColorHelpers`**: Utilities for Hex <-> HSL conversion and Contrast calculation.
3.  **Build Editor UI**: Create inputs for all color slots.
4.  **Integrate `applyTheme`**: Ensure live updates work.
5.  **Add Typography**: Extend `applyTheme` to handle font variables.
6.  **Implement Import/Export**: JSON handling.
7.  **Add Accessibility Checks**: Integrate `ColorHelpers` into the Editor UI.
8.  **Polish**: Add "Auto-Generate" button.

## CSS Variable Mapping
Existing mapping in `themes.ts` is good. We need to add:
- `--font-sans`: `theme.typography.fontFamily`
- `--font-mono`: `theme.typography.monoFontFamily`
