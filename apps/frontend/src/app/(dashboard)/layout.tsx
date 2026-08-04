import { cookies } from 'next/headers';
import fs from 'fs';
import path from 'path';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Topbar } from '@/components/dashboard/topbar';
import { CalendarSettingsProvider } from '@/components/providers/calendar-settings-provider';
import { LocaleProvider } from '@/components/providers/locale-provider';
import type { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const cookieStore = cookies();
  const localeCookie = cookieStore.get('locale')?.value;
  const initialLocale = localeCookie || 'en';

  const dictPath = path.join(process.cwd(), 'public', 'locales', `${initialLocale}.json`);
  let initialDictionary: Record<string, string> | undefined;
  try {
    initialDictionary = JSON.parse(fs.readFileSync(dictPath, 'utf-8'));
  } catch {
    // fall back to client-side fetch
  }

  function t(key: string, fallback: string): string {
    return initialDictionary?.[key] ?? fallback;
  }

  return (
    <CalendarSettingsProvider>
      <LocaleProvider initialLocale={initialLocale} initialDictionary={initialDictionary}>
        <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-neutral-900">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Topbar />
            <main className="flex-1 overflow-y-auto p-6">
              {children}
            </main>

            {/* Full-width footer */}
            <footer className="flex-shrink-0 border-t border-gray-200 bg-white px-6 py-3 dark:border-neutral-800 dark:bg-neutral-950">
              <div className="flex items-center justify-end gap-4 text-[11px] text-muted-foreground/60">
                <span>
                  {t('layout.developedBy', 'Developed by')}{' '}
                  <a href="https://www.afrodigital.dev" target="_blank" rel="noopener noreferrer" className="font-medium text-muted-foreground transition-colors hover:text-primary">Afro Digital</a>
                </span>
                <span className="text-muted-foreground/40">Fenaid v0.1.0</span>
              </div>
            </footer>
          </div>
        </div>
      </LocaleProvider>
    </CalendarSettingsProvider>
  );
}
