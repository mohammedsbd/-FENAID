import { cookies } from 'next/headers';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Topbar } from '@/components/dashboard/topbar';
import type { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const cookieStore = cookies();
  const userCookie = cookieStore.get('user')?.value;
  let user = null;

  if (userCookie) {
    try {
      user = JSON.parse(decodeURIComponent(userCookie));
    } catch (e) {
      // Ignore parse errors
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar user={user} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
