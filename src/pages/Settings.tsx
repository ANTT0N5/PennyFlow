import { useState, useEffect } from 'react';
import { useSettingsStore } from '@/context/SettingsContext';
import {
  exportToCSV,
  exportToJSON,
  exportToExcel,
  exportToPDF,
  downloadFile,
  parseCSV,
  parseJSON
} from '@/services/exportImport';
import {
  exportFullBackup,
  importFullBackup,
  clearAllData,
  createTransaction
} from '@/services/finance';
import {
  isNotificationsSupported,
  getNotificationPermission,
  requestNotificationPermission,
  sendTestNotification,
  checkAndNotifyUpcomingPayments
} from '@/services/notifications';
import { useTransactions, useCategories, useTags } from '@/hooks/useFinance';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { format } from '@/utils/date';
import {
  SunIcon,
  MoonIcon,
  DownloadIcon,
  UploadIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  TrashIcon,
  ShieldIcon,
  InfoIcon,
  CheckIcon,
  BellIcon
} from '@/components/ui/Icons';
import { motion } from 'framer-motion';
import { CategoriesManager } from '@/components/settings/CategoriesManager';
import { ColorThemeSelector } from '@/components/settings/ColorThemeSelector';
import { useTranslation } from '@/hooks/useTranslation';
import { SUPPORTED_LANGUAGES } from '@/i18n/translations';

const CURRENCIES = ['EUR', 'USD', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'CNY', 'MXN', 'ARS', 'COP', 'CLP', 'PEN', 'BRL'];

