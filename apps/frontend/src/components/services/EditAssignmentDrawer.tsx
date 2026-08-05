'use client';

import { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/components/providers/locale-provider';
import { updateAssignment, type ServiceAssignmentDto } from '@/lib/services-api';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface StaffOption {
  id: string;
  fullName: string;
  role?: string;
}

interface EditAssignmentDrawerProps {
  open: boolean;
  assignment: ServiceAssignmentDto | null;
  staffList: StaffOption[];
  onClose: () => void;
  onSaved: () => void;
}

export function EditAssignmentDrawer({
  open,
  assignment,
  staffList,
  onClose,
  onSaved,
}: EditAssignmentDrawerProps) {
  const { t } = useLocale();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [status, setStatus] = useState<'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('PENDING');
  const [assignedStaffId, setAssignedStaffId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [frequency, setFrequency] = useState<'ONE_TIME' | 'WEEKLY' | 'MONTHLY' | 'ONGOING'>('WEEKLY');
  const [deliveryMethod, setDeliveryMethod] = useState<'ON_SITE' | 'HOME_VISIT' | 'REFERRAL'>('ON_SITE');
  const [notes, setNotes] = useState('');

  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open && assignment) {
      setStatus(assignment.status);
      setAssignedStaffId(assignment.assignedStaffId || assignment.assignedStaff?.id || '');
      setStartDate(assignment.startDate ? format(new Date(assignment.startDate), 'yyyy-MM-dd') : '');
      setEndDate(assignment.endDate ? format(new Date(assignment.endDate), 'yyyy-MM-dd') : '');
      setFrequency(assignment.frequency);
      setDeliveryMethod(assignment.deliveryMethod);
      setNotes(assignment.notes || '');

      setMounted(true);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
        });
      });
      return () => cancelAnimationFrame(frame);
    } else {
      setVisible(false);
      const timer = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open, assignment]);

  if (!mounted || !assignment) return null;

  const recipientName =
    assignment.parent?.fullName || assignment.child?.fullName || t('common.unknown', 'Unknown');

  async function handleSave() {
    if (!assignment) return;
    setSaving(true);
    try {
      await updateAssignment(assignment.id, {
        status,
        assignedStaffId: assignedStaffId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        frequency,
        deliveryMethod,
        notes: notes || undefined,
      });

      toast({
        title: t('services.toast.assignmentUpdated', 'Assignment Updated'),
        description: t('services.toast.assignmentUpdatedDesc', 'The service assignment has been updated successfully.'),
      });
      onSaved();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || t('services.error.update', 'Failed to update assignment');
      toast({
        title: t('common.error', 'Error'),
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 !mt-0">
      <div
        className={cn(
          'fixed inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-300 ease-out',
          visible ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
      />
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 !mt-0 w-full max-w-lg bg-white dark:bg-neutral-900 shadow-xl flex flex-col transition-transform duration-300 ease-out',
          visible ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">{t('services.edit.title', 'Edit Assignment')}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {recipientName} — {assignment.service?.name}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Status */}
          <div className="space-y-2">
            <Label>{t('services.table.status', 'Status')} *</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={cn(
                    'rounded-md border px-3 py-2 text-xs font-semibold transition-colors',
                    status === s
                      ? s === 'PENDING'
                        ? 'bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
                        : s === 'ACTIVE'
                        ? 'bg-blue-100 border-blue-300 text-blue-900 dark:bg-blue-950 dark:text-blue-200'
                        : s === 'COMPLETED'
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                        : 'bg-red-100 border-red-300 text-red-900 dark:bg-red-950 dark:text-red-200'
                      : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-neutral-300 hover:bg-slate-50'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Assigned Staff */}
          <div className="space-y-2">
            <Label>{t('services.assign.assignedStaff', 'Assigned Staff')}</Label>
            <select
              value={assignedStaffId}
              onChange={(e) => setAssignedStaffId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">{t('services.assign.selectStaff', '-- Unassigned / Select Staff --')}</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} {s.role ? `(${s.role.replace('_', ' ')})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('services.detail.startDate', 'Start Date')}</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('services.detail.endDate', 'End Date')}</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10"
              />
            </div>
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <Label>{t('services.assign.frequency', 'Frequency')} *</Label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as any)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="ONE_TIME">One Time</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="ONGOING">Ongoing</option>
            </select>
          </div>

          {/* Delivery Method */}
          <div className="space-y-2">
            <Label>{t('services.assign.deliveryMethod', 'Delivery Method')} *</Label>
            <select
              value={deliveryMethod}
              onChange={(e) => setDeliveryMethod(e.target.value as any)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="ON_SITE">On Site</option>
              <option value="HOME_VISIT">Home Visit</option>
              <option value="REFERRAL">Referral</option>
            </select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>{t('services.assign.notes', 'Notes')}</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('services.assign.notesPlaceholder', 'Any additional details...')}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {t('common.saveChanges', 'Save Changes')}
          </Button>
        </div>
      </div>
    </div>
  );
}
