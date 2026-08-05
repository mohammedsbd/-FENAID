'use client';

import { useEffect, useState } from 'react';
import { X, Loader2, Search, ChevronLeft, ChevronRight, Check, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/components/providers/locale-provider';
import api from '@/lib/api';
import { createAssignment, createBulkAssignments, createService, getServices, type ServiceDto, type ServiceAssignmentDto } from '@/lib/services-api';
import { cn } from '@/lib/utils';
import { FrequencyBadge } from './FrequencyBadge';

interface AssignServiceDrawerProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  userRole: string;
  defaultTargetType?: 'PARENT' | 'CHILD';
  defaultTargetId?: string;
  defaultTargetName?: string;
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

export function AssignServiceDrawer({ open, onClose, onSaved, userRole, defaultTargetType, defaultTargetId, defaultTargetName }: AssignServiceDrawerProps) {
  const { t } = useLocale();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1: Who
  const [targetType, setTargetType] = useState<'PARENT' | 'CHILD' | 'ALL'>('PARENT');
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [parentSearch, setParentSearch] = useState('');
  const [childSearch, setChildSearch] = useState('');
  const [parents, setParents] = useState<ParentOption[]>([]);
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [selectedParent, setSelectedParent] = useState<ParentOption | null>(null);
  const [selectedChild, setSelectedChild] = useState<ChildOption | null>(null);
  const [bulkParents, setBulkParents] = useState<ParentOption[]>([]);
  const [bulkChildren, setBulkChildren] = useState<ChildOption[]>([]);
  const [loadingParents, setLoadingParents] = useState(false);
  const [loadingChildren, setLoadingChildren] = useState(false);

  // Step 2: Details
  const [services, setServices] = useState<ServiceDto[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [customServiceName, setCustomServiceName] = useState('');
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
      if (defaultTargetType && defaultTargetId && defaultTargetName) {
        setTargetType(defaultTargetType);
        if (defaultTargetType === 'PARENT') {
          setSelectedParent({ id: defaultTargetId, fullName: defaultTargetName, idTag: null, phone: '', photoUrl: null, status: 'ACTIVE' });
        } else {
          setSelectedChild({ id: defaultTargetId, fullName: defaultTargetName, idTag: null, photoUrl: null, status: 'ACTIVE' });
        }
        setStep(2);
      }
    }
  }, [open, targetType, defaultTargetType, defaultTargetId, defaultTargetName]);

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
    if (open && targetType === 'PARENT') {
      fetchParents(parentSearch);
    }
  }, [open, targetType]);

  useEffect(() => {
    if (open && targetType === 'CHILD') {
      fetchChildren(childSearch);
    }
  }, [open, targetType]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (open && targetType === 'PARENT') {
        fetchParents(parentSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [parentSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (open && targetType === 'CHILD') {
        fetchChildren(childSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [childSearch]);

  function resetForm() {
    setStep(defaultTargetType ? 2 : 1);
    setTargetType(defaultTargetType || 'PARENT');
    setIsBulkMode(false);
    setBulkParents([]);
    setBulkChildren([]);
    setParentSearch('');
    setChildSearch('');
    setSelectedParent(defaultTargetType === 'PARENT' && defaultTargetId && defaultTargetName ? { id: defaultTargetId, fullName: defaultTargetName, idTag: null, phone: '', photoUrl: null, status: 'ACTIVE' } : null);
    setSelectedChild(defaultTargetType === 'CHILD' && defaultTargetId && defaultTargetName ? { id: defaultTargetId, fullName: defaultTargetName, idTag: null, photoUrl: null, status: 'ACTIVE' } : null);
    setSelectedServiceId('');
    setCustomServiceName('');
    setStartDate('');
    setEndDate('');
    setFrequency('WEEKLY');
    setDeliveryMethod('ON_SITE');
    setAssignedStaffId('');
    setAssignmentNotes('');
  }

  async function fetchParents(queryOverride?: string, loadAll?: boolean) {
    setLoadingParents(true);
    try {
      const searchTerm = queryOverride !== undefined ? queryOverride : parentSearch;
      const res = await api.get('/parents', {
        params: {
          search: searchTerm || undefined,
          limit: loadAll ? 200 : 50,
          status: 'ACTIVE',
        },
      });
      setParents(res.data.data || []);
    } catch {
      // ignore
    } finally {
      setLoadingParents(false);
    }
  }

  async function fetchChildren(queryOverride?: string, loadAll?: boolean) {
    setLoadingChildren(true);
    try {
      const searchTerm = queryOverride !== undefined ? queryOverride : childSearch;
      const res = await api.get('/children', {
        params: {
          search: searchTerm || undefined,
          limit: loadAll ? 200 : 50,
          status: 'ACTIVE',
        },
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
    if (!selectedServiceId) return;
    if (!isBulkMode) {
      if (targetType === 'PARENT' && !selectedParent) return;
      if (targetType === 'CHILD' && !selectedChild) return;
    } else if (targetType !== 'ALL') {
      if (targetType === 'PARENT' && bulkParents.length === 0) return;
      if (targetType === 'CHILD' && bulkChildren.length === 0) return;
    }

    setSaving(true);
    try {
      let finalServiceId = selectedServiceId;
      if (selectedServiceId === 'OTHER') {
        if (!customServiceName.trim()) {
          toast({
            title: t('common.error', 'Error'),
            description: t('services.assign.customNameRequired', 'Please specify a custom service name'),
            variant: 'destructive',
          });
          setSaving(false);
          return;
        }
        const existingList = await getServices({ search: customServiceName.trim() });
        const exactMatch = existingList.find((s) => s.name.toLowerCase() === customServiceName.trim().toLowerCase());
        if (exactMatch) {
          finalServiceId = exactMatch.id;
        } else {
          const newSvc = await createService({
            name: customServiceName.trim(),
            category: 'Other Services',
            targetType,
            isActive: true,
          });
          finalServiceId = newSvc.id;
        }
      }

      if (isBulkMode && targetType !== 'ALL') {
        const parentIds = targetType === 'PARENT' ? bulkParents.map((p) => p.id) : undefined;
        const childIds = targetType === 'CHILD' ? bulkChildren.map((c) => c.id) : undefined;

        const bulkRes = await createBulkAssignments({
          serviceId: finalServiceId,
          targetType,
          parentIds,
          childIds,
          assignedStaffId: assignedStaffId || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          frequency,
          deliveryMethod,
          notes: assignmentNotes || undefined,
        });

        toast({
          title: t('services.assign.bulkSuccessTitle', 'Bulk Assignment Created'),
          description: t('services.assign.bulkSuccessDesc', 'Assigned service to {count} recipients! ({skipped} skipped duplicate active assignments)', {
            count: bulkRes.createdCount,
            skipped: bulkRes.skippedCount,
          }),
        });
      } else {
        await createAssignment({
          serviceId: finalServiceId,
          targetType,
          parentId: targetType === 'PARENT' ? selectedParent?.id : targetType === 'ALL' ? (selectedParent?.id || undefined) : undefined,
          childId: targetType === 'CHILD' ? selectedChild?.id : targetType === 'ALL' ? (selectedChild?.id || undefined) : undefined,
          assignedStaffId: assignedStaffId || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          frequency,
          deliveryMethod,
          notes: assignmentNotes || undefined,
        });
        toast({
          title: t('services.assign.assigned', 'Service Assigned'),
          description: t('services.assign.assignedDesc', 'The service has been assigned successfully.'),
        });
      }

      onSaved();
    } catch (err: any) {
      const msg = err?.response?.data?.message || t('services.error.assign', 'Failed to assign service');
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
      if (targetType === 'ALL') return true;
      if (isBulkMode) {
        return targetType === 'PARENT' ? bulkParents.length > 0 : bulkChildren.length > 0;
      }
      return targetType === 'PARENT' ? !!selectedParent : !!selectedChild;
    }
    if (step === 2) {
      return !!selectedServiceId && (selectedServiceId !== 'OTHER' || !!customServiceName.trim());
    }
    return true;
  }

  const selectedService = selectedServiceId === 'OTHER'
    ? ({ id: 'OTHER', name: customServiceName.trim() || 'Custom Service', category: 'Other Services', description: null, targetType, isActive: true, createdAt: '', updatedAt: '' } as ServiceDto)
    : services.find((s) => s.id === selectedServiceId);
  const selectedStaff = staffList.find((s) => s.id === assignedStaffId);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 !mt-0">
      <div className={`fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ease-out ${
        visible ? 'opacity-100' : 'opacity-0'
      }`} onClick={onClose} />
      <div className={`fixed inset-y-0 right-0 z-50 !mt-0 w-full max-w-2xl bg-white dark:bg-neutral-900 shadow-xl flex flex-col transition-transform duration-300 ease-out ${
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
              {defaultTargetType && defaultTargetName ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-1">{t('services.assign.who', 'Who is this for?')}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{t('services.assign.whoDesc', 'Select a parent or child to assign this service to.')}</p>
                  </div>
                  <SelectedPersonCard
                    name={defaultTargetName}
                    status="ACTIVE"
                  />
                  {targetType === 'PARENT' && (
                    <button
                      type="button"
                      onClick={() => setTargetType('CHILD')}
                      className="text-sm text-primary hover:underline"
                    >
                      {t('services.assign.switchToChild', 'Assign to a child instead')}
                    </button>
                  )}
                  {targetType === 'CHILD' && (
                    <button
                      type="button"
                      onClick={() => setTargetType('PARENT')}
                      className="text-sm text-primary hover:underline"
                    >
                      {t('services.assign.switchToParent', 'Assign to a parent instead')}
                    </button>
                  )}
                </div>
              ) : (
              <div>
                <h3 className="font-semibold mb-1">{t('services.assign.who', 'Who is this for?')}</h3>
                <p className="text-sm text-muted-foreground mb-4">{t('services.assign.whoDesc', 'Select a parent or child to assign this service to.')}</p>
              </div>
              )}

              {!defaultTargetType && (
              <>
              {/* Bulk Mode Switcher */}
              <div className="flex items-center justify-between bg-slate-50 dark:bg-neutral-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-neutral-700">
                <div className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                  <Users className="h-4 w-4 text-primary" />
                  <span>{isBulkMode ? t('services.assign.bulkModeActive', 'Bulk Assign Mode (Multiple Recipients)') : t('services.assign.singleModeActive', 'Single Recipient Mode')}</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn("h-7 text-xs font-semibold gap-1.5", isBulkMode && "bg-primary text-primary-foreground border-primary hover:bg-primary/90")}
                  onClick={() => {
                    setIsBulkMode(!isBulkMode);
                    setSelectedParent(null);
                    setSelectedChild(null);
                    setBulkParents([]);
                    setBulkChildren([]);
                  }}
                >
                  {isBulkMode ? t('services.assign.switchToSingle', 'Switch to Single') : t('services.assign.enableBulk', '+ Enable Bulk Selection')}
                </Button>
              </div>

              {/* Segmented control */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setTargetType('PARENT'); setSelectedParent(null); setParentSearch(''); }}
                  className={cn(
                    'flex-1 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors',
                    targetType === 'PARENT'
                      ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300'
                      : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800'
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
                      ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300'
                      : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800'
                  )}
                >
                  {t('services.assign.child', 'Child')}
                </button>
                <button
                  type="button"
                  onClick={() => { setTargetType('ALL'); setSelectedParent(null); setSelectedChild(null); }}
                  className={cn(
                    'flex-1 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors',
                    targetType === 'ALL'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                      : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800'
                  )}
                >
                  {t('services.assign.forAll', 'For All')}
                </button>
              </div>

              {targetType === 'ALL' && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20 text-sm">
                  <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                    {t('services.assign.allBeneficiariesNotice', 'General / Community Service')}
                  </p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                    {t('services.assign.allBeneficiariesNoticeDesc', 'This service assignment applies broadly across all beneficiaries (parents, children, and families).')}
                  </p>
                </div>
              )}

              {/* Search */}
              {targetType === 'PARENT' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>{isBulkMode ? t('services.assign.selectParentsBulk', 'Search & Select Parents (Bulk)') : t('services.assign.selectParent', 'Search Parent')}</Label>
                    {isBulkMode && parents.length > 0 && (
                      <button
                        type="button"
                        className="text-xs text-primary font-semibold hover:underline"
                        onClick={() => {
                          const map = new Map<string, ParentOption>();
                          bulkParents.forEach((p) => map.set(p.id, p));
                          parents.forEach((p) => map.set(p.id, p));
                          setBulkParents(Array.from(map.values()));
                        }}
                      >
                        + Select All {parents.length} Visible
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={parentSearch}
                        onChange={(e) => setParentSearch(e.target.value)}
                        placeholder={t('services.assign.searchByName', 'Search by name or national ID...')}
                        className="pl-9 h-10"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-10 text-xs font-semibold px-3 whitespace-nowrap gap-1.5 border"
                      onClick={() => {
                        setParentSearch('');
                        fetchParents('', true);
                      }}
                    >
                      {t('services.assign.listAll', 'List All')}
                    </Button>
                  </div>
                  {loadingParents && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {!loadingParents && parents.length > 0 && (
                    <div className="border rounded-md divide-y max-h-56 overflow-y-auto">
                      {parents.map((p) => {
                        const isSelected = isBulkMode
                          ? bulkParents.some((x) => x.id === p.id)
                          : selectedParent?.id === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              if (isBulkMode) {
                                setBulkParents(
                                  isSelected
                                    ? bulkParents.filter((x) => x.id !== p.id)
                                    : [...bulkParents, p]
                                );
                              } else {
                                setSelectedParent(p);
                              }
                            }}
                            className={cn(
                              'w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors',
                              isSelected && 'bg-primary/5'
                            )}
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">{initials(p.fullName)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium truncate">{p.fullName}</div>
                              <div className="text-xs text-muted-foreground">{p.idTag || p.phone || ''}</div>
                            </div>
                            {isSelected && <Check className="h-4 w-4 text-primary font-bold" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {isBulkMode && bulkParents.length > 0 && (
                    <div className="space-y-2 border rounded-lg p-3 bg-primary/5 dark:bg-primary/10 border-primary/20">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-primary">{bulkParents.length} {t('services.assign.parentsSelected', 'Parents Selected for Bulk Assignment')}</span>
                        <button type="button" onClick={() => setBulkParents([])} className="text-red-500 hover:underline">{t('common.clearAll', 'Clear All')}</button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pt-1">
                        {bulkParents.map((p) => (
                          <Badge key={p.id} variant="secondary" className="gap-1 text-xs py-1 px-2.5 bg-background shadow-sm border">
                            <span>{p.fullName}</span>
                            <X className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-red-500" onClick={(e) => { e.stopPropagation(); setBulkParents(bulkParents.filter(x => x.id !== p.id)); }} />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {!loadingParents && parents.length === 0 && (
                    <p className="text-sm text-muted-foreground py-2 text-center">{t('services.assign.noParents', 'No parents found.')}</p>
                  )}
                  {!isBulkMode && selectedParent && (
                    <SelectedPersonCard
                      name={selectedParent.fullName}
                      status={selectedParent.status}
                      staffName={selectedParent.assignedStaff?.fullName}
                    />
                  )}
                </div>
              )}

              {targetType === 'CHILD' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>{isBulkMode ? t('services.assign.selectChildrenBulk', 'Search & Select Children (Bulk)') : t('services.assign.selectChild', 'Search Child')}</Label>
                    {isBulkMode && children.length > 0 && (
                      <button
                        type="button"
                        className="text-xs text-primary font-semibold hover:underline"
                        onClick={() => {
                          const map = new Map<string, ChildOption>();
                          bulkChildren.forEach((c) => map.set(c.id, c));
                          children.forEach((c) => map.set(c.id, c));
                          setBulkChildren(Array.from(map.values()));
                        }}
                      >
                        + Select All {children.length} Visible
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={childSearch}
                        onChange={(e) => setChildSearch(e.target.value)}
                        placeholder={t('services.assign.searchChild', 'Search by name...')}
                        className="pl-9 h-10"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-10 text-xs font-semibold px-3 whitespace-nowrap gap-1.5 border"
                      onClick={() => {
                        setChildSearch('');
                        fetchChildren('', true);
                      }}
                    >
                      {t('services.assign.listAll', 'List All')}
                    </Button>
                  </div>
                  {loadingChildren && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {!loadingChildren && children.length > 0 && (
                    <div className="border rounded-md divide-y max-h-56 overflow-y-auto">
                      {children.map((c) => {
                        const isSelected = isBulkMode
                          ? bulkChildren.some((x) => x.id === c.id)
                          : selectedChild?.id === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              if (isBulkMode) {
                                setBulkChildren(
                                  isSelected
                                    ? bulkChildren.filter((x) => x.id !== c.id)
                                    : [...bulkChildren, c]
                                );
                              } else {
                                setSelectedChild(c);
                              }
                            }}
                            className={cn(
                              'w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors',
                              isSelected && 'bg-primary/5'
                            )}
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">{initials(c.fullName)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium truncate">{c.fullName}</div>
                              <div className="text-xs text-muted-foreground">{c.parent?.fullName || ''}</div>
                            </div>
                            {isSelected && <Check className="h-4 w-4 text-primary font-bold" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {isBulkMode && bulkChildren.length > 0 && (
                    <div className="space-y-2 border rounded-lg p-3 bg-primary/5 dark:bg-primary/10 border-primary/20">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-primary">{bulkChildren.length} {t('services.assign.childrenSelected', 'Children Selected for Bulk Assignment')}</span>
                        <button type="button" onClick={() => setBulkChildren([])} className="text-red-500 hover:underline">{t('common.clearAll', 'Clear All')}</button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pt-1">
                        {bulkChildren.map((c) => (
                          <Badge key={c.id} variant="secondary" className="gap-1 text-xs py-1 px-2.5 bg-background shadow-sm border">
                            <span>{c.fullName}</span>
                            <X className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-red-500" onClick={(e) => { e.stopPropagation(); setBulkChildren(bulkChildren.filter(x => x.id !== c.id)); }} />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {!loadingChildren && children.length === 0 && (
                    <p className="text-sm text-muted-foreground py-2 text-center">{t('services.assign.noChildren', 'No children found.')}</p>
                  )}
                  {!isBulkMode && selectedChild && (
                    <SelectedPersonCard
                      name={selectedChild.fullName}
                      status={selectedChild.status}
                      staffName={selectedChild.assignedStaff?.fullName}
                    />
                  )}
                </div>
              )}
              </>
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
                  <option value="OTHER">{t('common.other', 'Other (Specify Custom Service)')}</option>
                </select>

                {selectedServiceId === 'OTHER' && (
                  <div className="space-y-2 mt-3">
                    <Label className="text-xs font-semibold text-primary">{t('services.assign.customServiceLabel', 'Custom Service Name')} *</Label>
                    <Input
                      value={customServiceName}
                      onChange={(e) => setCustomServiceName(e.target.value)}
                      placeholder={t('services.assign.customServicePlaceholder', 'e.g. Specialized Speech Therapy, Music Therapy...')}
                      className="h-10 border-primary/40 focus-visible:ring-primary"
                    />
                  </div>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('services.assign.startDate', 'Start Date')} {t('common.optional', '(Optional)')}</Label>
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
                          : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800'
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
                    <label key={m} className="flex items-center gap-3 rounded-md border px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors">
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
                <Label>{t('services.assign.assignedStaff', 'Assigned Staff (Optional)')}</Label>
                <select
                  value={assignedStaffId}
                  onChange={(e) => setAssignedStaffId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">{t('services.assign.selectStaff', '-- Select Staff (Optional) --')}</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>{s.fullName} ({s.role.replace('_', ' ')})</option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>{t('services.assign.notes', 'Notes')} {t('common.optional', '(Optional)')}</Label>
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

              <div className="space-y-4 border rounded-lg p-4 bg-slate-50 dark:bg-neutral-800/50">
                {/* Recipient */}
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('services.assign.recipient', 'Recipient')}</Label>
                  <p className="text-sm font-medium mt-1">
                    {isBulkMode
                      ? targetType === 'PARENT'
                        ? `${bulkParents.length} Parents Selected (${bulkParents.map(p => p.fullName).slice(0, 3).join(', ')}${bulkParents.length > 3 ? '...' : ''})`
                        : `${bulkChildren.length} Children Selected (${bulkChildren.map(c => c.fullName).slice(0, 3).join(', ')}${bulkChildren.length > 3 ? '...' : ''})`
                      : targetType === 'ALL'
                      ? t('services.assign.allBeneficiaries', 'All Beneficiaries / General Service')
                      : targetType === 'PARENT' ? selectedParent?.fullName : selectedChild?.fullName}
                  </p>
                  <Badge variant="outline" className={cn('mt-1 text-[10px]', targetType === 'ALL' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : targetType === 'PARENT' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200')}>
                    {isBulkMode ? `Bulk ${targetType}` : targetType === 'ALL' ? t('services.assign.forAll', 'For All') : targetType === 'PARENT' ? t('services.assign.parent', 'Parent') : t('services.assign.child', 'Child')}
                  </Badge>
                </div>

                <div className="h-px bg-slate-200 dark:bg-neutral-700" />

                {/* Service */}
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('services.assign.service', 'Service')}</Label>
                  <p className="text-sm font-medium mt-1">{selectedService?.name}</p>
                  <Badge variant="secondary" className="mt-1 text-[10px]">{selectedService?.category}</Badge>
                </div>

                <div className="h-px bg-slate-200 dark:bg-neutral-700" />

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

                <div className="h-px bg-slate-200 dark:bg-neutral-700" />

                {/* Staff */}
                <div>                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('services.assign.assignedStaff', 'Assigned Staff')}</Label>
                  <p className="text-sm font-medium mt-1">{selectedStaff?.fullName || t('services.assign.unassigned', 'Unassigned / Auto')}</p>
                </div>

                {assignmentNotes && (
                  <>
                    <div className="h-px bg-slate-200 dark:bg-neutral-700" />
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
    <div className="flex items-center gap-3 rounded-md border bg-white dark:bg-neutral-900 p-3 mt-2">
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
        status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' :
        status === 'INACTIVE' ? 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700' :
        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
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
