"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// plugins/theme-studio/renderer/index.tsx
var index_exports = {};
__export(index_exports, {
  activate: () => activate
});
module.exports = __toCommonJS(index_exports);
var import_react = __toESM(require("react"));

// plugins/theme-studio/renderer/types.ts
var DEFAULT_THEME = {
  id: "custom",
  name: "New Custom Theme",
  description: "A custom theme created in Theme Studio",
  type: "dark",
  colors: {
    background: "222.2 84% 4.9%",
    foreground: "210 40% 98%",
    card: "222.2 84% 4.9%",
    cardForeground: "210 40% 98%",
    popover: "222.2 84% 4.9%",
    popoverForeground: "210 40% 98%",
    primary: "210 40% 98%",
    primaryForeground: "222.2 47.4% 11.2%",
    secondary: "217.2 32.6% 17.5%",
    secondaryForeground: "210 40% 98%",
    muted: "217.2 32.6% 17.5%",
    mutedForeground: "215 20.2% 65.1%",
    accent: "217.2 32.6% 17.5%",
    accentForeground: "210 40% 98%",
    destructive: "0 62.8% 30.6%",
    destructiveForeground: "210 40% 98%",
    border: "217.2 32.6% 17.5%",
    input: "217.2 32.6% 17.5%",
    ring: "212.7 26.8% 83.9%"
  },
  typography: {
    fontFamily: "Inter",
    monoFontFamily: "JetBrains Mono",
    baseFontSize: "16px"
  }
};

// plugins/theme-studio/renderer/utils/color.ts
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}
function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
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
function hslToRgb(h, s, l) {
  let r, g, b;
  h /= 360;
  s /= 100;
  l /= 100;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p2, q2, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p2 + (q2 - p2) * 6 * t;
      if (t < 1 / 2) return q2;
      if (t < 2 / 3) return p2 + (q2 - p2) * (2 / 3 - t) * 6;
      return p2;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}
function hexToTailwindHsl(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return "0 0% 0%";
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return `${hsl.h} ${hsl.s}% ${hsl.l}%`;
}
function tailwindHslToHex(hslString) {
  const parts = hslString.split(" ").map((p) => parseFloat(p));
  if (parts.length < 3) return "#000000";
  const rgb = hslToRgb(parts[0], parts[1], parts[2]);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}
function getLuminance(r, g, b) {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}
function getContrastRatio(hex1, hex2) {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return 1;
  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}
function generatePalette(seedHex) {
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
    muted: tailwindHslToHex(`${hsl.h} ${Math.max(0, hsl.s - 30)}% ${Math.min(100, hsl.l + 40)}%`)
  };
}

