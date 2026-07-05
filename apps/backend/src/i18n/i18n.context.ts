import { AsyncLocalStorage } from 'async_hooks';

export const localeStorage = new AsyncLocalStorage<string>();

export function getLocale(): string {
  return localeStorage.getStore() || 'en';
}
