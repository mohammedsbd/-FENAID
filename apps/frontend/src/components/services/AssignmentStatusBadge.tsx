'use client';

import { Badge } from '@/components/ui/badge';
import { useLocale } from '@/components/providers/locale-provider';

type ServiceAssignmentStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

const statusKeys: Record<ServiceAssignmentStatus, string> = {
  PENDING: 'services.status.pending',
  ACTIVE: 'services.status.active',
  COMPLETED: 'services.status.completed',
  CANCELLED: 'services.status.cancelled',
};

const statusFallsbacks: Record<ServiceAssignmentStatus, string> = {
  PENDING: 'Pending',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const statusConfig: Record<ServiceAssignmentStatus, { className: string }> = {
  PENDING: { className: 'bg-slate-100 text-slate-700 border-slate-200' },
  ACTIVE: { className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  COMPLETED: { className: 'bg-blue-50 text-blue-700 border-blue-200' },
  CANCELLED: { className: 'bg-red-50 text-red-700 border-red-200' },
};

export function AssignmentStatusBadge({ status }: { status: ServiceAssignmentStatus }) {
  const { t } = useLocale();
  const config = statusConfig[status];
  return (
    <Badge variant="outline" className={`${config.className} text-xs font-medium`}>
      {t(statusKeys[status], statusFallsbacks[status])}
    </Badge>
  );
}
