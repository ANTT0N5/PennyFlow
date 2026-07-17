import { useState, useEffect } from 'react';
import { NavLink, useLocation, Outlet } from 'react-router-dom';
import type { TransactionType } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HomeIcon,
  WalletIcon,
  ChartIcon,
  TargetIcon,
  SettingsIcon,
  PlusIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@/components/ui/Icons';
import { QuickAddModal } from '@/components/movements/QuickAddModal';
import { useSettingsStore } from '@/context/SettingsContext';
import { useTranslation } from '@/hooks/useTranslation';
import {
  modalBackdrop,
  fabChild,
  easings
} from '@/utils/animations';

function useNavItems() {
  const { t } = useTranslation();
  return [
    { to: '/', label: t('nav.home'), icon: HomeIcon },
    { to: '/movements', label: t('nav.movements'), icon: WalletIcon },
    { to: '/statistics', label: t('nav.statistics'), icon: ChartIcon },
    { to: '/goals', label: t('nav.goals'), icon: TargetIcon },
    { to: '/settings', label: t('nav.settings'), icon: SettingsIcon }
  ];
}

export function AppLayout() {
  const location = useLocation();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [initialType, setInitialType] = useState<TransactionType | undefined>(undefined);
  const [fabOpen, setFabOpen] = useState(false);
  const { settings } = useSettingsStore();
  const { t } = useTranslation();
  const navItems = useNavItems();

  // Manejar shortcut de URL ?action=add-expense / add-income
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const action = params.get('action');
    if (action === 'add-expense') {
      setInitialType('expense');
      setQuickAddOpen(true);
    } else if (action === 'add-income') {
      setInitialType('income');
      setQuickAddOpen(true);
    }
  }, [location.search]);

  // Cerrar FAB al cambiar de ruta
  useEffect(() => {
    setFabOpen(false);
  }, [location.pathname]);

  const openModal = (type?: TransactionType) => {
    setInitialType(type);
    setQuickAddOpen(true);
    setFabOpen(false);
  };

  return (
    <div className="min-h-screen bg-surface-light-2 dark:bg-surface-dark">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-surface-dark-2 border-r border-slate-100 dark:border-slate-800 pt-safe pl-safe">
        <div className="px-6 py-6">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold shadow-soft text-lg">
              P
            </div>
            <div>
              <div className="font-semibold text-sm">PennyFlow</div>
              <div className="text-[10px] text-muted uppercase tracking-wider">Privacy First</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-2 flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-600/10 dark:text-primary-400'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <motion.span
                    animate={{ scale: isActive ? 1.1 : 1 }}
                    transition={easings.spring}
                  >
                    <item.icon size={20} />
                  </motion.span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 space-y-2">
          <button
            onClick={() => openModal('expense')}
            className="btn bg-danger-500 text-white hover:bg-danger-600 w-full"
          >
            <ArrowDownIcon size={16} /> {t('quickAdd.newExpense')}
          </button>
          <button
            onClick={() => openModal('income')}
            className="btn bg-success-500 text-white hover:bg-success-600 w-full"
          >
            <ArrowUpIcon size={16} /> {t('quickAdd.newIncome')}
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="lg:pl-64 min-h-screen flex flex-col">
        <div className="flex-1 pb-24 lg:pb-8 pt-safe">
          <div
            key={location.pathname}
            className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6"
          >
            <Outlet />
          </div>
        </div>
      </main>

      {/* FAB flotante inferior izquierdo (móvil) */}
      <div className="lg:hidden fixed left-5 bottom-28 z-40 flex flex-col items-start gap-3">
        <AnimatePresence>
          {fabOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                variants={modalBackdrop}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={() => setFabOpen(false)}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm -z-10"
              />
              {/* Botón Ingreso */}
              <motion.button
                custom={0}
                variants={fabChild}
                initial="hidden"
                animate="visible"
                exit="hidden"
                onClick={() => openModal('income')}
                className="flex items-center gap-2 pl-4 pr-5 py-3 rounded-full bg-success-500 text-white shadow-elevated active:scale-95 transition-transform"
              >
                <ArrowUpIcon size={18} />
                <span className="text-sm font-semibold">{t('quickAdd.income')}</span>
              </motion.button>
              {/* Botón Gasto */}
              <motion.button
                custom={1}
                variants={fabChild}
                initial="hidden"
                animate="visible"
                exit="hidden"
                onClick={() => openModal('expense')}
                className="flex items-center gap-2 pl-4 pr-5 py-3 rounded-full bg-danger-500 text-white shadow-elevated active:scale-95 transition-transform"
              >
                <ArrowDownIcon size={18} />
                <span className="text-sm font-semibold">{t('quickAdd.expense')}</span>
              </motion.button>
            </>
          )}
        </AnimatePresence>

        {/* Botón principal + */}
        <motion.button
          onClick={() => setFabOpen(!fabOpen)}
          whileTap={{ scale: 0.88 }}
          animate={{
            rotate: fabOpen ? 135 : 0,
            scale: fabOpen ? 1.05 : 1
          }}
          transition={easings.bounce}
          className="w-16 h-16 rounded-2xl bg-primary-600 text-white shadow-elevated flex items-center justify-center"
          aria-label={t('quickAdd.addMovement')}
          aria-expanded={fabOpen}
        >
          <PlusIcon size={32} />
        </motion.button>
      </div>

      {/* Bottom navigation móvil - 5 items simétricos */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-surface-dark-2/95 backdrop-blur-lg border-t border-slate-100 dark:border-slate-800 pb-safe z-30">
        <div className="flex items-stretch px-1">
          {navItems.map((item) => (
            <NavItem key={item.to} item={item} />
          ))}
        </div>
      </nav>

      <QuickAddModal
        open={quickAddOpen}
        initialType={initialType}
        onClose={() => {
          setQuickAddOpen(false);
          setInitialType(undefined);
          if (location.search.includes('action=')) {
            window.history.replaceState({}, '', location.pathname);
          }
        }}
        privacyMode={settings.privacyMode}
      />
    </div>
  );
}

function NavItem({ item }: { item: { to: string; label: string; icon: typeof HomeIcon } }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
    >
      {({ isActive }) => (
        <>
          <motion.span
            animate={{
              scale: isActive ? 1.05 : 1,
              y: isActive ? -1 : 0
            }}
            transition={easings.spring}
          >
            <item.icon size={22} />
          </motion.span>
          <span className="text-[10px] font-medium truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}
