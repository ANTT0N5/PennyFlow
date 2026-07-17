import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LockIcon } from '@/components/ui/Icons';
import { useSettingsStore } from '@/context/SettingsContext';
import { easings, scaleIn } from '@/utils/animations';

interface Props {
  onUnlock: () => void;
}

export function PinLock({ onUnlock }: Props) {
  const { settings } = useSettingsStore();
  const [entered, setEntered] = useState('');
  const [error, setError] = useState(false);

  const handleDigit = (digit: string) => {
    setError(false);
    const next = entered + digit;
    if (next.length <= 6) {
      setEntered(next);
      if (next.length >= 4) {
        // Verificar
        const hash = btoa(next);
        if (hash === settings.pinHash) {
          setTimeout(onUnlock, 200);
        } else {
          setTimeout(() => {
            setError(true);
            setEntered('');
          }, 250);
        }
      }
    }
  };

  const handleDelete = () => {
    setEntered(entered.slice(0, -1));
    setError(false);
  };

  return (
    <div className="min-h-screen bg-surface-light-2 dark:bg-surface-dark flex flex-col items-center justify-center px-6 pt-safe pb-safe">
      <motion.div
        variants={scaleIn}
        initial="hidden"
        animate="visible"
        className="w-full max-w-xs"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={easings.bounce}
            className="w-16 h-16 rounded-2xl bg-primary-600 text-white flex items-center justify-center mx-auto mb-4 shadow-elevated"
          >
            <LockIcon size={28} />
          </motion.div>
          <h1 className="text-xl font-bold mb-1">Introduce tu PIN</h1>
          <p className="text-sm text-muted">Para acceder a tus finanzas</p>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-3 mb-8">
          {Array.from({ length: Math.max(4, entered.length || 4) }).map((_, i) => (
            <motion.div
              key={i}
              animate={{
                scale: i < entered.length ? 1 : 0.8,
                backgroundColor: error ? '#ef4444' : i < entered.length ? 'rgb(var(--color-primary-500))' : '#cbd5e1'
              }}
              transition={easings.spring}
              className="w-3 h-3 rounded-full"
            />
          ))}
        </div>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center text-danger-600 text-sm mb-4"
            >
              PIN incorrecto
            </motion.p>
          )}
        </AnimatePresence>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <motion.button
              key={digit}
              onClick={() => handleDigit(digit)}
              whileTap={{ scale: 0.92 }}
              transition={easings.spring}
              className="aspect-square rounded-2xl bg-white dark:bg-surface-dark-2 shadow-soft text-xl font-semibold"
            >
              {digit}
            </motion.button>
          ))}
          <div />
          <motion.button
            onClick={() => handleDigit('0')}
            whileTap={{ scale: 0.92 }}
            transition={easings.spring}
            className="aspect-square rounded-2xl bg-white dark:bg-surface-dark-2 shadow-soft text-xl font-semibold"
          >
            0
          </motion.button>
          <motion.button
            onClick={handleDelete}
            whileTap={{ scale: 0.92 }}
            transition={easings.spring}
            className="aspect-square rounded-2xl text-slate-500 flex items-center justify-center"
            aria-label="Borrar"
          >
            ⌫
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
