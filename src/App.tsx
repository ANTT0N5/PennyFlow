import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useSettingsStore } from '@/context/SettingsContext';
import { AppLayout } from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Movements from '@/pages/Movements';
import Statistics from '@/pages/Statistics';
import Goals from '@/pages/Goals';
import SettingsPage from '@/pages/Settings';
import { OnboardingScreen } from '@/components/common/OnboardingScreen';
import { PinLock } from '@/components/common/PinLock';
import { checkAndNotifyUpcomingPayments } from '@/services/notifications';

export default function App() {
  const { settings, loading, loadSettings } = useSettingsStore();
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Registrar service worker para PWA (vite-plugin-pwa lo maneja en producción)
  useEffect(() => {
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      // SW principal (Workbox - cache offline)
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Silenciar errores
      });
      // SW adicional para notificaciones (notificationclick handler)
      navigator.serviceWorker.register('/notifications-sw.js', { scope: '/' }).catch(() => {
        // Silenciar errores
      });
    }
  }, []);

  // Comprobar recordatorios de pagos recurrentes cuando la app está activa
  useEffect(() => {
    if (!settings.onboarded || !settings.notificationsEnabled) return;

    // Comprobar al cargar
    checkAndNotifyUpcomingPayments(settings).catch(() => {});

    // Comprobar cada 30 minutos mientras la app está abierta
    const interval = setInterval(() => {
      checkAndNotifyUpcomingPayments(settings).catch(() => {});
    }, 30 * 60 * 1000);

    // Comprobar cuando la app vuelve a estar visible
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        checkAndNotifyUpcomingPayments(settings).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [settings.onboarded, settings.notificationsEnabled, settings.language, settings.dateFormat, settings.currency, settings.numberFormat]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-light-2 dark:bg-surface-dark">
        <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!settings.onboarded) {
    return <OnboardingScreen />;
  }

  if (settings.pinEnabled && !unlocked) {
    return <PinLock onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/movements" element={<Movements />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Dashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
