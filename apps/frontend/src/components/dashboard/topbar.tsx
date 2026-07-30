'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/components/providers/locale-provider';
import { t as tI18n } from '@/lib/i18n';
import { useCalendarSettings } from '@/components/providers/calendar-settings-provider';
import { fetchSession } from '@/lib/auth';
import {
  gregorianToEthiopian,
  ethiopianMonths,
  ethiopianToGregorian,
  toIsoDateInputValue,
  daysInGregorianMonth,
  daysInEthiopianMonth,
} from '@/lib/calendar';
import {
  Activity,
  ArrowRight,
  Baby,
  Bell,
  CalendarClock,
  CalendarDays,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock,
  FileText,
  HeartHandshake,
  Loader2,
  LogOut,
  Search,
  ShieldAlert,
  UserRound,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { logout } from '@/lib/auth';
import Link from 'next/link';

type Notification = {
  id: string;
  message: string;
  notificationKey?: string | null;
  params?: Record<string, string | number> | null;
  type: string;
  entityType?: string | null;
  entityId?: string | null;
  createdAt: string;
};

type NotificationGroup = 'Finance' | 'Records' | 'Follow-up' | 'Operations' | 'Security';

type GlobalSearchItem = {
  type: 'PARENT' | 'CHILD';
  id: string;
  idTag: string | null;
  title: string;
  subtitle: string;
  status: string;
  meta: string;
  assignedStaffName: string;
  href: string;
  parent?: {
    id: string;
    fullName: string;
    phone: string;
  };
};

type GlobalSearchResponse = {
  query: string;
  parents: GlobalSearchItem[];
  children: GlobalSearchItem[];
  total: number;
};

const notificationStyles: Record<
  NotificationGroup,
  { className: string; icon: typeof Bell }
> = {
  Finance: {
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    icon: CircleDollarSign,
  },
  Records: {
    className: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300',
    icon: Users,
  },
  'Follow-up': {
    className: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300',
    icon: ShieldAlert,
  },
  Operations: {
    className: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300',
    icon: Wrench,
  },
  Security: {
    className: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300',
    icon: Activity,
  },
};

const notificationGroupLabels: Record<NotificationGroup, string> = {
  Finance: 'topbar.notifFinance',
  Records: 'topbar.notifRecords',
  'Follow-up': 'topbar.notifFollowUp',
  Operations: 'topbar.notifOperations',
  Security: 'topbar.notifSecurity',
};

const knownPages = ['dashboard', 'children', 'parents', 'volunteers', 'services', 'funds', 'appointments', 'data-query', 'accounts', 'settings', 'notifications'];

function formatPageName(segment: string) {
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function Topbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetchSession().then(setUser);
  }, []);
  const router = useRouter();
  const { t } = useLocale();
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GlobalSearchResponse | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);

  // Helper to get the current page name from pathname, ignoring dynamic ID segments
  const getPageTitle = () => {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length === 0) return t('topbar.dashboard', 'Dashboard');

    for (let i = parts.length - 1; i >= 0; i--) {
      if (knownPages.includes(parts[i])) {
        return formatPageName(parts[i]);
      }
    }

    // Fallback: use last known segment
    return formatPageName(parts[parts.length - 1]);
  };

  const fetchNotifications = async () => {
    try {
      const response = await api.get<Notification[]>('/notifications/mine');
      setNotifications(response.data.slice(0, 10));
    } catch {
      setNotifications([]);
    }
  };

  useEffect(() => {
    void fetchNotifications();
    const interval = window.setInterval(fetchNotifications, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (
        dropdownRef.current &&
        event.target instanceof Node &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }

      if (
        searchRef.current &&
        event.target instanceof Node &&
        !searchRef.current.contains(event.target)
      ) {
        setIsSearchOpen(false);
      }

      if (
        profileRef.current &&
        event.target instanceof Node &&
        !profileRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  useEffect(() => {
    if (debouncedSearchQuery.length < 2) {
      setSearchResults(null);
      setIsSearchLoading(false);
      return;
    }

    let ignore = false;

    async function runSearch() {
      setIsSearchLoading(true);
      try {
        const response = await api.get<GlobalSearchResponse>('/search/global', {
          params: { q: debouncedSearchQuery, limit: 8 },
        });

        if (!ignore) {
          setSearchResults(response.data);
          setIsSearchOpen(true);
        }
      } catch {
        if (!ignore) {
          setSearchResults({
            query: debouncedSearchQuery,
            parents: [],
            children: [],
            total: 0,
          });
          setIsSearchOpen(true);
        }
      } finally {
        if (!ignore) {
          setIsSearchLoading(false);
        }
      }
    }

    void runSearch();

    return () => {
      ignore = true;
    };
  }, [debouncedSearchQuery]);

  const groupedNotifications = useMemo(() => {
    return notifications.reduce<Record<NotificationGroup, Notification[]>>(
      (groups, notification) => {
        const group = getNotificationGroup(notification);
        groups[group].push(notification);
        return groups;
      },
      {
        Finance: [],
        Records: [],
        'Follow-up': [],
        Operations: [],
        Security: [],
      },
    );
  }, [notifications]);

  const markAllAsRead = async () => {
    await api.patch('/notifications/read-all');
    setNotifications([]);
    setIsOpen(false);
  };

  const openNotification = async (notification: Notification) => {
    await api.patch(`/notifications/${notification.id}/read`);
    setNotifications((current) =>
      current.filter((item) => item.id !== notification.id),
    );
    setIsOpen(false);

    const href = getNotificationHref(notification);
    if (href) {
      router.push(href);
    }
  };

  const openSearchResult = (result: GlobalSearchItem) => {
    setSearchQuery('');
    setSearchResults(null);
    setIsSearchOpen(false);
    router.push(result.href);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
    setIsSearchOpen(false);
  };

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-gray-200 bg-white px-6 dark:border-neutral-800 dark:bg-neutral-950">        <div className="flex min-w-0 shrink-0 flex-col">
        <h2 className="text-lg font-semibold tracking-tight">
          {getPageTitle()}
        </h2>
      </div>

      <div className="relative hidden w-full flex-1 md:block" ref={searchRef}>
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(event) => {
            setSearchQuery(event.target.value);
            if (event.target.value.trim().length >= 2) {
              setIsSearchOpen(true);
            }
          }}
          onFocus={() => {
            if (searchQuery.trim().length >= 2) {
              setIsSearchOpen(true);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setIsSearchOpen(false);
            }

            if (event.key === 'Enter') {
              const firstResult =
                searchResults?.parents[0] ?? searchResults?.children[0];
              if (firstResult) {
                openSearchResult(firstResult);
              }
            }
          }}
          placeholder={t('topbar.searchPlaceholder', 'Search parents or children by name, ID, phone...')}
          className="h-10 rounded-full pr-10 pl-10"
        />
        {isSearchLoading ? (
          <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : searchQuery ? (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-4 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label={t('topbar.clearSearch', 'Clear search')}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}

        {isSearchOpen && searchQuery.trim().length >= 2 && (
          <GlobalSearchPanel
            results={searchResults}
            isLoading={isSearchLoading}
            onSelect={openSearchResult}
          />
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <LiveClock />
        <CalendarButton />
        <div className="relative" ref={dropdownRef}>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => {
              setIsOpen((value) => !value);
              void fetchNotifications();
            }}
            aria-label={t('topbar.notifications', 'Notifications')}
          >
            <Bell className="h-5 w-5 text-muted-foreground" />
            {notifications.length > 0 && (
              <Badge className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 py-0 text-[10px] text-accent-foreground">
                {notifications.length > 9 ? '9+' : notifications.length}
              </Badge>
            )}
          </Button>

          {isOpen && (
            <div className="absolute right-0 top-12 z-50 w-[min(420px,calc(100vw-2rem))] overflow-hidden rounded-md border bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">{t('topbar.notificationsTitle', 'Notifications')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('topbar.unread', '{count} unread', { count: notifications.length })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href="/notifications"
                    className="text-xs font-medium text-primary hover:underline"
                    onClick={() => setIsOpen(false)}
                  >
                    {t('topbar.viewAll', 'View All')}
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={markAllAsRead}
                    disabled={!notifications.length}
                  >
                    <CheckCheck className="h-4 w-4" />
                    {t('topbar.markAll', 'Mark all')}
                  </Button>
                </div>
              </div>

              <div className="max-h-[520px] overflow-y-auto p-3">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    {t('topbar.noUnread', 'No unread notifications')}
                  </div>
                ) : (
                  (Object.keys(groupedNotifications) as NotificationGroup[]).map(
                    (group) =>
                      groupedNotifications[group].length > 0 && (
                        <div key={group} className="mb-3 last:mb-0">
                          <div className="mb-2 px-1 text-xs font-semibold uppercase text-muted-foreground">
                            {t(notificationGroupLabels[group], group)}
                          </div>
                          <div className="space-y-2">
                            {groupedNotifications[group].map((notification) => (
                              <NotificationRow
                                key={notification.id}
                                notification={notification}
                                onClick={() => void openNotification(notification)}
                              />
                            ))}
                          </div>
                        </div>
                      ),
                  )
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            className="flex items-center gap-2 rounded-md p-1.5 transition hover:bg-muted"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {user?.fullName?.[0] || '?'}
            </div>
            <div className="hidden text-left md:block">
              <p className="text-sm font-medium leading-tight">{user?.fullName || t('topbar.user', 'User')}</p>
              <p className="text-[10px] uppercase leading-tight text-muted-foreground">
                {t(`enum.role.${user?.role?.toLowerCase()}`, user?.role?.replace('_', ' ') || '')}
              </p>
            </div>
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-md border bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
              <div className="border-b px-4 py-3">
                <p className="text-sm font-semibold">{user?.fullName || t('topbar.user', 'User')}</p>
                <p className="text-xs text-muted-foreground">{user?.email || ''}</p>
              </div>
              <div className="p-2">
                <Link
                  href="/settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <UserRound className="h-4 w-4" />
                  {t('topbar.myAccount', 'My Account')}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  {t('sidebar.logout', 'Logout')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function GlobalSearchPanel({
  results,
  isLoading,
  onSelect,
}: {
  results: GlobalSearchResponse | null;
  isLoading: boolean;
  onSelect: (result: GlobalSearchItem) => void;
}) {
  const { t } = useLocale();
  const parents = results?.parents ?? [];
  const children = results?.children ?? [];
  const hasResults = parents.length > 0 || children.length > 0;

  return (
    <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-md border bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
      <div className="border-b px-4 py-3">
        <p className="text-sm font-semibold">{t('topbar.globalSearch', 'Global search')}</p>
        <p className="text-xs text-muted-foreground">
          {t('topbar.globalSearchDesc', 'Parents and children across the system')}
        </p>
      </div>

      <div className="max-h-[520px] overflow-y-auto p-3">
        {isLoading && !results ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('topbar.searching', 'Searching records')}
          </div>
        ) : !hasResults ? (
          <div className="py-8 text-center">
            <p className="text-sm font-medium">{t('topbar.noResults', 'No matching records')}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('topbar.searchHint', 'Search by parent name, child name, ID tag, phone, or national ID.')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {parents.length > 0 && (
              <SearchGroup title={t('topbar.parents', 'Parents')} count={parents.length}>
                {parents.map((parent) => (
                  <SearchResultRow
                    key={`parent-${parent.id}`}
                    result={parent}
                    onSelect={onSelect}
                  />
                ))}
              </SearchGroup>
            )}

            {children.length > 0 && (
              <SearchGroup title={t('topbar.children', 'Children')} count={children.length}>
                {children.map((child) => (
                  <SearchResultRow
                    key={`child-${child.id}`}
                    result={child}
                    onSelect={onSelect}
                  />
                ))}
              </SearchGroup>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SearchGroup({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-xs font-semibold uppercase text-muted-foreground">
          {title}
        </span>
        <Badge variant="secondary" className="h-5 rounded px-1.5 text-[10px]">
          {count}
        </Badge>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function SearchResultRow({
  result,
  onSelect,
}: {
  result: GlobalSearchItem;
  onSelect: (result: GlobalSearchItem) => void;
}) {
  const { t } = useLocale();
  const Icon = result.type === 'PARENT' ? Users : Baby;

  return (
    <button
      type="button"
      onClick={() => onSelect(result)}
      className="group flex w-full items-center gap-3 rounded-md border bg-white p-3 text-left transition hover:border-primary/40 hover:bg-muted/50 dark:border-neutral-700 dark:bg-neutral-800/50"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold text-foreground">
            {result.title}
          </span>
          {result.idTag && (
            <Badge variant="outline" className="h-5 shrink-0 rounded px-1.5 text-[10px]">
              {result.idTag}
            </Badge>
          )}
        </span>
        <span className="mt-1 block truncate text-xs text-muted-foreground">
          {result.subtitle}
        </span>
        <span className="mt-1 block truncate text-xs text-muted-foreground">
          {result.meta} · {t('topbar.assignedTo', 'Assigned to')} {result.assignedStaffName}
        </span>
      </span>

      <span className="flex shrink-0 items-center gap-2">
        <Badge variant="secondary" className="h-6 rounded px-2 text-[10px]">
          {result.type === 'PARENT'
            ? t('enum.parentStatus.' + result.status.toLowerCase(), formatEnum(result.status))
            : t('enum.childStatus.' + result.status.toLowerCase(), formatEnum(result.status))}
        </Badge>
        <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
      </span>
    </button>
  );
}

function NotificationRow({
  notification,
  onClick,
}: {
  notification: Notification;
  onClick: () => void;
}) {
  const group = getNotificationGroup(notification);
  const style = notificationStyles[group];
  const Icon = getNotificationIcon(notification, style.icon);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full gap-3 rounded-md bg-muted/30 p-3 text-left transition hover:bg-muted"
    >
      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${style.className}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm leading-5 text-foreground">
          {notification.notificationKey
            ? tI18n(notification.notificationKey, notification.message, notification.params ?? undefined)
            : notification.message}
        </span>
        <span className="mt-1 block text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(notification.createdAt), {
            addSuffix: true,
          })}
        </span>
      </span>
    </button>
  );
}

function getNotificationGroup(notification: Notification): NotificationGroup {
  const type = notification.type;
  const entityType = notification.entityType ?? '';

  if (type.includes('FUND') || type.includes('DONATION')) return 'Finance';
  if (entityType === 'Donation' || entityType === 'FundAllocation') {
    return 'Finance';
  }

  if (type.includes('PARENT') || type.includes('CHILD')) return 'Records';
  if (entityType === 'Parent' || entityType === 'Child') return 'Records';

  if (
    type.includes('OVERDUE') ||
    type.includes('EXPIRY') ||
    type.includes('REMINDER')
  ) {
    return 'Follow-up';
  }

  if (
    type.includes('ACCOUNT') ||
    type.includes('SECURITY')
  ) {
    return 'Security';
  }

  return 'Operations';
}

function getNotificationIcon(notification: Notification, fallback: typeof Bell) {
  const type = notification.type;
  const entityType = notification.entityType ?? '';

  if (type.includes('FUND') || type.includes('DONATION')) return CircleDollarSign;
  if (entityType === 'Donation' || entityType === 'FundAllocation') {
    return CircleDollarSign;
  }
  if (type.includes('PARENT') || entityType === 'Parent') return Users;
  if (type.includes('CHILD') || entityType === 'Child') return Baby;
  if (
    type.includes('APPOINTMENT') ||
    type.includes('ATTENDANCE') ||
    entityType === 'Appointment'
  ) {
    return CalendarClock;
  }
  if (type.includes('DOCUMENT') || entityType === 'Document') return FileText;
  if (
    type.includes('PROGRESS') ||
    type.includes('GOAL') ||
    type.includes('MILESTONE')
  ) {
    return Activity;
  }
  if (type.includes('SERVICE') || entityType === 'ServiceAssignment') {
    return HeartHandshake;
  }
  return fallback;
}

function getNotificationHref(notification: Notification) {
  if (!notification.entityId && notification.entityType !== 'DonationSummary') return '/dashboard';

  switch (notification.entityType) {
    case 'Parent':
      return `/dashboard/parents/${notification.entityId}`;
    case 'Child':
      return `/dashboard/children/${notification.entityId}`;
    case 'FundAllocation':
    case 'Donation':
    case 'DonationSummary':
      return '/dashboard/funds';
    case 'ServiceAssignment':
      return '/dashboard/services';
    case 'Appointment':
    case 'AppointmentReminder':
      return '/dashboard/calendar';
    case 'Document':
    case 'DocumentExpiry':
      return '/dashboard/documents';
    case 'Referral':
      return '/dashboard/referrals';
    default:
      return '/dashboard';
  }
}

function LiveClock() {
  const { calendarSystem } = useCalendarSettings();
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const interval = window.setInterval(() => setTime(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  if (!time) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="font-mono text-sm font-semibold tabular-nums tracking-wider text-foreground">
          --:--:--
        </span>
      </div>
    );
  }

  const westernHours = time.getHours();
  const ethiopianHours = ((westernHours + 6) % 12 || 12).toString().padStart(2, '0');
  const displayHours = calendarSystem === 'ETHIOPIAN'
    ? ethiopianHours
    : westernHours.toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');

  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5">
      <Clock className="h-4 w-4 text-muted-foreground" />
      <span className="font-mono text-sm font-semibold tabular-nums tracking-wider text-foreground">
        {displayHours}:{minutes}
      </span>
    </div>
  );
}

function CalendarButton() {
  const { t } = useLocale();
  const { calendarSystem } = useCalendarSettings();
  const [isCalendarOpen, setCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isCalendarOpen) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        setCalendarOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setCalendarOpen(false);
    }

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isCalendarOpen]);

  return (
    <div className="relative" ref={calendarRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative h-10 w-10"
        onClick={() => setCalendarOpen((v) => !v)}
        aria-label={t('topbar.calendar', 'Calendar')}
      >
        <CalendarDays className="h-5 w-5 text-muted-foreground" />
      </Button>

      {isCalendarOpen && (
        <WeeklyCalendarPopup now={now} calendarSystem={calendarSystem} onClose={() => setCalendarOpen(false)} />
      )}
    </div>
  );
}

function WeeklyCalendarPopup({ now, calendarSystem, onClose }: { now: Date; calendarSystem: string; onClose: () => void }) {
  const { t } = useLocale();
  const [monthOffset, setMonthOffset] = useState(0);

  const dayLabels = useMemo(() => [
    t('appointments.calendar.sun', 'Sun'),
    t('appointments.calendar.mon', 'Mon'),
    t('appointments.calendar.tue', 'Tue'),
    t('appointments.calendar.wed', 'Wed'),
    t('appointments.calendar.thu', 'Thu'),
    t('appointments.calendar.fri', 'Fri'),
    t('appointments.calendar.sat', 'Sat'),
  ], [t]);

  const ethMonthLabels = useMemo(() => {
    return Array.from({ length: 13 }, (_, i) =>
      t(`calendar.ethiopianMonth.${i + 1}`, ethiopianMonths[i]),
    );
  }, [t]);

  const calendarGrid = useMemo(() => {
    const localNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const utcNow = new Date(Date.UTC(localNow.getFullYear(), localNow.getMonth(), localNow.getDate()));

    let viewYear: number;
    let viewMonth: number; // 1-indexed
    let daysInMonth: number;
    let startDayOfWeek: number; // 0=Sun

    if (calendarSystem === 'ETHIOPIAN') {
      const eth = gregorianToEthiopian(utcNow);
      const absoluteMonth = eth.year * 13 + (eth.month - 1) + monthOffset;
      viewYear = Math.floor(absoluteMonth / 13);
      viewMonth = (absoluteMonth % 13) + 1;
      daysInMonth = daysInEthiopianMonth(viewYear, viewMonth);
      const firstDayGreg = ethiopianToGregorian({ year: viewYear, month: viewMonth, day: 1 });
      startDayOfWeek = firstDayGreg.getUTCDay();
    } else {
      const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
      viewYear = d.getFullYear();
      viewMonth = d.getMonth() + 1;
      daysInMonth = daysInGregorianMonth(viewYear, viewMonth);
      startDayOfWeek = d.getDay();
    }

    const totalCells = Math.ceil((startDayOfWeek + daysInMonth) / 7) * 7;

    const todayEth = calendarSystem === 'ETHIOPIAN'
      ? gregorianToEthiopian(utcNow)
      : null;

    interface MonthCell {
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      monthLabel: string | null;
      iso: string;
    }

    const cells: MonthCell[] = [];

    if (calendarSystem === 'ETHIOPIAN') {
      const firstDayGreg = ethiopianToGregorian({ year: viewYear, month: viewMonth, day: 1 });
      for (let i = 0; i < totalCells; i++) {
        const cellDate = new Date(firstDayGreg);
        cellDate.setUTCDate(cellDate.getUTCDate() + (i - startDayOfWeek));
        const cellEth = gregorianToEthiopian(cellDate);
        const isCurrentMonth = cellEth.year === viewYear && cellEth.month === viewMonth;
        const isToday = todayEth !== null &&
          cellEth.year === todayEth.year &&
          cellEth.month === todayEth.month &&
          cellEth.day === todayEth.day;

        cells.push({
          dayNumber: cellEth.day,
          isCurrentMonth,
          isToday,
          monthLabel: isCurrentMonth && cellEth.day === 1 ? ethMonthLabels[cellEth.month - 1] : null,
          iso: toIsoDateInputValue(cellDate),
        });
      }
    } else {
      const today = new Date();
      for (let i = 0; i < totalCells; i++) {
        const cellDay = i - startDayOfWeek + 1;
        const cellDate = new Date(viewYear, viewMonth - 1, cellDay);
        const isCurrentMonth = cellDate.getMonth() + 1 === viewMonth;
        const isToday = monthOffset === 0 &&
          cellDate.getFullYear() === today.getFullYear() &&
          cellDate.getMonth() === today.getMonth() &&
          cellDate.getDate() === today.getDate();

        cells.push({
          dayNumber: cellDate.getDate(),
          isCurrentMonth,
          isToday,
          monthLabel: isCurrentMonth && cellDay === 1
            ? cellDate.toLocaleDateString(undefined, { month: 'short' })
            : null,
          iso: toIsoDateInputValue(cellDate),
        });
      }
    }

    return { cells, viewYear, viewMonth, daysInMonth, startDayOfWeek };
  }, [now, monthOffset, calendarSystem, ethMonthLabels]);

  const headerLabel = (() => {
    if (calendarSystem === 'ETHIOPIAN') {
      const ec = t('calendar.ec', 'E.C.');
      return `${ethMonthLabels[calendarGrid.viewMonth - 1]} ${calendarGrid.viewYear} ${ec}`;
    }
    const d = new Date(calendarGrid.viewYear, calendarGrid.viewMonth - 1, 1);
    return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  })();

  return (
    <div className="absolute right-0 top-12 z-50 w-[320px] overflow-hidden rounded-md border bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonthOffset((v) => v - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <p className="text-sm font-semibold">{headerLabel}</p>
            {calendarSystem === 'ETHIOPIAN' && (
              <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
                {t('calendar.ethiopian', 'Ethiopian Calendar')}
              </span>
            )}
          </div>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonthOffset((v) => v + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-2 grid grid-cols-7 gap-0 text-center text-[11px] font-semibold text-muted-foreground">
          {dayLabels.map((day, i) => (
            <div key={`h-${i}`} className="truncate text-[10px] leading-7">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0">
          {calendarGrid.cells.map((cell) => (
              <div
                key={cell.iso}
                className={`relative flex flex-col items-center rounded-md py-1 text-sm transition ${
                  cell.isToday
                    ? 'z-10 bg-primary font-bold text-primary-foreground shadow-sm'
                    : cell.isCurrentMonth
                      ? 'font-medium text-foreground hover:bg-muted'
                      : 'text-muted-foreground/40'
                }`}
              >
                <span className="flex h-7 w-7 items-center justify-center">
                  {cell.dayNumber}
                </span>
                {cell.monthLabel && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[7px] font-semibold uppercase leading-none opacity-40">
                    {cell.monthLabel}
                  </span>
                )}
              </div>
            ))}
        </div>
      </div>

      <div className="border-t px-4 py-2">
        <button
          type="button"
          onClick={() => {
            setMonthOffset(0);
          }}
          className="w-full rounded-md px-3 py-1.5 text-center text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          {t('calendar.jumpToToday', 'Jump to today')}
        </button>
      </div>
    </div>
  );
}

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
