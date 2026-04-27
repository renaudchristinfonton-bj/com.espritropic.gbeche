/**
 * GBECHE — I18nProvider
 * Fournit le contexte de traduction à toute l'application.
 */

import React, { useState } from 'react';
import { I18nContext, getCatalog, getStoredLanguage, saveLanguage, type Language, useTranslation } from './index';

// Re-export so screens can import useTranslation from this file
export { useTranslation };

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getStoredLanguage);

  const setLanguage = (lang: Language) => {
    saveLanguage(lang);
    setLanguageState(lang);
  };

  const t = getCatalog(language);

  return (
    <I18nContext.Provider value={{ t, language, setLanguage }}>
      {children}
    </I18nContext.Provider>
  );
}
