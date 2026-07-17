// ===== Sistema de temas de color =====
// Cada tema define variables CSS que se aplican a :root
// Los valores son "R G B" (sin rgb() ni #) para soportar opacidad con Tailwind

export type ColorTheme = 'indigo' | 'emerald' | 'rose' | 'amber' | 'cyan' | 'violet' | 'slate' | 'orange';

export interface ThemeInfo {
  id: ColorTheme;
  name: string;
  emoji: string;
  primary: string;     // color principal (hex con #) para previews
  primaryDark: string; // variante oscura (hex con #)
  preview: string;     // gradiente CSS para preview
}

export const COLOR_THEMES: ThemeInfo[] = [
  {
    id: 'indigo',
    name: 'Índigo',
    emoji: '💜',
    primary: '#6366f1',
    primaryDark: '#3730a3',
    preview: 'linear-gradient(135deg, #6366f1, #3730a3)'
  },
  {
    id: 'emerald',
    name: 'Esmeralda',
    emoji: '💚',
    primary: '#10b981',
    primaryDark: '#047857',
    preview: 'linear-gradient(135deg, #10b981, #047857)'
  },
  {
    id: 'rose',
    name: 'Rosa',
    emoji: '🌸',
    primary: '#f43f5e',
    primaryDark: '#9f1239',
    preview: 'linear-gradient(135deg, #f43f5e, #9f1239)'
  },
  {
    id: 'amber',
    name: 'Ámbar',
    emoji: '🧡',
    primary: '#f59e0b',
    primaryDark: '#b45309',
    preview: 'linear-gradient(135deg, #f59e0b, #b45309)'
  },
  {
    id: 'cyan',
    name: 'Cian',
    emoji: '💎',
    primary: '#06b6d4',
    primaryDark: '#0e7490',
    preview: 'linear-gradient(135deg, #06b6d4, #0e7490)'
  },
  {
    id: 'violet',
    name: 'Violeta',
    emoji: '🔮',
    primary: '#8b5cf6',
    primaryDark: '#5b21b6',
    preview: 'linear-gradient(135deg, #8b5cf6, #5b21b6)'
  },
  {
    id: 'orange',
    name: 'Naranja',
    emoji: '🔥',
    primary: '#f97316',
    primaryDark: '#c2410c',
    preview: 'linear-gradient(135deg, #f97316, #c2410c)'
  },
  {
    id: 'slate',
    name: 'Pizarra',
    emoji: '⚫',
    primary: '#475569',
    primaryDark: '#1e293b',
    preview: 'linear-gradient(135deg, #475569, #1e293b)'
  }
];

