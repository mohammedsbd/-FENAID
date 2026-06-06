'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  ArrowRight,
  Baby,
  Bell,
  CalendarClock,
  CheckCheck,
  CircleDollarSign,
  FileText,
  HeartHandshake,
  Loader2,
  Search,
  ShieldAlert,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';

type Notification = {
  id: string;
  message: string;
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
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    icon: CircleDollarSign,
  },
  Records: {
    className: 'border-sky-200 bg-sky-50 text-sky-700',
    icon: Users,
  },
  'Follow-up': {
    className: 'border-amber-200 bg-amber-50 text-amber-700',
    icon: ShieldAlert,
  },
  Operations: {
    className: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    icon: Wrench,
  },
  Security: {
    className: 'border-rose-200 bg-rose-50 text-rose-700',
    icon: Activity,
  },
};

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GlobalSearchResponse | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);

  // Helper to generate dynamic title from pathname
  const getPageTitle = () => {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length === 0) return 'Dashboard';
    
    const lastPart = parts[parts.length - 1];
    return lastPart.charAt(0).toUpperCase() + lastPart.slice(1).replace(/-/g, ' ');
  };

  const fetchNotifications = async () => {
    try {
      const response = await api.get<Notification[]>('/notifications/mine');
      setNotifications(response.data);
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
    <header className="flex h-16 items-center justify-between gap-4 border-b bg-white px-6">
      <div className="flex min-w-0 shrink-0 flex-col">
        <h2 className="text-lg font-semibold tracking-tight">
          {getPageTitle()}
        </h2>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>Home</span>
          {pathname.split('/').filter(Boolean).map((part, i, arr) => (
            <span key={part} className="flex items-center gap-1">
              <span>/</span>
              <span className={i === arr.length - 1 ? 'font-medium text-foreground' : ''}>
                {part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ')}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="relative hidden w-full max-w-2xl flex-1 md:block" ref={searchRef}>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
          placeholder="Search parents or children by name, ID, phone..."
          className="h-10 pr-10 pl-9"
        />
        {isSearchLoading ? (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : searchQuery ? (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-3 top-1/2 rounded-sm p-0.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Clear search"
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

      <div className="relative flex items-center gap-4" ref={dropdownRef}>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => setIsOpen((value) => !value)}
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          {notifications.length > 0 && (
            <Badge className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 py-0 text-[10px] text-accent-foreground">
              {notifications.length > 9 ? '9+' : notifications.length}
            </Badge>
          )}
        </Button>

        {isOpen && (
          <div className="absolute right-0 top-12 z-50 w-[min(420px,calc(100vw-2rem))] overflow-hidden rounded-md border bg-white shadow-lg">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <p className="text-sm font-semibold">Notifications</p>
                <p className="text-xs text-muted-foreground">
                  {notifications.length} unread
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={markAllAsRead}
                disabled={!notifications.length}
              >
                <CheckCheck className="h-4 w-4" />
                Mark all
              </Button>
            </div>

            <div className="max-h-[520px] overflow-y-auto p-3">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No unread notifications
                </div>
              ) : (
                (Object.keys(groupedNotifications) as NotificationGroup[]).map(
                  (group) =>
                    groupedNotifications[group].length > 0 && (
                      <div key={group} className="mb-3 last:mb-0">
                        <div className="mb-2 px-1 text-xs font-semibold uppercase text-muted-foreground">
                          {group}
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
  const parents = results?.parents ?? [];
  const children = results?.children ?? [];
  const hasResults = parents.length > 0 || children.length > 0;

  return (
    <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-md border bg-white shadow-lg">
      <div className="border-b px-4 py-3">
        <p className="text-sm font-semibold">Global search</p>
        <p className="text-xs text-muted-foreground">
          Parents and children across the system
        </p>
      </div>

      <div className="max-h-[520px] overflow-y-auto p-3">
        {isLoading && !results ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Searching records
          </div>
        ) : !hasResults ? (
          <div className="py-8 text-center">
            <p className="text-sm font-medium">No matching records</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Search by parent name, child name, ID tag, phone, or national ID.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {parents.length > 0 && (
              <SearchGroup title="Parents" count={parents.length}>
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
              <SearchGroup title="Children" count={children.length}>
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
  const Icon = result.type === 'PARENT' ? Users : Baby;

  return (
    <button
      type="button"
      onClick={() => onSelect(result)}
      className="group flex w-full items-center gap-3 rounded-md border bg-white p-3 text-left transition hover:border-primary/40 hover:bg-muted/50"
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
          {result.meta} · Assigned to {result.assignedStaffName}
        </span>
      </span>

      <span className="flex shrink-0 items-center gap-2">
        <Badge variant="secondary" className="h-6 rounded px-2 text-[10px]">
          {formatEnum(result.status)}
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
      className="flex w-full gap-3 rounded-md border-l-4 border-l-accent bg-muted/30 p-3 text-left transition hover:bg-muted"
    >
      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${style.className}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm leading-5 text-foreground">
          {notification.message}
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
  const message = notification.message.toLowerCase();

  if (type.includes('FUND') || type.includes('DONATION')) return 'Finance';
  if (
    entityType === 'Donation' ||
    entityType === 'FundAllocation' ||
    message.includes('donation') ||
    message.includes('fund')
  ) {
    return 'Finance';
  }

  if (type.includes('PARENT') || type.includes('CHILD')) return 'Records';
  if (entityType === 'Parent' || entityType === 'Child') return 'Records';

  if (
    type.includes('OVERDUE') ||
    type.includes('EXPIRY') ||
    type.includes('REMINDER') ||
    message.includes('overdue') ||
    message.includes('expiring') ||
    message.includes('reminder')
  ) {
    return 'Follow-up';
  }

  if (
    type.includes('ACCOUNT') ||
    type.includes('SECURITY') ||
    message.includes('password') ||
    message.includes('welcome')
  ) {
    return 'Security';
  }

  return 'Operations';
}

function getNotificationIcon(notification: Notification, fallback: typeof Bell) {
  const type = notification.type;
  const entityType = notification.entityType ?? '';
  const message = notification.message.toLowerCase();

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
    type.includes('MILESTONE') ||
    message.includes('progress') ||
    message.includes('goal') ||
    message.includes('milestone')
  ) {
    return Activity;
  }
  if (type.includes('SERVICE') || entityType === 'ServiceAssignment') {
    return HeartHandshake;
  }
  return fallback;
}

function getNotificationHref(notification: Notification) {
  if (!notification.entityId) return '/dashboard';

  if (notification.entityType === 'Parent') {
    return `/dashboard/parents/${notification.entityId}`;
  }

  if (notification.entityType === 'Child') {
    return `/dashboard/children/${notification.entityId}`;
  }

  return '/dashboard';
}

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