// plugins/theme-studio/renderer/index.tsx
var SaveIcon = () => /* @__PURE__ */ import_react.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ import_react.default.createElement("path", { d: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" }), /* @__PURE__ */ import_react.default.createElement("polyline", { points: "17 21 17 13 7 13 7 21" }), /* @__PURE__ */ import_react.default.createElement("polyline", { points: "7 3 7 8 15 8" }));
var DownloadIcon = () => /* @__PURE__ */ import_react.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ import_react.default.createElement("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }), /* @__PURE__ */ import_react.default.createElement("polyline", { points: "7 10 12 15 17 10" }), /* @__PURE__ */ import_react.default.createElement("line", { x1: "12", y1: "15", x2: "12", y2: "3" }));
var UploadIcon = () => /* @__PURE__ */ import_react.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ import_react.default.createElement("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }), /* @__PURE__ */ import_react.default.createElement("polyline", { points: "17 8 12 3 7 8" }), /* @__PURE__ */ import_react.default.createElement("line", { x1: "12", y1: "3", x2: "12", y2: "15" }));
var RefreshIcon = () => /* @__PURE__ */ import_react.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ import_react.default.createElement("polyline", { points: "23 4 23 10 17 10" }), /* @__PURE__ */ import_react.default.createElement("polyline", { points: "1 20 1 14 7 14" }), /* @__PURE__ */ import_react.default.createElement("path", { d: "M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" }));
var PaletteIcon = () => /* @__PURE__ */ import_react.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ import_react.default.createElement("circle", { cx: "13.5", cy: "6.5", r: ".5" }), /* @__PURE__ */ import_react.default.createElement("circle", { cx: "17.5", cy: "10.5", r: ".5" }), /* @__PURE__ */ import_react.default.createElement("circle", { cx: "8.5", cy: "7.5", r: ".5" }), /* @__PURE__ */ import_react.default.createElement("circle", { cx: "6.5", cy: "12.5", r: ".5" }), /* @__PURE__ */ import_react.default.createElement("path", { d: "M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.093 0-.678.5-1.25 1.125-1.25h2.688c3.048 0 5.5-2.459 5.5-5.5C22 6.46 17.541 2 12 2Z" }));
var TextIcon = () => /* @__PURE__ */ import_react.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ import_react.default.createElement("polyline", { points: "4 7 4 4 20 4 20 7" }), /* @__PURE__ */ import_react.default.createElement("line", { x1: "9", y1: "20", x2: "15", y2: "20" }), /* @__PURE__ */ import_react.default.createElement("line", { x1: "12", y1: "4", x2: "12", y2: "20" }));
var WarningIcon = () => /* @__PURE__ */ import_react.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "text-yellow-500" }, /* @__PURE__ */ import_react.default.createElement("path", { d: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" }), /* @__PURE__ */ import_react.default.createElement("line", { x1: "12", y1: "9", x2: "12", y2: "13" }), /* @__PURE__ */ import_react.default.createElement("line", { x1: "12", y1: "17", x2: "12.01", y2: "17" }));
var GridIcon = () => /* @__PURE__ */ import_react.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ import_react.default.createElement("rect", { x: "3", y: "3", width: "7", height: "7" }), /* @__PURE__ */ import_react.default.createElement("rect", { x: "14", y: "3", width: "7", height: "7" }), /* @__PURE__ */ import_react.default.createElement("rect", { x: "14", y: "14", width: "7", height: "7" }), /* @__PURE__ */ import_react.default.createElement("rect", { x: "3", y: "14", width: "7", height: "7" }));
var ColorInput = ({
  label,
  variable,
  value,
  onChange,
  contrastWith
}) => {
  const hexValue = (0, import_react.useMemo)(() => tailwindHslToHex(value), [value]);
  const contrastRatio = (0, import_react.useMemo)(() => {
    if (!contrastWith) return null;
    const bgHex = tailwindHslToHex(contrastWith);
    return getContrastRatio(hexValue, bgHex);
  }, [hexValue, contrastWith]);
  const handleHexChange = (e) => {
    const newHex = e.target.value;
    onChange(hexToTailwindHsl(newHex));
  };
  const handleTextChange = (e) => {
    const val = e.target.value;
    if (val.startsWith("#")) {
      onChange(hexToTailwindHsl(val));
    } else {
      onChange(val);
    }
  };
  return /* @__PURE__ */ import_react.default.createElement("div", { className: "flex flex-col gap-1 mb-3" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex justify-between items-center" }, /* @__PURE__ */ import_react.default.createElement("label", { className: "text-xs text-gray-400 font-medium" }, label), contrastRatio !== null && /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center gap-1", title: `Contrast Ratio: ${contrastRatio.toFixed(2)}:1` }, contrastRatio < 4.5 && /* @__PURE__ */ import_react.default.createElement(WarningIcon, null), /* @__PURE__ */ import_react.default.createElement("span", { className: `text-[10px] ${contrastRatio < 4.5 ? "text-yellow-500" : "text-green-500"}` }, contrastRatio.toFixed(1)))), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex gap-2 items-center" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "relative w-8 h-8 rounded overflow-hidden border border-white/10 shrink-0" }, /* @__PURE__ */ import_react.default.createElement(
    "input",
    {
      type: "color",
      value: hexValue,
      onChange: handleHexChange,
      className: "absolute inset-0 w-[150%] h-[150%] -top-[25%] -left-[25%] cursor-pointer p-0 border-0"
    }
  )), /* @__PURE__ */ import_react.default.createElement(
    "input",
    {
      type: "text",
      value,
      onChange: handleTextChange,
      className: "flex-1 bg-black/20 border border-white/10 rounded px-2 py-1.5 text-xs font-mono text-gray-300 focus:border-blue-500 outline-none transition-colors"
    }
  )));
};
var TypographyEditor = ({ theme, onChange }) => {
  const fonts = ["Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "JetBrains Mono", "Fira Code", "System UI"];
  const updateFont = (key, value) => {
    onChange({
      ...theme,
      typography: {
        ...theme.typography || DEFAULT_THEME.typography,
        [key]: value
      }
    });
  };
  return /* @__PURE__ */ import_react.default.createElement("div", { className: "space-y-4 p-1" }, /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("label", { className: "text-xs text-gray-400 block mb-1" }, "Base Font Family"), /* @__PURE__ */ import_react.default.createElement(
    "select",
    {
      value: theme.typography?.fontFamily,
      onChange: (e) => updateFont("fontFamily", e.target.value),
      className: "w-full bg-black/20 border border-white/10 rounded px-2 py-1.5 text-sm outline-none text-gray-300"
    },
    fonts.map((f) => /* @__PURE__ */ import_react.default.createElement("option", { key: f, value: f }, f))
  )), /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("label", { className: "text-xs text-gray-400 block mb-1" }, "Monospace Font"), /* @__PURE__ */ import_react.default.createElement(
    "select",
    {
      value: theme.typography?.monoFontFamily,
      onChange: (e) => updateFont("monoFontFamily", e.target.value),
      className: "w-full bg-black/20 border border-white/10 rounded px-2 py-1.5 text-sm outline-none text-gray-300"
    },
    fonts.map((f) => /* @__PURE__ */ import_react.default.createElement("option", { key: f, value: f }, f))
  )), /* @__PURE__ */ import_react.default.createElement("div", null, /* @__PURE__ */ import_react.default.createElement("label", { className: "text-xs text-gray-400 block mb-1" }, "Base Font Size"), /* @__PURE__ */ import_react.default.createElement(
    "input",
    {
      type: "text",
      value: theme.typography?.baseFontSize,
      onChange: (e) => updateFont("baseFontSize", e.target.value),
      className: "w-full bg-black/20 border border-white/10 rounded px-2 py-1.5 text-sm outline-none text-gray-300"
    }
  )));
};
var activate = (context) => {
  console.log("[Theme Studio] Renderer activated");
  const ThemePanel = () => {
    const [theme, setTheme] = (0, import_react.useState)(DEFAULT_THEME);
    const [activeTab, setActiveTab] = (0, import_react.useState)("colors");
    const [savedThemes, setSavedThemes] = (0, import_react.useState)([]);
    (0, import_react.useEffect)(() => {
      const saved = localStorage.getItem("theme-studio-themes");
      if (saved) {
        try {
          setSavedThemes(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to load themes", e);
        }
      }
      const active = localStorage.getItem("theme-studio-active");
      if (active) {
        try {
          const parsed = JSON.parse(active);
          setTheme({ ...DEFAULT_THEME, ...parsed, colors: { ...DEFAULT_THEME.colors, ...parsed.colors }, typography: { ...DEFAULT_THEME.typography, ...parsed.typography } });
        } catch (e) {
        }
      }
    }, []);
    (0, import_react.useEffect)(() => {
      const root = document.documentElement;
      const body = document.body;
      Object.entries(theme.colors).forEach(([key, value]) => {
        const cssVar = `--${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
        root.style.setProperty(cssVar, value);
        if (body) body.style.setProperty(cssVar, value);
      });
      if (theme.typography) {
        if (theme.typography.fontFamily) root.style.setProperty("--font-sans", theme.typography.fontFamily);
        if (theme.typography.monoFontFamily) root.style.setProperty("--font-mono", theme.typography.monoFontFamily);
      }
      if (theme.type === "light") {
        root.classList.remove("dark");
        body?.classList.remove("dark");
        root.style.colorScheme = "light";
      } else {
        root.classList.add("dark");
        body?.classList.add("dark");
        root.style.colorScheme = "dark";
      }
      localStorage.setItem("theme-studio-active", JSON.stringify(theme));
    }, [theme]);
    const handleColorChange = (key, value) => {
      setTheme((prev) => ({
        ...prev,
        colors: {
          ...prev.colors,
          [key]: value
        }
      }));
    };
    const handleSaveTheme = () => {
      const newThemes = [...savedThemes.filter((t) => t.id !== theme.id), theme];
      setSavedThemes(newThemes);
      localStorage.setItem("theme-studio-themes", JSON.stringify(newThemes));
      alert("Theme saved to local storage!");
    };
    const handleExport = () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(theme, null, 2));
      const downloadAnchorNode = document.createElement("a");
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `${theme.name.replace(/\s+/g, "-").toLowerCase()}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    };
    const handleImport = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importedTheme = JSON.parse(event.target?.result);
          if (importedTheme.colors && importedTheme.colors.background) {
            setTheme(importedTheme);
          } else {
            alert("Invalid theme file");
          }
        } catch (e2) {
          alert("Error parsing theme file");
        }
      };
      reader.readAsText(file);
    };
    const handleAutoGenerate = () => {
      const seed = prompt("Enter a hex color for your primary theme:", "#3b82f6");
      if (!seed) return;
      const palette = generatePalette(seed);
      if (palette) {
        setTheme((prev) => ({
          ...prev,
          colors: {
            ...prev.colors,
            primary: hexToTailwindHsl(palette.primary),
            secondary: hexToTailwindHsl(palette.secondary),
            accent: hexToTailwindHsl(palette.accent),
            muted: hexToTailwindHsl(palette.muted)
            // Reset others to reasonable defaults or keep?
            // For now let's just update the main ones
          }
        }));
      }
    };
    const handleDeleteTheme = (e, id) => {
      e.stopPropagation();
      if (confirm("Are you sure you want to delete this theme?")) {
        const newThemes = savedThemes.filter((t) => t.id !== id);
        setSavedThemes(newThemes);
        localStorage.setItem("theme-studio-themes", JSON.stringify(newThemes));
      }
    };
    return /* @__PURE__ */ import_react.default.createElement("div", { className: "h-full flex flex-col bg-[#0f1115] text-gray-300 overflow-hidden" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "p-4 border-b border-white/5 flex justify-between items-center bg-[#13161b]" }, /* @__PURE__ */ import_react.default.createElement("h2", { className: "text-sm font-bold text-white uppercase tracking-wider" }, "Theme Studio"), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ import_react.default.createElement("button", { onClick: handleSaveTheme, title: "Save Theme", className: "p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors" }, /* @__PURE__ */ import_react.default.createElement(SaveIcon, null)), /* @__PURE__ */ import_react.default.createElement("button", { onClick: handleExport, title: "Export JSON", className: "p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors" }, /* @__PURE__ */ import_react.default.createElement(DownloadIcon, null)), /* @__PURE__ */ import_react.default.createElement("label", { className: "p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors cursor-pointer", title: "Import JSON" }, /* @__PURE__ */ import_react.default.createElement(UploadIcon, null), /* @__PURE__ */ import_react.default.createElement("input", { type: "file", onChange: handleImport, className: "hidden", accept: ".json" })))), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex border-b border-white/5" }, /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        className: `flex-1 py-2 text-xs font-medium transition-colors ${activeTab === "colors" ? "text-blue-400 border-b-2 border-blue-400 bg-white/5" : "text-gray-500 hover:text-gray-300"}`,
        onClick: () => setActiveTab("colors")
      },
      /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center justify-center gap-2" }, /* @__PURE__ */ import_react.default.createElement(PaletteIcon, null), " Colors")
    ), /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        className: `flex-1 py-2 text-xs font-medium transition-colors ${activeTab === "typography" ? "text-blue-400 border-b-2 border-blue-400 bg-white/5" : "text-gray-500 hover:text-gray-300"}`,
        onClick: () => setActiveTab("typography")
      },
      /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center justify-center gap-2" }, /* @__PURE__ */ import_react.default.createElement(TextIcon, null), " Typography")
    ), /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        className: `flex-1 py-2 text-xs font-medium transition-colors ${activeTab === "gallery" ? "text-blue-400 border-b-2 border-blue-400 bg-white/5" : "text-gray-500 hover:text-gray-300"}`,
        onClick: () => setActiveTab("gallery")
      },
      /* @__PURE__ */ import_react.default.createElement("div", { className: "flex items-center justify-center gap-2" }, /* @__PURE__ */ import_react.default.createElement(GridIcon, null), " Gallery")
    )), /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1 overflow-y-auto p-4 custom-scrollbar" }, activeTab === "colors" && /* @__PURE__ */ import_react.default.createElement("div", { className: "space-y-6" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex gap-2 mb-4" }, /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        onClick: handleAutoGenerate,
        className: "w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-xs py-2 rounded transition-colors"
      },
      /* @__PURE__ */ import_react.default.createElement(RefreshIcon, null),
      " Auto-Generate from Color"
    )), /* @__PURE__ */ import_react.default.createElement("section", null, /* @__PURE__ */ import_react.default.createElement("h3", { className: "text-xs font-bold text-white mb-3 uppercase opacity-50" }, "Base"), /* @__PURE__ */ import_react.default.createElement("div", { className: "grid grid-cols-1 gap-2" }, /* @__PURE__ */ import_react.default.createElement(ColorInput, { label: "Background", variable: "background", value: theme.colors.background, onChange: (v) => handleColorChange("background", v) }), /* @__PURE__ */ import_react.default.createElement(ColorInput, { label: "Foreground", variable: "foreground", value: theme.colors.foreground, onChange: (v) => handleColorChange("foreground", v), contrastWith: theme.colors.background }))), /* @__PURE__ */ import_react.default.createElement("section", null, /* @__PURE__ */ import_react.default.createElement("h3", { className: "text-xs font-bold text-white mb-3 uppercase opacity-50" }, "Primary"), /* @__PURE__ */ import_react.default.createElement("div", { className: "grid grid-cols-1 gap-2" }, /* @__PURE__ */ import_react.default.createElement(ColorInput, { label: "Primary", variable: "primary", value: theme.colors.primary, onChange: (v) => handleColorChange("primary", v) }), /* @__PURE__ */ import_react.default.createElement(ColorInput, { label: "Primary Foreground", variable: "primaryForeground", value: theme.colors.primaryForeground, onChange: (v) => handleColorChange("primaryForeground", v), contrastWith: theme.colors.primary }))), /* @__PURE__ */ import_react.default.createElement("section", null, /* @__PURE__ */ import_react.default.createElement("h3", { className: "text-xs font-bold text-white mb-3 uppercase opacity-50" }, "Secondary"), /* @__PURE__ */ import_react.default.createElement("div", { className: "grid grid-cols-1 gap-2" }, /* @__PURE__ */ import_react.default.createElement(ColorInput, { label: "Secondary", variable: "secondary", value: theme.colors.secondary, onChange: (v) => handleColorChange("secondary", v) }), /* @__PURE__ */ import_react.default.createElement(ColorInput, { label: "Secondary Foreground", variable: "secondaryForeground", value: theme.colors.secondaryForeground, onChange: (v) => handleColorChange("secondaryForeground", v), contrastWith: theme.colors.secondary }))), /* @__PURE__ */ import_react.default.createElement("section", null, /* @__PURE__ */ import_react.default.createElement("h3", { className: "text-xs font-bold text-white mb-3 uppercase opacity-50" }, "UI Elements"), /* @__PURE__ */ import_react.default.createElement("div", { className: "grid grid-cols-1 gap-2" }, /* @__PURE__ */ import_react.default.createElement(ColorInput, { label: "Card Background", variable: "card", value: theme.colors.card, onChange: (v) => handleColorChange("card", v) }), /* @__PURE__ */ import_react.default.createElement(ColorInput, { label: "Card Foreground", variable: "cardForeground", value: theme.colors.cardForeground, onChange: (v) => handleColorChange("cardForeground", v), contrastWith: theme.colors.card }), /* @__PURE__ */ import_react.default.createElement(ColorInput, { label: "Border", variable: "border", value: theme.colors.border, onChange: (v) => handleColorChange("border", v) }), /* @__PURE__ */ import_react.default.createElement(ColorInput, { label: "Input", variable: "input", value: theme.colors.input, onChange: (v) => handleColorChange("input", v) }), /* @__PURE__ */ import_react.default.createElement(ColorInput, { label: "Muted", variable: "muted", value: theme.colors.muted, onChange: (v) => handleColorChange("muted", v) }), /* @__PURE__ */ import_react.default.createElement(ColorInput, { label: "Muted Foreground", variable: "mutedForeground", value: theme.colors.mutedForeground, onChange: (v) => handleColorChange("mutedForeground", v), contrastWith: theme.colors.muted }))), /* @__PURE__ */ import_react.default.createElement("section", null, /* @__PURE__ */ import_react.default.createElement("h3", { className: "text-xs font-bold text-white mb-3 uppercase opacity-50" }, "States"), /* @__PURE__ */ import_react.default.createElement("div", { className: "grid grid-cols-1 gap-2" }, /* @__PURE__ */ import_react.default.createElement(ColorInput, { label: "Accent", variable: "accent", value: theme.colors.accent, onChange: (v) => handleColorChange("accent", v) }), /* @__PURE__ */ import_react.default.createElement(ColorInput, { label: "Accent Foreground", variable: "accentForeground", value: theme.colors.accentForeground, onChange: (v) => handleColorChange("accentForeground", v), contrastWith: theme.colors.accent }), /* @__PURE__ */ import_react.default.createElement(ColorInput, { label: "Destructive", variable: "destructive", value: theme.colors.destructive, onChange: (v) => handleColorChange("destructive", v) }), /* @__PURE__ */ import_react.default.createElement(ColorInput, { label: "Destructive Foreground", variable: "destructiveForeground", value: theme.colors.destructiveForeground, onChange: (v) => handleColorChange("destructiveForeground", v), contrastWith: theme.colors.destructive })))), activeTab === "typography" && /* @__PURE__ */ import_react.default.createElement(TypographyEditor, { theme, onChange: setTheme }), activeTab === "gallery" && /* @__PURE__ */ import_react.default.createElement("div", { className: "grid grid-cols-2 gap-4" }, savedThemes.map((t) => /* @__PURE__ */ import_react.default.createElement("div", { key: t.id, className: "relative group bg-white/5 border border-white/10 rounded p-3 hover:border-blue-500/50 transition-colors cursor-pointer", onClick: () => setTheme(t) }, /* @__PURE__ */ import_react.default.createElement("div", { className: "h-20 rounded mb-2 flex gap-1 overflow-hidden" }, /* @__PURE__ */ import_react.default.createElement("div", { className: "flex-1", style: { backgroundColor: tailwindHslToHex(t.colors.background) } }), /* @__PURE__ */ import_react.default.createElement("div", { className: "w-4", style: { backgroundColor: tailwindHslToHex(t.colors.primary) } }), /* @__PURE__ */ import_react.default.createElement("div", { className: "w-4", style: { backgroundColor: tailwindHslToHex(t.colors.secondary) } })), /* @__PURE__ */ import_react.default.createElement("div", { className: "font-medium text-xs truncate text-white" }, t.name), /* @__PURE__ */ import_react.default.createElement("div", { className: "text-[10px] text-gray-500 truncate" }, t.description), /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        className: "absolute top-2 right-2 p-1 bg-black/50 hover:bg-red-500/80 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity",
        onClick: (e) => handleDeleteTheme(e, t.id),
        title: "Delete Theme"
      },
      /* @__PURE__ */ import_react.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ import_react.default.createElement("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), /* @__PURE__ */ import_react.default.createElement("line", { x1: "6", y1: "6", x2: "18", y2: "18" }))
    ))), savedThemes.length === 0 && /* @__PURE__ */ import_react.default.createElement("div", { className: "col-span-2 text-center py-8 text-gray-500 text-xs" }, "No saved themes yet."))));
  };
  const ThemeStudioButton = () => {
    const { activeSidebarView, setActiveSidebarView } = context.useAppStore();
    const isActive = activeSidebarView === "theme-studio";
    return /* @__PURE__ */ import_react.default.createElement(
      "button",
      {
        className: `w-9 h-9 rounded-lg flex items-center justify-center transition-all ${isActive ? "bg-blue-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`,
        onClick: () => setActiveSidebarView("theme-studio"),
        title: "Theme Studio"
      },
      /* @__PURE__ */ import_react.default.createElement(PaletteIcon, null)
    );
  };
  context.registerComponent("sidebar:nav-item", {
    id: "theme-studio-nav",
    component: ThemeStudioButton
  });
  context.registerComponent("sidebar:view:theme-studio", {
    id: "theme-studio-panel",
    component: ThemePanel
  });
};
