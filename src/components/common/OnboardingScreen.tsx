import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore } from '@/context/SettingsContext';
import { SUPPORTED_LANGUAGES } from '@/i18n/translations';
import { useTranslation } from '@/hooks/useTranslation';
import { ShieldIcon, LockIcon, ChartIcon, CheckIcon } from '@/components/ui/Icons';
import { detectBrowserLanguage } from '@/i18n/translations';
import { easings, fadeUp, staggerContainer, staggerItem } from '@/utils/animations';
import type { Language } from '@/i18n/types';

export function OnboardingScreen() {
  const { settings, updateSettings } = useSettingsStore();
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [selectedLang, setSelectedLang] = useState<Language>(settings.language);

  // Si el usuario aún no ha confirmado su idioma, mostrar paso 0 (selector)
  useEffect(() => {
    if (!settings.languageAsked) {
      setStep(0);
      // Pre-seleccionar idioma detectado del navegador
      setSelectedLang(detectBrowserLanguage());
    } else {
      setStep(1);
    }
  }, [settings.languageAsked]);

  const handleConfirmLanguage = async () => {
    await updateSettings({
      language: selectedLang,
      languageAsked: true
    });
    setStep(1);
  };

  // Pasos del onboarding (sin incluir el de idioma que es el 0)
  const steps = [
    {
      icon: <ShieldIcon size={48} />,
      titleKey: 'onboarding.privacyTitle',
      descKey: 'onboarding.privacyDesc',
      color: 'from-primary-500 to-primary-700'
    },
    {
      icon: <LockIcon size={48} />,
      titleKey: 'onboarding.controlTitle',
      descKey: 'onboarding.controlDesc',
      color: 'from-success-500 to-success-700'
    },
    {
      icon: <ChartIcon size={48} />,
      titleKey: 'onboarding.intelligenceTitle',
      descKey: 'onboarding.intelligenceDesc',
      color: 'from-amber-500 to-orange-600'
    }
  ];

  const handleFinish = async () => {
    await updateSettings({ onboarded: true });
  };

  // Paso 0: Selector de idioma
  if (step === 0 && !settings.languageAsked) {
    return (
      <div className="min-h-screen bg-surface-light-2 dark:bg-surface-dark flex flex-col px-6 pt-safe pb-safe">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full"
        >
          {/* Icono */}
          <motion.div
            variants={staggerItem}
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={easings.bounce}
            className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary-500 to-primary-700 text-white flex items-center justify-center mb-6 shadow-elevated text-4xl"
          >
            🌍
          </motion.div>

          <motion.h1
            variants={staggerItem}
            className="text-2xl font-bold mb-2 text-center"
          >
            {t('onboarding.languageTitle')}
          </motion.h1>
          <motion.p
            variants={staggerItem}
            className="text-muted text-center mb-8 leading-relaxed"
          >
            {t('onboarding.languageDesc')}
          </motion.p>

          {/* Lista de idiomas */}
          <motion.div
            variants={staggerItem}
            className="w-full space-y-2"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <motion.button
                key={lang.code}
                whileTap={{ scale: 0.98 }}
                transition={easings.spring}
                onClick={() => setSelectedLang(lang.code)}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all border-2 ${
                  selectedLang === lang.code
                    ? 'bg-primary-50 dark:bg-primary-600/20 border-primary-500 shadow-soft'
                    : 'bg-white dark:bg-surface-dark-2 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                }`}
              >
                <span className="text-3xl">{lang.flag}</span>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-base">{lang.name}</div>
                  <div className="text-xs text-muted">{lang.englishName}</div>
                </div>
                <AnimatePresence>
                  {selectedLang === lang.code && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={easings.bounce}
                      className="w-7 h-7 rounded-full bg-primary-600 text-white flex items-center justify-center"
                    >
                      <CheckIcon size={16} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, ...easings.spring }}
          className="max-w-md mx-auto w-full"
        >
          <motion.button
            whileTap={{ scale: 0.97 }}
            transition={easings.spring}
            onClick={handleConfirmLanguage}
            className="btn-primary w-full"
          >
            {t('onboarding.next')}
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // Pasos 1+: Onboarding de privacidad
  const currentStep = steps[step - 1] || steps[0];
  const isLast = step === steps.length;

  return (
    <div className="min-h-screen bg-surface-light-2 dark:bg-surface-dark flex flex-col px-6 pt-safe pb-safe">
      <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -24, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={easings.bounce}
              className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${currentStep.color} text-white flex items-center justify-center mx-auto mb-8 shadow-elevated`}
            >
              {currentStep.icon}
            </motion.div>
            <h1 className="text-2xl font-bold mb-3">{t(currentStep.titleKey)}</h1>
            <p className="text-muted leading-relaxed">{t(currentStep.descKey)}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="max-w-md mx-auto w-full">
        {/* Indicadores */}
        <div className="flex justify-center gap-2 mb-6">
          {steps.map((_, i) => (
            <motion.div
              key={i}
              animate={{
                width: i + 1 === step ? 24 : 6,
                backgroundColor: i + 1 === step ? 'rgb(var(--color-primary-600))' : 'rgb(203 213 225)'
              }}
              transition={easings.spring}
              className="h-1.5 rounded-full"
            />
          ))}
        </div>

        <div className="flex gap-3 mb-4">
          {step > 1 && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              transition={easings.spring}
              onClick={() => setStep(step - 1)}
              className="btn-secondary flex-1"
            >
              {t('onboarding.back')}
            </motion.button>
          )}
          {!isLast ? (
            <motion.button
              whileTap={{ scale: 0.97 }}
              transition={easings.spring}
              onClick={() => setStep(step + 1)}
              className="btn-primary flex-1"
            >
              {t('onboarding.next')}
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.97 }}
              transition={easings.spring}
              onClick={handleFinish}
              className="btn-primary flex-1"
            >
              {t('onboarding.start')}
            </motion.button>
          )}
        </div>
        {!isLast && (
          <button
            onClick={handleFinish}
            className="w-full text-center text-sm text-muted py-2"
          >
            {t('onboarding.skip')}
          </button>
        )}
      </div>
    </div>
  );
}