export default function SettingsPage() {
  const { settings, updateSettings } = useSettingsStore();
  const { t } = useTranslation();
  const transactions = useTransactions();
  const categories = useCategories();
  const tags = useTags();
  const [confirmClear, setConfirmClear] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleExport = (format: 'csv' | 'json' | 'excel' | 'pdf' | 'backup') => {
    const date = formatStr(new Date(), 'yyyy-MM-dd');
    if (format === 'csv') {
      downloadFile(exportToCSV(transactions, categories, settings), `movimientos-${date}.csv`, 'text/csv');
    } else if (format === 'json') {
      downloadFile(exportToJSON(transactions, categories), `movimientos-${date}.json`, 'application/json');
    } else if (format === 'excel') {
      downloadFile(exportToExcel(transactions, categories, settings), `movimientos-${date}.xls`, 'application/vnd.ms-excel');
    } else if (format === 'pdf') {
      const html = exportToPDF(transactions, categories, settings);
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(html);
        w.document.close();
      }
    } else if (format === 'backup') {
      exportFullBackup().then((json) => {
        downloadFile(json, `backup-${date}.json`, 'application/json');
      });
    }
    showToast(`${t('settings.exportedAs')} ${format.toUpperCase()}`);
  };

  const handleImportFile = async (file: File, type: 'csv' | 'json' | 'backup') => {
    const text = await file.text();
    try {
      if (type === 'csv') {
        const parsed = parseCSV(text);
        for (const p of parsed) {
          if (!p.concept || !p.amount) continue;
          // Asignar categoría "Otros" si no se encuentra
          const otros = categories.find((c) => c.name === 'Otros');
          await createTransaction({
            type: p.type || 'expense',
            amount: p.amount,
            concept: p.concept,
            categoryId: otros?.id || categories[0]?.id || '',
            tags: [],
            date: p.date || Date.now(),
            time: p.time,
            recurringId: null
          });
        }
        showToast(`${parsed.length} ${t('settings.importedCount')}`);
      } else if (type === 'json') {
        const parsed = parseJSON(text);
        for (const p of parsed.transactions || []) {
          if (!p.concept || !p.amount) continue;
          const otros = categories.find((c) => c.name === 'Otros');
          await createTransaction({
            type: p.type || 'expense',
            amount: p.amount,
            concept: p.concept,
            categoryId: p.categoryId || otros?.id || categories[0]?.id || '',
            tags: p.tags || [],
            note: p.note,
            date: p.date || Date.now(),
            time: p.time,
            recurringId: null
          });
        }
        showToast(t('settings.importedSuccess'));
      } else if (type === 'backup') {
        await importFullBackup(text, false);
        showToast(t('settings.backupRestored'));
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (e) {
      showToast(t('settings.importError'));
    }
    setImportOpen(false);
  };

  const handleSavePin = async () => {
    if (newPin.length < 4) {
      setPinError(t('settings.pinErrorLength'));
      return;
    }
    if (newPin !== confirmPin) {
      setPinError(t('settings.pinErrorMatch'));
      return;
    }
    // Hash simple (en producción usar SubtleCrypto)
    const hash = btoa(newPin);
    await updateSettings({
      pinEnabled: true,
      pinHash: hash,
      autoLockMinutes: 5
    });
    setPinModalOpen(false);
    setNewPin('');
    setConfirmPin('');
    setPinError('');
    showToast(t('settings.pinActivated'));
  };

  const handleDisablePin = async () => {
    await updateSettings({
      pinEnabled: false,
      pinHash: undefined,
      autoLockMinutes: 0
    });
    showToast(t('settings.pinDeactivated'));
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
        <p className="text-sm text-muted">{t('settings.subtitle')}</p>
      </div>

      {/* Apariencia */}
      <Section title={t('settings.appearance')} icon={<SunIcon size={18} />}>
        <Row label={t('settings.theme')}>
          <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {([
              { v: 'light', l: t('settings.light'), icon: <SunIcon size={14} /> },
              { v: 'dark', l: t('settings.dark'), icon: <MoonIcon size={14} /> },
              { v: 'system', l: t('settings.auto'), icon: <EyeIcon size={14} /> }
            ] as const).map((opt) => (
              <button
                key={opt.v}
                onClick={() => updateSettings({ theme: opt.v })}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  settings.theme === opt.v
                    ? 'bg-white dark:bg-slate-700 shadow-soft text-slate-900 dark:text-white'
                    : 'text-slate-500'
                }`}
              >
                {opt.icon} {opt.l}
              </button>
            ))}
          </div>
        </Row>
        <Row label={t('settings.privacyMode')}>
          <Toggle
            checked={settings.privacyMode}
            onChange={(v) => updateSettings({ privacyMode: v })}
          />
        </Row>
        <Row label={t('settings.hideAmounts')}>
          <Toggle
            checked={settings.hideAmounts}
            onChange={(v) => updateSettings({ hideAmounts: v })}
          />
        </Row>
      </Section>

      {/* Selector de color */}
      <ColorThemeSelector />

      {/* Categorías */}
      <CategoriesManager />

      {/* Preferencias */}
      <Section title={t('settings.preferences')} icon={<InfoIcon size={18} />}>
        <Row label={t('settings.currency')}>
          <select
            value={settings.currency}
            onChange={(e) => updateSettings({ currency: e.target.value })}
            className="input max-w-[140px]"
          >
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Row>
        <Row label={t('settings.language')}>
          <select
            value={settings.language}
            onChange={(e) => updateSettings({ language: e.target.value as any })}
            className="input max-w-[180px]"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.flag} {lang.name}
              </option>
            ))}
          </select>
        </Row>
        <Row label={t('settings.dateFormat')}>
          <select
            value={settings.dateFormat}
            onChange={(e) => updateSettings({ dateFormat: e.target.value as any })}
            className="input max-w-[160px]"
          >
            <option value="dd/MM/yyyy">DD/MM/YYYY</option>
            <option value="MM/dd/yyyy">MM/DD/YYYY</option>
            <option value="yyyy-MM-dd">YYYY-MM-DD</option>
          </select>
        </Row>
        <Row label={t('settings.firstDayOfWeek')}>
          <select
            value={settings.firstDayOfWeek}
            onChange={(e) => updateSettings({ firstDayOfWeek: Number(e.target.value) as 0 | 1 })}
            className="input max-w-[140px]"
          >
            <option value={1}>{t('settings.monday')}</option>
            <option value={0}>{t('settings.sunday')}</option>
          </select>
        </Row>
        <Row label={t('settings.numberFormat')}>
          <select
            value={settings.numberFormat}
            onChange={(e) => updateSettings({ numberFormat: e.target.value as 'es' | 'en' })}
            className="input max-w-[140px]"
          >
            <option value="es">1.234,56</option>
            <option value="en">1,234.56</option>
          </select>
        </Row>
      </Section>

      {/* Notificaciones */}
      <Section title={t('settings.notifications')} icon={<BellIcon size={18} />}>
        <NotifBlock />
      </Section>

      {/* Seguridad */}
      <Section title={t('settings.security')} icon={<LockIcon size={18} />}>
        <Row label={t('settings.pinLock')}>
          {settings.pinEnabled ? (
            <button onClick={handleDisablePin} className="btn-secondary text-xs">{t('settings.deactivate')}</button>
          ) : (
            <button onClick={() => setPinModalOpen(true)} className="btn-primary text-xs">{t('settings.activate')}</button>
          )}
        </Row>
        {settings.pinEnabled && (
          <Row label={t('settings.autoLock')}>
            <select
              value={settings.autoLockMinutes}
              onChange={(e) => updateSettings({ autoLockMinutes: Number(e.target.value) })}
              className="input max-w-[140px]"
            >
              <option value={0}>{t('settings.never')}</option>
              <option value={1}>1 {t('settings.minute')}</option>
              <option value={5}>5 {t('settings.minutes')}</option>
              <option value={15}>15 {t('settings.minutes')}</option>
              <option value={30}>30 {t('settings.minutes')}</option>
            </select>
          </Row>
        )}
      </Section>

      {/* Datos */}
      <Section title={t('settings.dataBackup')} icon={<ShieldIcon size={18} />}>
        <div className="space-y-2">
          <div className="text-xs text-muted">{t('settings.exportLabel')}</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button onClick={() => handleExport('csv')} className="btn-secondary text-xs">
              <DownloadIcon size={14} /> CSV
            </button>
            <button onClick={() => handleExport('excel')} className="btn-secondary text-xs">
              <DownloadIcon size={14} /> Excel
            </button>
            <button onClick={() => handleExport('pdf')} className="btn-secondary text-xs">
              <DownloadIcon size={14} /> PDF
            </button>
            <button onClick={() => handleExport('json')} className="btn-secondary text-xs">
              <DownloadIcon size={14} /> JSON
            </button>
            <button onClick={() => handleExport('backup')} className="btn-primary text-xs col-span-2 sm:col-span-1">
              <ShieldIcon size={14} /> {t('settings.fullBackup')}
            </button>
          </div>
          <div className="text-xs text-muted mt-3">{t('settings.importLabel')}</div>
          <div className="grid grid-cols-3 gap-2">
            <label className="btn-secondary text-xs cursor-pointer">
              <UploadIcon size={14} /> CSV
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleImportFile(e.target.files[0], 'csv')}
              />
            </label>
            <label className="btn-secondary text-xs cursor-pointer">
              <UploadIcon size={14} /> JSON
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleImportFile(e.target.files[0], 'json')}
              />
            </label>
            <label className="btn-secondary text-xs cursor-pointer">
              <UploadIcon size={14} /> Backup
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleImportFile(e.target.files[0], 'backup')}
              />
            </label>
          </div>
          <div className="text-xs text-muted mt-2 flex items-center gap-1">
            <ShieldIcon size={12} /> {t('settings.processedLocally')}
          </div>
        </div>
      </Section>

      {/* Zona peligrosa */}
      <Section title={t('settings.dangerZone')} icon={<TrashIcon size={18} />} danger>
        <button
          onClick={() => setConfirmClear(true)}
          className="btn-danger w-full"
        >
          <TrashIcon size={16} /> {t('settings.deleteAllData')}
        </button>
        <p className="text-xs text-muted mt-2">
          {t('settings.deleteAllDesc')}
        </p>
      </Section>

      {/* Acerca de */}
      <div className="card text-center">
        <div className="text-sm font-semibold mb-1">PennyFlow</div>
        <div className="text-xs text-muted">{t('settings.version')}</div>
        <div className="text-xs text-muted mt-2">
          {t('settings.privacyDesc')}
        </div>
      </div>

      {/* Diálogos */}
      <ConfirmDialog
        open={confirmClear}
        title={t('settings.deleteAllData') + "?"}
        message={t('settings.deleteAllDesc')}
        confirmLabel={t('settings.borrarTodo')}
        danger
        onConfirm={async () => {
          await clearAllData();
          setConfirmClear(false);
          showToast(t('settings.allDataDeleted'));
          setTimeout(() => window.location.reload(), 1000);
        }}
        onCancel={() => setConfirmClear(false)}
      />

      {/* PIN Modal */}
      <Modal open={pinModalOpen} onClose={() => setPinModalOpen(false)} title={t('settings.pinSetup')}>
        <div className="space-y-4">
          <div>
            <label className="label">{t('settings.newPin')}</label>
            <input
              type="password"
              inputMode="numeric"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              maxLength={6}
              className="input text-center text-2xl tracking-widest"
            />
          </div>
          <div>
            <label className="label">{t('settings.confirmPin')}</label>
            <input
              type="password"
              inputMode="numeric"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              maxLength={6}
              className="input text-center text-2xl tracking-widest"
            />
          </div>
          {pinError && <p className="text-xs text-danger-600">{pinError}</p>}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setPinModalOpen(false);
                setNewPin('');
                setConfirmPin('');
                setPinError('');
              }}
              className="btn-secondary flex-1"
            >
              {t('common.cancel')}
            </button>
            <button onClick={handleSavePin} className="btn-primary flex-1">
              {t('settings.activatePin')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-xl shadow-elevated text-sm font-medium z-50 flex items-center gap-2"
        >
          <CheckIcon size={16} /> {toast}
        </motion.div>
      )}
    </div>
  );
}

function Section({ title, icon, children, danger = false }: { title: string; icon: React.ReactNode; children: React.ReactNode; danger?: boolean }) {
  return (
    <div className={`card ${danger ? 'border border-danger-100 dark:border-danger-500/20' : ''}`}>
      <h2 className={`font-semibold mb-3 flex items-center gap-2 ${danger ? 'text-danger-600' : ''}`}>
        {icon} {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm">{label}</span>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-primary-600' : 'bg-slate-300 dark:bg-slate-600'}`}
      role="switch"
      aria-checked={checked}
    >
      <motion.span
        animate={{ x: checked ? 22 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32, mass: 0.7 }}
        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-md"
      />
    </button>
  );
}

// Helper local para evitar conflicto de nombres
function formatStr(d: Date, fmt: string): string {
  return format(d, fmt, { locale: undefined });
}

// ===== Bloque de notificaciones =====
function NotifBlock() {
  const { settings, updateSettings } = useSettingsStore();
  const { t } = useTranslation();
  const [permission, setPermission] = useState(getNotificationPermission());

  // Sincronizar permiso real
  useEffect(() => {
    setPermission(getNotificationPermission());
  }, [settings.notificationsEnabled]);

  const supported = isNotificationsSupported();

  if (!supported) {
    return (
      <div className="text-xs text-muted p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
        {t('settings.notificationsUnsupported')}
      </div>
    );
  }

  const handleToggle = async () => {
    if (settings.notificationsEnabled) {
      // Desactivar
      await updateSettings({ notificationsEnabled: false });
      setPermission(getNotificationPermission());
      return;
    }
    // Activar: pedir permiso
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === 'granted') {
      await updateSettings({ notificationsEnabled: true });
      // Enviar notificación de bienvenida
      await sendTestNotification();
      // Comprobar recordatorios pendientes
      checkAndNotifyUpcomingPayments(settings).catch(() => {});
    }
  };

  const blocked = permission === 'denied';

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">{t('settings.notificationsDesc')}</p>
      <Row label={t('settings.enableNotifications')}>
        <Toggle
          checked={settings.notificationsEnabled && permission === 'granted'}
          onChange={handleToggle}
        />
      </Row>

      {blocked && (
        <div className="text-xs text-danger-600 p-2 bg-danger-50 dark:bg-danger-500/10 rounded-lg">
          ⚠️ {t('settings.notificationsBlocked')}
        </div>
      )}

      {settings.notificationsEnabled && permission === 'granted' && (
        <button
          onClick={() => sendTestNotification()}
          className="btn-secondary text-xs w-full"
        >
          <BellIcon size={14} /> {t('settings.testNotification')}
        </button>
      )}
    </div>
  );
}
