'use client';

import { useEffect, useState } from 'react';
import { X, Loader2, Search, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/components/providers/locale-provider';
import api from '@/lib/api';
import { createAssignment, getServices, type ServiceDto, type ServiceAssignmentDto } from '@/lib/services-api';
import { cn } from '@/lib/utils';
import { FrequencyBadge } from './FrequencyBadge';

interface AssignServiceDrawerProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  userRole: string;
}

interface StaffOption {
  id: string;
  fullName: string;
  role: string;
}

interface ParentOption {
  id: string;
  fullName: string;
  idTag: string | null;
  phone: string;
  photoUrl: string | null;
  assignedStaff?: { fullName: string } | null;
  status: string;
}

interface ChildOption {
  id: string;
  fullName: string;
  idTag: string | null;
  photoUrl: string | null;
  assignedStaff?: { fullName: string } | null;
  status: string;
  parent?: { fullName: string } | null;
}

export function AssignServiceDrawer({ open, onClose, onSaved, userRole }: AssignServiceDrawerProps) {
  const { t } = useLocale();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1: Who
  const [targetType, setTargetType] = useState<'PARENT' | 'CHILD'>('PARENT');
  const [parentSearch, setParentSearch] = useState('');
  const [childSearch, setChildSearch] = useState('');
  const [parents, setParents] = useState<ParentOption[]>([]);
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [selectedParent, setSelectedParent] = useState<ParentOption | null>(null);
  const [selectedChild, setSelectedChild] = useState<ChildOption | null>(null);
  const [loadingParents, setLoadingParents] = useState(false);
  const [loadingChildren, setLoadingChildren] = useState(false);

  // Step 2: Details
  const [services, setServices] = useState<ServiceDto[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [frequency, setFrequency] = useState<'ONE_TIME' | 'WEEKLY' | 'MONTHLY' | 'ONGOING'>('WEEKLY');
  const [deliveryMethod, setDeliveryMethod] = useState<'ON_SITE' | 'HOME_VISIT' | 'REFERRAL'>('ON_SITE');
  const [assignedStaffId, setAssignedStaffId] = useState('');
  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      fetchServices();
      fetchStaff();
    }
  }, [open, targetType]);

  useEffect(() => {
    if (open) {
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
  }, [open]);

  useEffect(() => {
    if (!parentSearch) {
      setParents([]);
      return;
    }
    const timer = setTimeout(() => fetchParents(), 300);
    return () => clearTimeout(timer);
  }, [parentSearch]);

  useEffect(() => {
    if (!childSearch) {
      setChildren([]);
      return;
    }
    const timer = setTimeout(() => fetchChildren(), 300);
    return () => clearTimeout(timer);
  }, [childSearch]);

  function resetForm() {
    setStep(1);
    setTargetType('PARENT');
    setParentSearch('');
    setChildSearch('');
    setSelectedParent(null);
    setSelectedChild(null);
    setSelectedServiceId('');
    setStartDate('');
    setEndDate('');
    setFrequency('WEEKLY');
    setDeliveryMethod('ON_SITE');
    setAssignedStaffId('');
    setAssignmentNotes('');
  }

  async function fetchParents() {
    setLoadingParents(true);
    try {
      const res = await api.get('/parents', {
        params: { search: parentSearch, limit: 10, status: 'ACTIVE' },
      });
      setParents(res.data.data || []);
    } catch {
      // ignore
    } finally {
      setLoadingParents(false);
    }
  }

  async function fetchChildren() {
    setLoadingChildren(true);
    try {
      const res = await api.get('/children', {
        params: { search: childSearch, limit: 10, status: 'ACTIVE' },
      });
      setChildren(res.data.data || []);
    } catch {
      // ignore
    } finally {
      setLoadingChildren(false);
    }
  }

  async function fetchServices() {
    try {
      const svcs = await getServices({ targetType, isActive: true });
      setServices(svcs);
    } catch {
      // ignore
    }
  }

  async function fetchStaff() {
    setLoadingStaff(true);
    try {
      const res = await api.get('/accounts', { params: { limit: 100 } });
      const accounts = res.data.data || res.data || [];
      const activeStaff = accounts
        .filter((a: any) => a.isActive && (a.role === 'CASE_WORKER' || a.role === 'SUPER_ADMIN'))
        .map((a: any) => ({ id: a.id, fullName: a.fullName, role: a.role }));
      setStaffList(activeStaff);
    } catch {
      // ignore
    } finally {
      setLoadingStaff(false);
    }
  }

  async function handleSubmit() {
    if (!selectedServiceId || !startDate || !assignedStaffId) return;
    if (targetType === 'PARENT' && !selectedParent) return;
    if (targetType === 'CHILD' && !selectedChild) return;

    setSaving(true);
    try {
      await createAssignment({
        serviceId: selectedServiceId,
        targetType,
        parentId: targetType === 'PARENT' ? selectedParent!.id : undefined,
        childId: targetType === 'CHILD' ? selectedChild!.id : undefined,
        assignedStaffId,
        startDate,
        endDate: endDate || undefined,
        frequency,
        deliveryMethod,
        notes: assignmentNotes || undefined,
      });
      toast({
        title: t('services.assign.assigned', 'Service Assigned'),
        description: t('services.assign.assignedDesc', 'The service has been assigned successfully.'),
      });
      onSaved();
    } catch (err: any) {        const msg = err?.response?.data?.message || t('services.error.assign', 'Failed to assign service');
      toast({
        title: t('common.error', 'Error'),
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  function canGoNext() {
    if (step === 1) {
      return targetType === 'PARENT' ? !!selectedParent : !!selectedChild;
    }
    if (step === 2) {
      return !!selectedServiceId && !!startDate && !!assignedStaffId;
    }
    return true;
  }

  const selectedService = services.find((s) => s.id === selectedServiceId);
  const selectedStaff = staffList.find((s) => s.id === assignedStaffId);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 !mt-0">
      <div className={`fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ease-out ${
        visible ? 'opacity-100' : 'opacity-0'
      }`} onClick={onClose} />
      <div className={`fixed inset-y-0 right-0 z-50 !mt-0 w-full max-w-xl bg-white shadow-xl flex flex-col transition-transform duration-300 ease-out ${
        visible ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">{t('services.assign.title', 'Assign Service')}</h2>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium transition-colors',
                    s === step
                      ? 'bg-primary text-primary-foreground'
                      : s < step
                      ? 'bg-primary/20 text-primary'
                      : 'bg-slate-100 text-slate-400'
                  )}
                >
                  {s < step ? <Check className="h-3 w-3" /> : s}
                </div>
              ))}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-1">{t('services.assign.who', 'Who is this for?')}</h3>
                <p className="text-sm text-muted-foreground mb-4">{t('services.assign.whoDesc', 'Select a parent or child to assign this service to.')}</p>
              </div>

              {/* Segmented control */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setTargetType('PARENT'); setSelectedParent(null); setParentSearch(''); }}
                  className={cn(
                    'flex-1 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors',
                    targetType === 'PARENT'
                      ? 'bg-amber-50 border-amber-200 text-amber-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  )}
                >
                  {t('services.assign.parent', 'Parent')}
                </button>
                <button
                  type="button"
                  onClick={() => { setTargetType('CHILD'); setSelectedChild(null); setChildSearch(''); }}
                  className={cn(
                    'flex-1 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors',
                    targetType === 'CHILD'
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  )}
                >
                  {t('services.assign.child', 'Child')}
                </button>
              </div>

              {/* Search */}
              {targetType === 'PARENT' && (
                <div className="space-y-2">
                  <Label>{t('services.assign.selectParent', 'Search Parent')}</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={parentSearch}
                      onChange={(e) => setParentSearch(e.target.value)}
                      placeholder={t('services.assign.searchByName', 'Search by name or national ID...')}
                      className="pl-9"
                    />
                  </div>
                  {loadingParents && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {parentSearch && !loadingParents && parents.length > 0 && (
                    <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                      {parents.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedParent(p)}
                          className={cn(
                            'w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition-colors',
                            selectedParent?.id === p.id && 'bg-primary/5'
                          )}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">{initials(p.fullName)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">{p.fullName}</div>
                            <div className="text-xs text-muted-foreground">{p.idTag || p.phone || ''}</div>
                          </div>
                          {selectedParent?.id === p.id && <Check className="h-4 w-4 text-primary" />}
                        </button>
                      ))}
                    </div>
                  )}
                  {parentSearch && !loadingParents && parents.length === 0 && (
                    <p className="text-sm text-muted-foreground py-2 text-center">{t('services.assign.noParents', 'No parents found.')}</p>
                  )}
                  {selectedParent && !parentSearch && (
                    <SelectedPersonCard
                      name={selectedParent.fullName}
                      status={selectedParent.status}
                      staffName={selectedParent.assignedStaff?.fullName}
                    />
                  )}
                </div>
              )}

              {targetType === 'CHILD' && (
                <div className="space-y-2">
                  <Label>{t('services.assign.selectChild', 'Search Child')}</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={childSearch}
                      onChange={(e) => setChildSearch(e.target.value)}
                      placeholder={t('services.assign.searchChild', 'Search by name...')}
                      className="pl-9"
                    />
                  </div>
                  {loadingChildren && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {childSearch && !loadingChildren && children.length > 0 && (
                    <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                      {children.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedChild(c)}
                          className={cn(
                            'w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition-colors',
                            selectedChild?.id === c.id && 'bg-primary/5'
                          )}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">{initials(c.fullName)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">{c.fullName}</div>
                            <div className="text-xs text-muted-foreground">{c.parent?.fullName || ''}</div>
                          </div>
                          {selectedChild?.id === c.id && <Check className="h-4 w-4 text-primary" />}
                        </button>
                      ))}
                    </div>
                  )}
                  {childSearch && !loadingChildren && children.length === 0 && (
                    <p className="text-sm text-muted-foreground py-2 text-center">{t('services.assign.noChildren', 'No children found.')}</p>
                  )}
                  {selectedChild && !childSearch && (
                    <SelectedPersonCard
                      name={selectedChild.fullName}
                      status={selectedChild.status}
                      staffName={selectedChild.assignedStaff?.fullName}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-1">{t('services.assign.details', 'Service Details')}</h3>
                <p className="text-sm text-muted-foreground mb-4">{t('services.assign.detailsDesc', 'Configure the service assignment details.')}</p>
              </div>

              {/* Service dropdown */}
              <div className="space-y-2">
                <Label>{t('services.assign.service', 'Service')} *</Label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">{t('services.assign.selectService', '-- Select Service --')}</option>
                  {Object.entries(groupBy(services, 'category')).map(([cat, svcs]) => (
                    <optgroup key={cat} label={cat}>
                      {svcs.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('services.assign.startDate', 'Start Date')} *</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t('services.assign.endDate', 'End Date')}</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>

              {/* Frequency */}
              <div className="space-y-2">
                <Label>{t('services.assign.frequency', 'Frequency')} *</Label>
                <div className="grid grid-cols-4 gap-2">
                  {(['ONE_TIME', 'WEEKLY', 'MONTHLY', 'ONGOING'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFrequency(f)}
                      className={cn(
                        'rounded-md border px-3 py-2 text-xs font-medium transition-colors',
                        frequency === f
                          ? 'bg-primary/10 border-primary/30 text-primary'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      )}
                    >
                      {f.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Delivery Method */}
              <div className="space-y-2">
                <Label>{t('services.assign.deliveryMethod', 'Delivery Method')} *</Label>
                <div className="space-y-2">
                  {(['ON_SITE', 'HOME_VISIT', 'REFERRAL'] as const).map((m) => (
                    <label key={m} className="flex items-center gap-3 rounded-md border px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors">
                      <input
                        type="radio"
                        name="deliveryMethod"
                        checked={deliveryMethod === m}
                        onChange={() => setDeliveryMethod(m)}
                        className="h-4 w-4 text-primary"
                      />
                      <span className="text-sm font-medium">{m.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Assigned Staff */}
              <div className="space-y-2">
                <Label>{t('services.assign.assignedStaff', 'Assigned Staff')} *</Label>
                <select
                  value={assignedStaffId}
                  onChange={(e) => setAssignedStaffId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">{t('services.assign.selectStaff', '-- Select Staff --')}</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>{s.fullName} ({s.role.replace('_', ' ')})</option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>{t('services.assign.notes', 'Notes')} ({t('common.optional', 'Optional')})</Label>
                <textarea
                  value={assignmentNotes}
                  onChange={(e) => setAssignmentNotes(e.target.value)}
                  placeholder={t('services.assign.notesPlaceholder', 'Any additional details...')}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-1">{t('services.assign.confirm', 'Confirm Assignment')}</h3>
                <p className="text-sm text-muted-foreground mb-4">{t('services.assign.confirmDesc', 'Please review the details before confirming.')}</p>
              </div>

              <div className="space-y-4 border rounded-lg p-4 bg-slate-50">
                {/* Recipient */}
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('services.assign.recipient', 'Recipient')}</Label>
                  <p className="text-sm font-medium mt-1">
                    {targetType === 'PARENT' ? selectedParent?.fullName : selectedChild?.fullName}
                  </p>
                  <Badge variant="outline" className={cn('mt-1 text-[10px]', targetType === 'PARENT' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700')}>
                    {targetType === 'PARENT' ? t('services.assign.parent', 'Parent') : t('services.assign.child', 'Child')}
                  </Badge>
                </div>

                <div className="h-px bg-slate-200" />

                {/* Service */}
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('services.assign.service', 'Service')}</Label>
                  <p className="text-sm font-medium mt-1">{selectedService?.name}</p>
                  <Badge variant="secondary" className="mt-1 text-[10px]">{selectedService?.category}</Badge>
                </div>

                <div className="h-px bg-slate-200" />

                {/* Details */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('services.assign.startDate', 'Start Date')}</Label>
                    <p className="text-sm mt-1">{startDate}</p>
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('services.assign.endDate', 'End Date')}</Label>
                    <p className="text-sm mt-1">{endDate || t('services.assign.ongoing', 'Ongoing')}</p>
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('services.assign.frequency', 'Frequency')}</Label>
                    <div className="mt-1"><FrequencyBadge frequency={frequency} /></div>
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('services.assign.deliveryMethod', 'Delivery')}</Label>
                    <p className="text-sm mt-1 capitalize">{deliveryMethod.replace('_', ' ').toLowerCase()}</p>
                  </div>
                </div>

                <div className="h-px bg-slate-200" />

                {/* Staff */}
                <div>                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('services.assign.assignedStaff', 'Assigned Staff')}</Label>
                  <p className="text-sm font-medium mt-1">{selectedStaff?.fullName}</p>
                </div>

                {assignmentNotes && (
                  <>
                    <div className="h-px bg-slate-200" />
                    <div>
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('services.assign.notes', 'Notes')}</Label>
                      <p className="text-sm mt-1 text-muted-foreground">{assignmentNotes}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex items-center justify-between">
          <Button variant="outline" onClick={() => step > 1 ? setStep(step - 1) : onClose()}>
            {step === 1 ? t('common.cancel', 'Cancel') : (
              <><ChevronLeft className="h-4 w-4 mr-1" /> {t('services.assign.back', 'Back')}</>
            )}
          </Button>

          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canGoNext()}>
              {t('services.assign.next', 'Next')} <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('services.assign.confirm', 'Confirm Assignment')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SelectedPersonCard({ name, status, staffName }: { name: string; status: string; staffName?: string }) {
  const { t } = useLocale();
  return (
    <div className="flex items-center gap-3 rounded-md border bg-white p-3 mt-2">
      <Avatar className="h-9 w-9">
        <AvatarFallback className="text-xs">{initials(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{name}</div>
        <div className="text-xs text-muted-foreground">
          {staffName ? t('services.assign.caseWorker', 'Case worker: {name}', { name: staffName }) : ''}
        </div>
      </div>
      <Badge variant="outline" className={cn(
        'text-[10px]',
        status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
        status === 'INACTIVE' ? 'bg-slate-100 text-slate-600 border-slate-200' :
        'bg-amber-50 text-amber-700 border-amber-200'
      )}>
        {status.replace('_', ' ')}
      </Badge>
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

function groupBy<T extends Record<string, any>>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = String(item[key]);
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}
