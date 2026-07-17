import { create } from 'zustand';
import { db, DEFAULT_SETTINGS, initializeDatabase } from '@/database/db';
import { getSettings, updateSettings as updateSettingsDb } from '@/services/finance';
import { applyColorTheme, getThemeColor } from '@/styles/themes';
import type { Settings } from '@/types';

interface SettingsStore {
  settings: Settings;
  loading: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (changes: Partial<Settings>) => Promise<void>;
  applyTheme: () => void;
}

function applyDarkMode(theme: 'light' | 'dark' | 'system'): boolean {
  const root = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
  root.classList.toggle('dark', isDark);
  return isDark;
}

function updateThemeColorMeta(theme: 'light' | 'dark' | 'system', colorTheme: Settings['colorTheme']): void {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
  const accentColor = getThemeColor(colorTheme || 'indigo');
  // Buscar meta tags para light/dark
  const metas = document.querySelectorAll('meta[name="theme-color"]');
  if (metas.length >= 2) {
    // metas[0] es light, metas[1] es dark (según index.html)
    (metas[0] as HTMLMetaElement).setAttribute('content', accentColor);
    (metas[1] as HTMLMetaElement).setAttribute('content', '#0f172a');
  } else if (metas.length === 1) {
    (metas[0] as HTMLMetaElement).setAttribute('content', isDark ? '#0f172a' : accentColor);
  }
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loading: true,
  loadSettings: async () => {
    await initializeDatabase();
    const s = await getSettings();
    const settings = s ?? DEFAULT_SETTINGS;
    set({ settings, loading: false });
    get().applyTheme();
  },
  updateSettings: async (changes) => {
    await updateSettingsDb(changes);
    set((state) => ({ settings: { ...state.settings, ...changes } }));
    if (changes.theme || changes.colorTheme) get().applyTheme();
  },
  applyTheme: () => {
    const { theme, colorTheme } = get().settings;
    applyDarkMode(theme);
    applyColorTheme(colorTheme || 'indigo');
    updateThemeColorMeta(theme, colorTheme || 'indigo');
  }
}));

// Listener para cambios en el tema del sistema
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { settings, applyTheme } = useSettingsStore.getState();
    if (settings.theme === 'system') applyTheme();
  });
}
