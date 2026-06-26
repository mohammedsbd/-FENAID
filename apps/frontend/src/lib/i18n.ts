type TranslationArgs = Record<string, string | number>;

let dictionary: Record<string, string> = {};
let currentLocale = 'en';

const listeners = new Set<() => void>();

export function t(key: string, fallback?: string, params?: TranslationArgs) {
  const template = dictionary[key] || fallback || key;
  if (!params) return template;

  return Object.entries(params).reduce(
    (result, [paramKey, value]) => result.replaceAll(`{${paramKey}}`, String(value)),
    template,
  );
}

export async function loadLocale(locale: string): Promise<void> {
  try {
    const response = await fetch(`/locales/${locale}.json`);
    dictionary = await response.json();
    currentLocale = locale;
  } catch {
    dictionary = {};
  }
  listeners.forEach((fn) => fn());
}

export function getLocale(): string {
  return currentLocale;
}

export function setDictionary(dict: Record<string, string>) {
  dictionary = dict;
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
