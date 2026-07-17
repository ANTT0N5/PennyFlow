import type { TransactionType } from '@/types';

export interface ParsedQuickEntry {
  type: TransactionType;
  amount: number;
  concept: string;
  raw: string;
}

/**
 * Parser de entrada rápida.
 * Ejemplos soportados:
 *   -18 supermercado
 *   +1500 nómina
 *   12,50 café
 *   -20 transporte taxi
 *   50 ocio cine
 */
export function parseQuickEntry(input: string): ParsedQuickEntry | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Patrones:
  // 1) [+|-]\d+([.,]\d+)? ...concepto
  // 2) \d+([.,]\d+)? ...concepto (sin signo = gasto por defecto)
  const signMatch = trimmed.match(/^([+-])\s*/);
  let sign: TransactionType = 'expense';
  let rest = trimmed;

  if (signMatch) {
    sign = signMatch[1] === '+' ? 'income' : 'expense';
    rest = trimmed.slice(signMatch[0].length);
  }

  // Ahora buscamos el importe al inicio
  const amountMatch = rest.match(/^(\d+(?:[.,]\d+)?)\s+/);
  if (!amountMatch) return null;

  const amountStr = amountMatch[1].replace(',', '.');
  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) return null;

  const concept = rest.slice(amountMatch[0].length).trim();
  if (!concept) return null;

  return {
    type: sign,
    amount,
    concept,
    raw: trimmed
  };
}

/**
 * Detecta palabras clave para sugerir categoría.
 */
export function suggestCategoryFromConcept(concept: string): string | null {
  const lower = concept.toLowerCase().trim();
  const rules: Record<string, string[]> = {
    '🛒': ['supermercado', 'super', 'mercadona', 'carrefour', 'dia', 'lidl', 'aldi', 'compra', 'comida', 'alimentacion', 'alimentación', 'pan', 'leche', 'fruta', 'verdura', 'carne', 'pescado'],
    '🏠': ['alquiler', 'hipoteca', 'casa', 'vivienda', 'piso', 'renta', 'comunidad', 'iban', 'luz', 'agua', 'gas', 'electricidad', 'internet', 'movil', 'móvil', 'telefono', 'teléfono'],
    '🚗': ['gasolina', 'gasoleo', 'gasóleo', 'diesel', 'transporte', 'metro', 'bus', 'autobus', 'autobús', 'taxi', 'uber', 'cabify', 'tren', 'renfe', 'parking', 'aparcamiento', 'coche'],
    '⚕️': ['farmacia', 'medico', 'médico', 'dentista', 'salud', 'medicina', 'pastilla', 'receta', 'clinica', 'clínica', 'hospital'],
    '🎉': ['cine', 'teatro', 'concierto', 'ocio', 'bar', 'cerveza', 'copa', 'restaurante', 'restaurante', 'cena', 'comida', 'almuerzo', 'menu', 'menú', 'cafe', 'café', 'desayuno', 'fiesta', 'discoteca', 'ocio'],
    '🛍️': ['amazon', 'zara', 'ropa', 'camiseta', 'pantalon', 'pantalón', 'zapatos', 'compras', 'tienda', 'shopping', 'regalo'],
    '📚': ['libro', 'curso', 'academia', 'universidad', 'matricula', 'matrícula', 'clase', 'profesor', 'escuela', 'formacion', 'formación'],
    '💼': ['nomina', 'nómina', 'salario', 'sueldo', 'trabajo', 'freelance', 'factura', 'ingreso', 'pago', 'transferencia'],
    '🐾': ['veterinario', 'mascota', 'perro', 'gato', 'pienso', 'animal'],
    '✈️': ['vuelo', 'avion', 'avión', 'hotel', 'viaje', 'vacaciones', 'airbnb', 'booking', 'tren', 'crucero'],
    '🧾': ['impuesto', 'hacienda', 'iva', 'irpf', 'declaracion', 'declaración', 'multa', 'sancion', 'sanción'],
    '📦': ['otros', 'varios', 'miscelaneo']
  };

  for (const [icon, keywords] of Object.entries(rules)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return icon;
    }
  }
  return null;
}

/**
 * Detecta si un texto podría ser una suscripción.
 */
const SUBSCRIPTION_KEYWORDS = [
  'netflix', 'spotify', 'prime', 'disney', 'hbo', 'apple', 'icloud',
  'google', 'youtube', 'office', 'adobe', 'dropbox', 'notion',
  'gym', 'gimnasio', 'suscripcion', 'suscripción', 'mensual', 'mensualidad'
];

export function looksLikeSubscription(concept: string): boolean {
  const lower = concept.toLowerCase();
  return SUBSCRIPTION_KEYWORDS.some((kw) => lower.includes(kw));
}
