'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { setDictionary } from '@/lib/i18n';

type LocaleContextType = {
  t: (key: string, fallback?: string, params?: Record<string, string | number>) => string;
  locale: string;
  setLocale: (locale: string) => Promise<void>;
};

const LocaleContext = createContext<LocaleContextType>({
  t: (key: string, fallback?: string) => fallback || key,
  locale: 'en',
  setLocale: async () => {},
});

export function LocaleProvider({ children, initialLocale, initialDictionary }: { children: ReactNode; initialLocale: string; initialDictionary?: Record<string, string> }) {
  const [locale, setLocaleState] = useState(initialLocale);
  const [dict, setDictState] = useState<Record<string, string>>(initialDictionary ?? {});

  useEffect(() => {
    if (!initialDictionary) {
      loadAndSetDict(initialLocale, setDictState);
    } else {
      setDictionary(initialDictionary);
    }
  }, []);

  const t = useCallback((key: string, fallback?: string, params?: Record<string, string | number>) => {
    const template = dict[key] || fallback || key;
    if (!params) return template;
    return Object.entries(params).reduce(
      (result, [paramKey, value]) => result.replaceAll(`{${paramKey}}`, String(value)),
      template,
    );
  }, [dict]);

  const setLocale = useCallback(async (newLocale: string) => {
    document.cookie = `locale=${newLocale};path=/;max-age=31536000`;
    await loadAndSetDict(newLocale, setDictState);
    setLocaleState(newLocale);
  }, []);

  return (
    <LocaleContext.Provider value={{ t, locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

async function loadAndSetDict(
  locale: string,
  setDictState: (dict: Record<string, string>) => void,
) {
  try {
    const response = await fetch(`/locales/${locale}.json?t=${Date.now()}`, { cache: 'no-store' });
    const data: Record<string, string> = await response.json();
    setDictionary(data);
    setDictState(data);
  } catch (e) {
    console.error('Failed to load locale', locale, e);
    setDictionary({});
    setDictState({});
  }
}

export function useLocale() {
  return useContext(LocaleContext);
}
