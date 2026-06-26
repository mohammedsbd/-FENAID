'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Baby,
  HandPlatter,
  BadgeDollarSign,
  CalendarDays,
  BarChart3,
  Table2,
  Settings,
  ShieldCheck,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';
import { logout } from '@/lib/auth';
import { useLocale } from '@/components/providers/locale-provider';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Users, label: 'Parents', href: '/dashboard/parents' },
  { icon: Baby, label: 'Children', href: '/dashboard/children' },
  { icon: HandPlatter, label: 'Services', href: '/dashboard/services' },
  { icon: BadgeDollarSign, label: 'Fund & Donations', href: '/dashboard/funds' },
  { icon: CalendarDays, label: 'Appointments', href: '/dashboard/appointments' },
  { icon: BarChart3, label: 'Reports', href: '/dashboard/reports' },
  {
    icon: Table2,
    label: 'Data Query',
    href: '/data-query',
    roles: ['SUPER_ADMIN', 'VIEWER'],
  },
  { icon: ShieldCheck, label: 'Accounts', href: '/accounts', superAdminOnly: true },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

export function Sidebar({ user }: { user: any }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { t } = useLocale();

  return (
    <div
      className={cn(
        'relative flex flex-col border-r bg-white transition-all duration-300',
        isCollapsed ? 'w-[70px]' : 'w-[240px]'
      )}
    >
      <div className="flex flex-col items-center justify-center gap-2 px-4 py-4">
        <Link href="/dashboard" className="flex items-center font-bold text-primary">
          <div className="relative h-14 w-14 overflow-hidden rounded-full border bg-slate-200">
            <Image
              src="/fikirlogo.jpg"
              alt="Fikir logo"
              fill
              sizes="56px"
              className="object-cover"
            />
          </div>
        </Link>
        <p className="text-center text-[10px] font-semibold leading-tight text-primary">
          {t('sidebar.orgName', 'Ethiopia National Association on Intellectual Disability')}
        </p>
      </div>

      <ScrollArea className="flex-1 px-3">
        <nav className="flex flex-col gap-1 py-4">
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
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-slate-100 hover:text-foreground',
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

      <div className="p-3">
        <Separator className="mb-4" />
        <div className={cn('flex flex-col gap-4', isCollapsed && 'items-center')}>
          <div className={cn('flex items-center gap-3', isCollapsed && 'flex-col')}>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 font-bold text-slate-600">
              {user?.fullName?.[0]}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden text-sm">
                <span className="truncate font-medium">{user?.fullName}</span>
                <Badge variant="secondary" className="w-fit text-[10px] uppercase">
                  {user?.role?.replace('_', ' ')}
                </Badge>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={cn('w-full justify-start gap-3 text-muted-foreground hover:text-destructive', isCollapsed && 'justify-center')}
            onClick={() => logout()}
          >
            <LogOut className="h-5 w-5" />
            {!isCollapsed && <span>{t('sidebar.logout', 'Logout')}</span>}
          </Button>
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-24 h-6 w-6 rounded-full border bg-white shadow-sm"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </Button>
    </div>
  );
}