// Mapeo de cada tema a sus variables CSS completas
// Valores en formato "R G B" para soportar rgb(var(--x) / alpha)
const THEME_VARS: Record<ColorTheme, Record<string, string>> = {
  indigo: {
    '--color-primary-50': '238 242 255',
    '--color-primary-100': '224 231 255',
    '--color-primary-200': '199 210 254',
    '--color-primary-300': '165 180 252',
    '--color-primary-400': '129 140 248',
    '--color-primary-500': '99 102 241',
    '--color-primary-600': '79 70 229',
    '--color-primary-700': '67 56 202',
    '--color-primary-800': '55 48 163',
    '--color-primary-900': '49 46 129',
    '--color-primary-950': '30 27 75',
    '--theme-color': '#6366f1'
  },
  emerald: {
    '--color-primary-50': '236 253 245',
    '--color-primary-100': '209 250 229',
    '--color-primary-200': '167 243 208',
    '--color-primary-300': '110 231 183',
    '--color-primary-400': '52 211 153',
    '--color-primary-500': '16 185 129',
    '--color-primary-600': '5 150 105',
    '--color-primary-700': '4 120 87',
    '--color-primary-800': '6 95 70',
    '--color-primary-900': '6 78 59',
    '--color-primary-950': '2 44 34',
    '--theme-color': '#10b981'
  },
  rose: {
    '--color-primary-50': '255 241 242',
    '--color-primary-100': '255 228 230',
    '--color-primary-200': '254 205 211',
    '--color-primary-300': '253 164 175',
    '--color-primary-400': '251 113 133',
    '--color-primary-500': '244 63 94',
    '--color-primary-600': '225 29 72',
    '--color-primary-700': '159 18 57',
    '--color-primary-800': '136 19 55',
    '--color-primary-900': '76 5 25',
    '--color-primary-950': '76 5 25',
    '--theme-color': '#f43f5e'
  },
  amber: {
    '--color-primary-50': '255 251 235',
    '--color-primary-100': '254 243 199',
    '--color-primary-200': '253 230 138',
    '--color-primary-300': '252 211 77',
    '--color-primary-400': '251 191 36',
    '--color-primary-500': '245 158 11',
    '--color-primary-600': '217 119 6',
    '--color-primary-700': '180 83 9',
    '--color-primary-800': '146 64 14',
    '--color-primary-900': '120 53 15',
    '--color-primary-950': '69 26 3',
    '--theme-color': '#f59e0b'
  },
  cyan: {
    '--color-primary-50': '236 254 255',
    '--color-primary-100': '207 250 254',
    '--color-primary-200': '165 243 252',
    '--color-primary-300': '103 232 249',
    '--color-primary-400': '34 211 238',
    '--color-primary-500': '6 182 212',
    '--color-primary-600': '8 145 178',
    '--color-primary-700': '14 116 144',
    '--color-primary-800': '21 94 117',
    '--color-primary-900': '22 78 99',
    '--color-primary-950': '8 51 68',
    '--theme-color': '#06b6d4'
  },
  violet: {
    '--color-primary-50': '245 243 255',
    '--color-primary-100': '237 233 254',
    '--color-primary-200': '221 214 254',
    '--color-primary-300': '196 181 253',
    '--color-primary-400': '167 139 250',
    '--color-primary-500': '139 92 246',
    '--color-primary-600': '124 58 237',
    '--color-primary-700': '91 33 182',
    '--color-primary-800': '76 29 149',
    '--color-primary-900': '46 16 101',
    '--color-primary-950': '30 27 75',
    '--theme-color': '#8b5cf6'
  },
  orange: {
    '--color-primary-50': '255 247 237',
    '--color-primary-100': '255 237 213',
    '--color-primary-200': '254 215 170',
    '--color-primary-300': '253 186 116',
    '--color-primary-400': '251 146 60',
    '--color-primary-500': '249 115 22',
    '--color-primary-600': '234 88 12',
    '--color-primary-700': '194 65 12',
    '--color-primary-800': '154 52 18',
    '--color-primary-900': '124 45 18',
    '--color-primary-950': '67 20 7',
    '--theme-color': '#f97316'
  },
  slate: {
    '--color-primary-50': '248 250 252',
    '--color-primary-100': '241 245 249',
    '--color-primary-200': '226 232 240',
    '--color-primary-300': '203 213 225',
    '--color-primary-400': '148 163 184',
    '--color-primary-500': '71 85 105',
    '--color-primary-600': '51 65 85',
    '--color-primary-700': '30 41 59',
    '--color-primary-800': '15 23 42',
    '--color-primary-900': '2 6 23',
    '--color-primary-950': '2 6 23',
    '--theme-color': '#475569'
  }
};

const DEFAULT_THEME_VARS = THEME_VARS.indigo;

export function applyColorTheme(theme: ColorTheme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const vars = THEME_VARS[theme] || DEFAULT_THEME_VARS;
  // Limpiar variables previas
  const allKeys = new Set<string>();
  Object.values(THEME_VARS).forEach((v) => Object.keys(v).forEach((k) => allKeys.add(k)));
  allKeys.forEach((k) => root.style.removeProperty(k));
  // Aplicar nuevas
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

export function getThemeColor(theme: ColorTheme): string {
  return (THEME_VARS[theme] || DEFAULT_THEME_VARS)['--theme-color'];
}
