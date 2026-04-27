/**
 * GBECHE — Système i18n
 * Hook useTranslation() pour accès aux chaînes de langue.
 * Langue persistée via MMKV.
 */

import { createContext, useContext } from 'react';
import { MMKV } from 'react-native-mmkv';
import { fr, type Translations } from './fr';
import { en } from './en';

// ─── Config ───────────────────────────────────────────────
export type Language = 'fr' | 'en';

const storage    = new MMKV({ id: 'gbeche-settings' });
const LANG_KEY   = 'app_language';
const CATALOGS: Record<Language, Translations> = { fr, en };

// ─── Context ──────────────────────────────────────────────
interface I18nContextValue {
  t:           Translations;
  language:    Language;
  setLanguage: (l: Language) => void;
}

export const I18nContext = createContext<I18nContextValue>({
  t:           fr,
  language:    'fr',
  setLanguage: () => {},
});

export const useTranslation = () => useContext(I18nContext);

// ─── Provider helper ──────────────────────────────────────
export function getStoredLanguage(): Language {
  return (storage.getString(LANG_KEY) as Language) ?? 'fr';
}

export function saveLanguage(lang: Language) {
  storage.set(LANG_KEY, lang);
}

export function getCatalog(lang: Language): Translations {
  return CATALOGS[lang] ?? fr;
}

// ─── Re-exports ───────────────────────────────────────────
export { fr, en };
export type { Translations };
