import { useSettingsStore } from '@/context/SettingsContext';
import { translations } from '@/i18n/translations';
import type { Language } from '@/i18n/types';

export function useTranslation() {
  const { settings } = useSettingsStore();
  const lang: Language = settings.language;

  const t = (key: string, params?: Record<string, string | number>): string => {
    const dict = translations[lang] || translations.es;
    let value = dict[key] || translations.es[key] || translations.en[key] || key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return value;
  };

  return { t, lang };
}
