import { motion } from 'framer-motion';
import { useSettingsStore } from '@/context/SettingsContext';
import { useTranslation } from '@/hooks/useTranslation';
import { COLOR_THEMES } from '@/styles/themes';
import { CheckIcon } from '@/components/ui/Icons';
import { easings } from '@/utils/animations';

export function ColorThemeSelector() {
  const { settings, updateSettings } = useSettingsStore();
  const { t } = useTranslation();

  return (
    <div className="card">
      <h2 className="font-semibold mb-3">{t('settings.colorTheme')}</h2>
      <p className="text-xs text-muted mb-4">{t('settings.colorThemeDesc')}</p>
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {COLOR_THEMES.map((theme) => (
          <motion.button
            key={theme.id}
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.06 }}
            transition={easings.spring}
            onClick={() => updateSettings({ colorTheme: theme.id })}
            className={`relative aspect-square rounded-2xl flex items-center justify-center transition-shadow ${
              settings.colorTheme === theme.id
                ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white dark:ring-offset-slate-900 shadow-elevated'
                : 'shadow-soft'
            }`}
            style={{ background: theme.preview }}
            aria-label={theme.name}
            title={theme.name}
          >
            <span className="text-2xl drop-shadow">{theme.emoji}</span>
            {settings.colorTheme === theme.id && (
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={easings.bounce}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center shadow-md"
              >
                <CheckIcon size={12} className="text-slate-900 dark:text-white" />
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>
      <motion.div
        key={settings.colorTheme}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={easings.spring}
        className="mt-3 text-xs text-muted text-center"
      >
        {COLOR_THEMES.find((th) => th.id === settings.colorTheme)?.name} · {settings.colorTheme}
      </motion.div>
    </div>
  );
}
