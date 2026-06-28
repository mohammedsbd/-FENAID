'use client';

import { X, Clock, User, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useLocale } from '@/components/providers/locale-provider';
import type { ServiceAssignmentDto } from '@/lib/services-api';
import { AssignmentStatusBadge } from './AssignmentStatusBadge';
import { FrequencyBadge } from './FrequencyBadge';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface AssignmentDetailPanelProps {
  open: boolean;
  assignment: ServiceAssignmentDto | null;
  onClose: () => void;
  onEdit: () => void;
  onMarkComplete: () => void;
  onMarkCancelled: () => void;
  userRole: string;
}

export function AssignmentDetailPanel({
  open,
  assignment,
  onClose,
  onEdit,
  onMarkComplete,
  onMarkCancelled,
  userRole,
}: AssignmentDetailPanelProps) {
  const { t } = useLocale();
  const canEdit = userRole === 'SUPER_ADMIN' || userRole === 'CASE_WORKER';

  if (!open || !assignment) return null;

  const recipientName =
    assignment.parent?.fullName || assignment.child?.fullName || 'Unknown';
  const recipientHref = assignment.parent
    ? `/dashboard/parents/${assignment.parent.id}`
    : assignment.child
    ? `/dashboard/children/${assignment.child.id}`
    : '#';

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">{t('services.detail.title', 'Assignment Details')}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between">
            <AssignmentStatusBadge status={assignment.status} />
            <span className="text-xs text-muted-foreground">
              {t('services.detail.created', 'Created')} {format(new Date(assignment.createdAt), 'MMM dd, yyyy')}
            </span>
          </div>

          {/* Service Info */}
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('services.detail.serviceInfo', 'Service')}</Label>
            <div className="rounded-lg border p-3 space-y-2">
              <p className="font-semibold">{assignment.service?.name}</p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">{assignment.service?.category}</Badge>
                <FrequencyBadge frequency={assignment.frequency} />
              </div>
            </div>
          </div>

          {/* Recipient */}
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('services.detail.recipientInfo', 'Recipient')}</Label>
            <Link href={recipientHref} className="block rounded-lg border p-3 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                  {initials(recipientName)}
                </div>
                <div>
                  <p className="font-medium text-sm">{recipientName}</p>
                  <Badge variant="outline" className={cn(
                    'text-[10px] mt-0.5',
                    assignment.targetType === 'PARENT'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  )}>
                    {assignment.targetType === 'PARENT' ? t('services.assign.parent', 'Parent') : t('services.assign.child', 'Child')}
                  </Badge>
                </div>
              </div>
            </Link>
          </div>

          {/* Staff */}
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('services.detail.staffInfo', 'Assigned Staff')}</Label>
            <div className="flex items-center gap-2 rounded-lg border p-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{assignment.assignedStaff?.fullName || 'Unknown'}</span>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('services.detail.startDate', 'Start Date')}</Label>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {format(new Date(assignment.startDate), 'MMM dd, yyyy')}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('services.detail.endDate', 'End Date')}</Label>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {assignment.endDate ? format(new Date(assignment.endDate), 'MMM dd, yyyy') : t('services.assign.ongoing', 'Ongoing')}
              </div>
            </div>
          </div>

          {/* Delivery */}
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('services.detail.deliveryInfo', 'Delivery Method')}</Label>
            <p className="text-sm capitalize">{assignment.deliveryMethod.replace('_', ' ').toLowerCase()}</p>
          </div>

          {/* Notes */}
          {assignment.notes && (
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('services.detail.notes', 'Notes')}</Label>
              <p className="text-sm text-muted-foreground bg-slate-50 rounded-lg p-3">{assignment.notes}</p>
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('services.detail.timeline', 'Timeline')}</Label>
            <div className="space-y-3">
              <TimelineItem
                date={assignment.createdAt}
                label={t('services.detail.created', 'Assignment created')}
                status="created"
              />
              {assignment.status === 'COMPLETED' && assignment.endDate && (
                <TimelineItem
                  date={assignment.endDate}
                  label={t('services.detail.completed', 'Service completed')}
                  status="completed"
                />
              )}
              {assignment.status === 'CANCELLED' && (
                <TimelineItem
                  date={assignment.updatedAt}
                  label={t('services.detail.cancelled', 'Assignment cancelled')}
                  status="cancelled"
                />
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        {canEdit && (
          <div className="border-t px-6 py-4 space-y-2">
            <Button variant="outline" className="w-full" onClick={onEdit}>
              {t('services.detail.edit', 'Edit Assignment')}
            </Button>
            {assignment.status === 'ACTIVE' && (
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={onMarkComplete}>
                {t('services.detail.markComplete', 'Mark as Completed')}
              </Button>
            )}
            {(assignment.status === 'PENDING' || assignment.status === 'ACTIVE') && (
              <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50" onClick={onMarkCancelled}>
                {t('services.detail.markCancelled', 'Mark as Cancelled')}
              </Button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function TimelineItem({ date, label, status }: { date: string; label: string; status: 'created' | 'completed' | 'cancelled' }) {
  const dotColor = status === 'completed' ? 'bg-emerald-500' : status === 'cancelled' ? 'bg-red-500' : 'bg-blue-500';
  return (
    <div className="flex items-start gap-3">
      <div className={`mt-1.5 h-2.5 w-2.5 rounded-full ${dotColor} shrink-0`} />
      <div>
        <p className="text-sm">{label}</p>
        <p className="text-xs text-muted-foreground">{format(new Date(date), 'MMM dd, yyyy HH:mm')}</p>
      </div>
    </div>
  );
}

function initials(value: string) {
  return value
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
