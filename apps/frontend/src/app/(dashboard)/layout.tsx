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
  const userCookie = cookieStore.get('user')?.value;
  const localeCookie = cookieStore.get('locale')?.value;
  const initialLocale = localeCookie || 'en';
  let user = null;

  const dictPath = path.join(process.cwd(), 'public', 'locales', `${initialLocale}.json`);
  let initialDictionary: Record<string, string> | undefined;
  try {
    initialDictionary = JSON.parse(fs.readFileSync(dictPath, 'utf-8'));
  } catch {
    // fall back to client-side fetch
  }

  if (userCookie) {
    try {
      user = JSON.parse(decodeURIComponent(userCookie));
    } catch (e) {
      // Ignore parse errors
    }
  }

  return (
    <CalendarSettingsProvider>
      <LocaleProvider initialLocale={initialLocale} initialDictionary={initialDictionary}>
        <div className="flex h-screen overflow-hidden bg-slate-50">
          <Sidebar user={user} />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Topbar />
            <main className="flex-1 overflow-y-auto p-6">
              {children}
            </main>
          </div>
        </div>
      </LocaleProvider>
    </CalendarSettingsProvider>
  );
}
