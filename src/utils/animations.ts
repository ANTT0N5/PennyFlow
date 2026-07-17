// ===== Sistema de animaciones global =====
// Variantes reutilizables para mantener coherencia en toda la app

import type { Variants, Transition } from 'framer-motion';

// ===== Easings =====
// Curvas custom estilo Material 3 / Apple HIG
export const easings = {
  // Curva estándar - paraentradas y salidas normales
  standard: [0.4, 0.0, 0.2, 1] as const,
  // Curva enfática - para elementos que llaman la atención
  emphasized: [0.2, 0.0, 0, 1] as const,
  // Curva de salida - salidas rápidas
  exit: [0.4, 0.0, 1, 1] as const,
  // Spring suave para elementos interactivos
  spring: { type: 'spring', stiffness: 400, damping: 30, mass: 0.8 } as Transition,
  // Spring enérgico para FAB y botones
  bounce: { type: 'spring', stiffness: 500, damping: 25, mass: 0.6 } as Transition,
  // Spring muy suave para modales
  modal: { type: 'spring', stiffness: 280, damping: 28, mass: 1 } as Transition
};

// ===== Duraciones =====
export const durations = {
  fast: 0.15,      // hover, focus
  normal: 0.2,     // taps, toggles
  slow: 0.3,       // entradas de página
  slower: 0.4      // modales, dialogs
};

// ===== Variantes de entrada =====

// Entrada suave desde abajo (tarjetas, widgets)
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.normal, ease: easings.emphasized }
  },
  exit: {
    opacity: 0,
    y: 8,
    transition: { duration: durations.fast, ease: easings.exit }
  }
};

// Entrada con escala (modales, popovers)
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: easings.spring
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: { duration: durations.fast, ease: easings.exit }
  }
};

// Entrada desde la derecha (cambio de página)
export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: durations.slow, ease: easings.emphasized }
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: { duration: durations.normal, ease: easings.exit }
  }
};

// Fade simple
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: durations.normal } },
  exit: { opacity: 0, transition: { duration: durations.fast } }
};

// ===== Variantes para listas (stagger) =====
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.05
    }
  }
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.normal, ease: easings.emphasized }
  }
};

// ===== Variantes para modales =====
export const modalBackdrop: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: durations.normal } },
  exit: { opacity: 0, transition: { duration: durations.fast } }
};

export const modalPanel: Variants = {
  hidden: { opacity: 0, y: 60, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: easings.modal
  },
  exit: {
    opacity: 0,
    y: 40,
    scale: 0.98,
    transition: { duration: durations.normal, ease: easings.exit }
  }
};

// ===== Variantes para FAB =====
export const fabMain: Variants = {
  rest: { rotate: 0, scale: 1 },
  open: {
    rotate: 45,
    scale: 1.05,
    transition: easings.bounce
  },
  tap: { scale: 0.9 }
};

export const fabChild: Variants = {
  hidden: { opacity: 0, scale: 0.4, y: 12 },
  visible: (i: number = 0) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      ...easings.spring,
      delay: i * 0.04
    }
  }),
  exit: {
    opacity: 0,
    scale: 0.4,
    y: 12,
    transition: { duration: durations.fast, ease: easings.exit }
  }
};

// ===== Variantes para tabs y chips =====
export const tabIndicator: Variants = {
  rest: { scale: 1 },
  active: {
    scale: 1.02,
    transition: easings.spring
  }
};

// ===== Variantes para toggles =====
export const toggleThumb: Variants = {
  off: { x: 2 },
  on: { x: 22 }
};

// ===== Props comunes para microinteracciones =====
export const microInteractions = {
  whileTap: { scale: 0.96 },
  whileHover: { scale: 1.02 },
  transition: easings.spring
};

export const buttonTap = {
  whileTap: { scale: 0.95 },
  transition: { duration: durations.fast, ease: easings.standard }
};

export const cardHover = {
  whileHover: { y: -2, transition: { duration: durations.fast, ease: easings.standard } },
  whileTap: { scale: 0.99 }
};
