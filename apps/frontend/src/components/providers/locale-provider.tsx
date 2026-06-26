'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { t as tFn, loadLocale, getLocale, subscribe } from '@/lib/i18n';

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

export function LocaleProvider({ children, initialLocale }: { children: ReactNode; initialLocale: string }) {
  const [locale, setLocaleState] = useState(initialLocale);

  useEffect(() => {
    loadLocale(initialLocale);
  }, []);

  useEffect(() => {
    const unsub = subscribe(() => {
      setLocaleState(getLocale());
    });
    return unsub;
  }, []);

  const setLocale = useCallback(async (newLocale: string) => {
    document.cookie = `locale=${newLocale};path=/;max-age=31536000`;
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
