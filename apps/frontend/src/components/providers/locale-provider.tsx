'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { t as tFn, loadLocale, setDictionary, subscribe } from '@/lib/i18n';

type LocaleContextType = {
  t: typeof tFn;
  locale: string;
  setLocale: (locale: string) => Promise<void>;
};

const LocaleContext = createContext<LocaleContextType>({
  t: tFn,
  locale: 'en',
  setLocale: async () => {},
});

export function LocaleProvider({ children, initialLocale, initialDictionary }: { children: ReactNode; initialLocale: string; initialDictionary?: Record<string, string> }) {
  const [locale, setLocaleState] = useState(initialLocale);
  const [_, forceRender] = useState(0);

  useEffect(() => {
    if (!initialDictionary) {
      loadLocale(initialLocale);
    }
  }, []);

  useEffect(() => {
    const unsub = subscribe(() => {
      forceRender((n) => n + 1);
    });
    return unsub;
  }, []);

  if (initialDictionary) {
    setDictionary(initialDictionary);
  }

  const setLocale = useCallback(async (newLocale: string) => {
    document.cookie = `locale=${newLocale};path=/;max-age=31536000`;
    setLocaleState(newLocale);
    await loadLocale(newLocale);
  }, []);

  return (
    <LocaleContext.Provider value={{ t: tFn, locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
