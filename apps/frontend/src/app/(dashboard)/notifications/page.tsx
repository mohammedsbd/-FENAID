'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  Baby,
  Bell,
  CalendarClock,
  CheckCheck,
  CircleDollarSign,
  FileText,
  HeartHandshake,
  Loader2,
  ShieldAlert,
  Users,
  Wrench,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocale } from '@/components/providers/locale-provider';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

type Notification = {
  id: string;
  message: string;
  notificationKey?: string | null;
  params?: Record<string, string | number> | null;
  type: string;
  entityType?: string | null;
  entityId?: string | null;
  isRead: boolean;
  createdAt: string;
};

type NotificationGroup = 'Finance' | 'Records' | 'Follow-up' | 'Operations' | 'Security';

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

export default function NotificationsPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<Notification[]>('/notifications');
      setNotifications(response.data);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter((n) => !n.isRead);
    }
    return notifications;
  }, [notifications, filter]);

  const groupedNotifications = useMemo(() => {
    return filteredNotifications.reduce<Record<NotificationGroup, Notification[]>>(
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
  }, [filteredNotifications]);

  const openNotification = async (notification: Notification) => {
    if (!notification.isRead) {
      await api.patch(`/notifications/${notification.id}/read`);
      setNotifications((current) =>
        current.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)),
      );
    }

    const href = getNotificationHref(notification);
    if (href) {
      router.push(href);
    }
  };

  const markAllAsRead = async () => {
    await api.patch('/notifications/read-all');
    setNotifications((current) =>
      current.map((n) => ({ ...n, isRead: true })),
    );
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t('notifications.title', 'Notifications')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0
              ? t('notifications.unreadCount', '{count} unread', { count: unreadCount })
              : t('notifications.allRead', 'All caught up!')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-md border border-input overflow-hidden">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors',
                filter === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted',
              )}
            >
              {t('notifications.all', 'All')}
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors',
                filter === 'unread'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted',
              )}
            >
              {t('notifications.unread', 'Unread')}
              {unreadCount > 0 && (
                <span className="ml-1.5 rounded-full bg-primary-foreground/20 px-1.5 py-0.5 text-[10px]">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
          >
            <CheckCheck className="mr-1.5 h-4 w-4" />
            {t('notifications.markAllRead', 'Mark all as read')}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredNotifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Bell className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">
              {filter === 'unread'
                ? t('notifications.noUnread', 'No unread notifications')
                : t('notifications.none', 'No notifications')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {(Object.keys(groupedNotifications) as NotificationGroup[]).map(
            (group) =>
              groupedNotifications[group].length > 0 && (
                <Card key={group}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold uppercase text-muted-foreground">
                      {t(notificationGroupLabels[group], group)}
                      <span className="ml-2 text-xs font-normal text-muted-foreground/60">
                        ({groupedNotifications[group].length})
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {groupedNotifications[group].map((notification) => {
                      const style = notificationStyles[group];
                      const Icon = getNotificationIcon(notification, style.icon);

                      return (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() => void openNotification(notification)}
                          className={cn(
                            'flex w-full items-start gap-4 rounded-lg border p-4 text-left transition hover:bg-muted/50',
                            !notification.isRead
                              ? 'border-l-4 border-l-accent bg-muted/20'
                              : 'border-border opacity-70',
                          )}
                        >
                          <span
                            className={cn(
                              'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border',
                              style.className,
                            )}
                          >
                            <Icon className="h-5 w-5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-4">
                              <p
                                  className={cn(
                                    'text-sm leading-5',
                                    !notification.isRead ? 'font-semibold text-foreground' : 'text-muted-foreground',
                                  )}
                                >
                                  {notification.notificationKey
                                    ? t(notification.notificationKey, notification.message, notification.params ?? undefined)
                                    : notification.message}
                                </p>
                              {!notification.isRead && (
                                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                              )}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground/60">
                              {formatDistanceToNow(new Date(notification.createdAt), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </CardContent>
                </Card>
              ),
          )}
        </div>
      )}
    </div>
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
