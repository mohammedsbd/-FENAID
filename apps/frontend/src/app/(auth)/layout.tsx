import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { LocaleProvider } from '@/components/providers/locale-provider';

export default function AuthLayout({ children }: { children: ReactNode }) {
  const cookieStore = cookies();
  const localeCookie = cookieStore.get('locale')?.value;
  const initialLocale = localeCookie || 'en';

  return (
    <LocaleProvider initialLocale={initialLocale}>
      {children}
    </LocaleProvider>
  );
}
