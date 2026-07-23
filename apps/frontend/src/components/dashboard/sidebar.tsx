'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Baby,
  HeartHandshake,
  HandPlatter,
  BadgeDollarSign,
  CalendarDays,
  BarChart3,
  Table2,
  Bell,
  Settings,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect, useState } from 'react';
import { useLocale } from '@/components/providers/locale-provider';
import { fetchSession } from '@/lib/auth';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Users, label: 'Parents', href: '/dashboard/parents' },
  { icon: Baby, label: 'Children', href: '/dashboard/children' },
  { icon: HeartHandshake, label: 'Volunteers', href: '/dashboard/volunteers' },
  { icon: HandPlatter, label: 'Services', href: '/dashboard/services' },
  { icon: BadgeDollarSign, label: 'Fund & Donations', href: '/dashboard/funds' },
  { icon: CalendarDays, label: 'Appointments', href: '/dashboard/appointments' },
  {
    icon: Table2,
    label: 'Data Query',
    href: '/data-query',
    roles: ['SUPER_ADMIN', 'CASE_WORKER'],
  },
  { icon: Bell, label: 'Notifications', href: '/notifications' },
  { icon: ShieldCheck, label: 'Accounts', href: '/accounts', superAdminOnly: true },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [user, setUser] = useState<any>(null);
  const { t } = useLocale();

  useEffect(() => {
    fetchSession().then(setUser);
  }, []);

  return (
    <div
      className={cn(
        'relative flex flex-col border-r border-gray-200 bg-white transition-all duration-300 dark:border-neutral-800 dark:bg-neutral-950',
        isCollapsed ? 'w-[70px]' : 'w-[260px]'
      )}
    >
      <div className="flex flex-col items-center gap-3 px-5 pt-6 pb-5">
        <Link href="/dashboard" className="flex items-center font-bold text-primary">
          <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-primary/10 bg-slate-200 shadow-sm dark:bg-neutral-800">
            <Image
              src="/fikirlogo.jpg"
              alt="Fikir logo"
              fill
              sizes="64px"
              className="object-cover"
            />
          </div>
        </Link>
        {!isCollapsed && (
          <p className="text-center text-[10px] font-semibold leading-snug text-primary">
            {t('sidebar.orgName', 'Ethiopia National Association on Intellectual Disability')}
          </p>
        )}
      </div>

      <div className="mx-4 border-t border-gray-100 dark:border-neutral-800" />

      <ScrollArea className="flex-1 px-3">
        <nav className="flex flex-col gap-2 py-6 min-h-full justify-center">
          {navItems.map((item) => {
            if (item.superAdminOnly && user?.role !== 'SUPER_ADMIN') return null;
            if (item.roles && !item.roles.includes(user?.role)) return null;
            const isActive = item.href === '/dashboard' 
              ? pathname === '/dashboard' 
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-4 rounded-xl px-5 py-3 text-base font-medium transition-all duration-150',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-slate-100 hover:text-foreground dark:hover:bg-neutral-800 dark:hover:text-neutral-100',
                  isCollapsed && 'justify-center px-2'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!isCollapsed && <span>{t(item.label, item.label)}</span>}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-24 h-6 w-6 rounded-full border bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-950"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </Button>
    </div>
  );
}
