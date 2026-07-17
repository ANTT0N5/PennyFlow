// Tipos de idioma separados para evitar imports circulares

export type Language = 'es' | 'en' | 'fr' | 'de' | 'it' | 'pt';

export interface LanguageInfo {
  code: Language;
  name: string;       // Nombre nativo
  englishName: string;
  flag: string;
}
