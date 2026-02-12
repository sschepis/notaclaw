
// Basic color conversion utilities to avoid external dependencies

/**
 * Converts a Hex color string to RGB object
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16),
          }
        : null;
}

/**
 * Converts RGB object to Hex string
 */
export function rgbToHex(r: number, g: number, b: number): string {
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/**
 * Converts RGB to HSL (H 0-360, S 0-100, L 0-100)
 */
export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b),
        min = Math.min(r, g, b);
    let h = 0,
        s,
        l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }
        h /= 6;
    }

    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/**
 * Converts HSL to RGB
 */
export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    let r, g, b;

    h /= 360;
    s /= 100;
    l /= 100;

    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

/**
 * Converts Hex to Tailwind-style HSL string (e.g., "222.2 84% 4.9%")
 */
export function hexToTailwindHsl(hex: string): string {
    const rgb = hexToRgb(hex);
    if (!rgb) return '0 0% 0%';
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    return `${hsl.h} ${hsl.s}% ${hsl.l}%`;
}

/**
 * Converts Tailwind-style HSL string to Hex
 */
export function tailwindHslToHex(hslString: string): string {
    const parts = hslString.split(' ').map((p) => parseFloat(p));
    if (parts.length < 3) return '#000000';
    const rgb = hslToRgb(parts[0], parts[1], parts[2]);
    return rgbToHex(rgb.r, rgb.g, rgb.b);
}

/**
 * Calculates relative luminance
 */
function getLuminance(r: number, g: number, b: number): number {
    const a = [r, g, b].map((v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

/**
 * Calculates contrast ratio between two hex colors
 */
export function getContrastRatio(hex1: string, hex2: string): number {
    const rgb1 = hexToRgb(hex1);
    const rgb2 = hexToRgb(hex2);
    if (!rgb1 || !rgb2) return 1;

    const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
    const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);

    return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Generates a palette from a seed hex color
 */
export function generatePalette(seedHex: string) {
    const rgb = hexToRgb(seedHex);
    if (!rgb) return null;
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

    return {
        primary: seedHex,
        // Complementary
        secondary: tailwindHslToHex(`${(hsl.h + 180) % 360} ${Math.max(0, hsl.s - 20)}% ${Math.min(100, hsl.l + 10)}%`),
        // Analogous
        accent: tailwindHslToHex(`${(hsl.h + 30) % 360} ${hsl.s}% ${hsl.l}%`),
        // Darker/Lighter versions
        muted: tailwindHslToHex(`${hsl.h} ${Math.max(0, hsl.s - 30)}% ${Math.min(100, hsl.l + 40)}%`),
    };
}
