/**
 * GBECHE — Système i18n.
 * Langue persistée dans la table settings (cache mémoire synchro chargé au boot).
 */

import { createContext, useContext } from 'react';

import { getSetting, setSetting, SETTING_KEYS } from '../db/settings';
import { en } from './en';
import { fr, type Translations } from './fr';

export type Language = 'fr' | 'en';

const CATALOGS: Record<Language, Translations> = { fr, en };

interface I18nContextValue {
  t: Translations;
  language: Language;
  setLanguage: (l: Language) => void;
}

export const I18nContext = createContext<I18nContextValue>({
  t: fr,
  language: 'fr',
  setLanguage: () => {},
});

export function useTranslation(): I18nContextValue {
  return useContext(I18nContext);
}

export function getStoredLanguage(): Language {
  const value = getSetting(SETTING_KEYS.language);
  return value === 'en' || value === 'fr' ? value : 'fr';
}

export function saveLanguage(lang: Language): void {
  void setSetting(SETTING_KEYS.language, lang);
}

export function getCatalog(lang: Language): Translations {
  return CATALOGS[lang] ?? fr;
}

export { en, fr };
export type { Translations };
