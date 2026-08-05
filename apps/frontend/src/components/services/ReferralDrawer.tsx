'use client';

import { useEffect, useState } from 'react';
import { X, Loader2, Search, Check, Calendar, CheckSquare, Square, Users, Baby } from 'lucide-react';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/components/providers/locale-provider';
import api from '@/lib/api';
import {
  createReferral,
  createBulkReferrals,
  updateReferral,
  type ReferralDto,
  type CreateReferralData,
} from '@/lib/services-api';
import { cn } from '@/lib/utils';

interface ReferralDrawerProps {
  open: boolean;
  referral: ReferralDto | null;
  onClose: () => void;
  onSaved: () => void;
  userRole: string;
  defaultTargetType?: 'PARENT' | 'CHILD';
  defaultTargetId?: string;
  defaultTargetName?: string;
}

interface ParentOption {
  id: string;
  fullName: string;
  idTag: string | null;
  phone: string;
  photoUrl: string | null;
}

interface ChildOption {
  id: string;
  fullName: string;
  idTag: string | null;
  photoUrl: string | null;
  parent?: { fullName: string } | null;
}

type ReferralStatus = 'PENDING' | 'CONTACTED' | 'COMPLETED' | 'CANCELLED';

export function ReferralDrawer({
  open,
  referral,
  onClose,
  onSaved,
  userRole,
  defaultTargetType,
  defaultTargetId,
  defaultTargetName,
}: ReferralDrawerProps) {
  const { t } = useLocale();
  const { toast } = useToast();
  const isEdit = !!referral;
  const canEdit = userRole === 'SUPER_ADMIN' || userRole === 'CASE_WORKER';

  const [saving, setSaving] = useState(false);
  const [isBulk, setIsBulk] = useState(false);
  const [targetType, setTargetType] = useState<'PARENT' | 'CHILD'>('PARENT');
  const [parentSearch, setParentSearch] = useState('');
  const [childSearch, setChildSearch] = useState('');
  const [parents, setParents] = useState<ParentOption[]>([]);
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [selectedParent, setSelectedParent] = useState<ParentOption | null>(null);
  const [selectedChild, setSelectedChild] = useState<ChildOption | null>(null);
  const [selectedParentIds, setSelectedParentIds] = useState<string[]>([]);
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
  const [loadingParents, setLoadingParents] = useState(false);
  const [loadingChildren, setLoadingChildren] = useState(false);

  // Referral fields
  const [referredTo, setReferredTo] = useState('');
  const [referralReason, setReferralReason] = useState('');
  const [referralDate, setReferralDate] = useState(new Date().toISOString().split('T')[0]);
  const [followUpDate, setFollowUpDate] = useState('');
  const [status, setStatus] = useState<ReferralStatus>('PENDING');
  const [notes, setNotes] = useState('');
  const [outcome, setOutcome] = useState('');

  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  useEffect(() => {
    if (open && isEdit && referral) {
      // Populate form with existing data
      if (referral.parent) {
        setTargetType('PARENT');
        setSelectedParent({
          id: referral.parent.id,
          fullName: referral.parent.fullName,
          idTag: null,
          phone: '',
          photoUrl: referral.parent.photoUrl,
        });
      }
      if (referral.child) {
        setTargetType('CHILD');
        setSelectedChild({
          id: referral.child.id,
          fullName: referral.child.fullName,
          idTag: null,
          photoUrl: referral.child.photoUrl,
        });
      }
      setReferredTo(referral.referredTo);
      setReferralReason(referral.referralReason);
      setReferralDate(referral.referralDate.split('T')[0]);
      setFollowUpDate(referral.followUpDate ? referral.followUpDate.split('T')[0] : '');
      setStatus(referral.status);
      setNotes(referral.notes || '');
      setOutcome(referral.outcome || '');
    } else if (open && !isEdit && defaultTargetType && defaultTargetId && defaultTargetName) {
      setTargetType(defaultTargetType);
      if (defaultTargetType === 'PARENT') {
        setSelectedParent({ id: defaultTargetId, fullName: defaultTargetName, idTag: null, phone: '', photoUrl: null });
      } else {
        setSelectedChild({ id: defaultTargetId, fullName: defaultTargetName, idTag: null, photoUrl: null });
      }
    }
  }, [open, isEdit, referral, defaultTargetType, defaultTargetId, defaultTargetName]);

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
    if (open && !isEdit) {
      fetchParents('');
      fetchChildren('');
    }
  }, [open, isEdit]);

  useEffect(() => {
    if (open && !isEdit && parentSearch) {
      const timer = setTimeout(() => fetchParents(parentSearch), 300);
      return () => clearTimeout(timer);
    }
  }, [parentSearch]);

  useEffect(() => {
    if (open && !isEdit && childSearch) {
      const timer = setTimeout(() => fetchChildren(childSearch), 300);
      return () => clearTimeout(timer);
    }
  }, [childSearch]);

  function resetForm() {
    setIsBulk(false);
    setTargetType(defaultTargetType || 'PARENT');
    setParentSearch('');
    setChildSearch('');
    setSelectedParent(defaultTargetType === 'PARENT' && defaultTargetId && defaultTargetName ? { id: defaultTargetId, fullName: defaultTargetName, idTag: null, phone: '', photoUrl: null } : null);
    setSelectedChild(defaultTargetType === 'CHILD' && defaultTargetId && defaultTargetName ? { id: defaultTargetId, fullName: defaultTargetName, idTag: null, photoUrl: null } : null);
    setSelectedParentIds([]);
    setSelectedChildIds([]);
    setReferredTo('');
    setReferralReason('');
    setReferralDate(new Date().toISOString().split('T')[0]);
    setFollowUpDate('');
    setStatus('PENDING');
    setNotes('');
    setOutcome('');
  }

  async function fetchParents(query = parentSearch, limit = 50) {
    setLoadingParents(true);
    try {
      const res = await api.get('/parents', {
        params: { search: query, limit, status: 'ACTIVE' },
      });
      setParents(res.data.data || []);
    } catch {
      // ignore
    } finally {
      setLoadingParents(false);
    }
  }

  async function fetchChildren(query = childSearch, limit = 50) {
    setLoadingChildren(true);
    try {
      const res = await api.get('/children', {
        params: { search: query, limit, status: 'ACTIVE' },
      });
      setChildren(res.data.data || []);
    } catch {
      // ignore
    } finally {
      setLoadingChildren(false);
    }
  }

  async function handleSubmit() {
    if (!referredTo.trim() || !referralDate) {
      toast({
        title: t('common.error', 'Error'),
        description: t('services.referrals.error.create', 'Please fill in all required fields.'),
        variant: 'destructive',
      });
      return;
    }

    if (isBulk && !isEdit) {
      if (targetType === 'PARENT' && selectedParentIds.length === 0) {
        toast({
          title: t('common.error', 'Error'),
          description: t('services.referrals.drawer.selectParents', 'Please select at least one parent.'),
          variant: 'destructive',
        });
        return;
      }
      if (targetType === 'CHILD' && selectedChildIds.length === 0) {
        toast({
          title: t('common.error', 'Error'),
          description: t('services.referrals.drawer.selectChildren', 'Please select at least one child.'),
          variant: 'destructive',
        });
        return;
      }

      setSaving(true);
      try {
        const result = await createBulkReferrals({
          parentIds: targetType === 'PARENT' ? selectedParentIds : undefined,
          childIds: targetType === 'CHILD' ? selectedChildIds : undefined,
          referredTo: referredTo.trim(),
          referralReason: referralReason.trim() || undefined,
          referralDate,
          status,
          notes: notes.trim() || undefined,
          followUpDate: followUpDate || undefined,
        });
        toast({
          title: t('services.referrals.bulkCreated', 'Bulk Referrals Created'),
          description: t('services.referrals.bulkCreatedDesc', 'Successfully recorded {count} referrals to {referredTo}.', { count: result.createdCount, referredTo }),
        });
        onSaved();
      } catch (err: any) {
        const msg = err?.response?.data?.message || t('services.referrals.error.create', 'Failed to create bulk referrals');
        toast({ title: t('common.error', 'Error'), description: msg, variant: 'destructive' });
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!selectedParent && !selectedChild) {
      toast({
        title: t('common.error', 'Error'),
        description: t('services.referrals.drawer.selectRecipient', 'Please select a recipient.'),
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const data: CreateReferralData = {
        parentId: targetType === 'PARENT' ? selectedParent!.id : undefined,
        childId: targetType === 'CHILD' ? selectedChild!.id : undefined,
        referredTo: referredTo.trim(),
        referralReason: referralReason.trim() || undefined,
        referralDate,
        status,
        notes: notes.trim() || undefined,
        followUpDate: followUpDate || undefined,
      };

      if (isEdit && referral) {
        await updateReferral(referral.id, {
          referredTo: data.referredTo,
          referralReason: data.referralReason,
          referralDate: data.referralDate,
          status: data.status,
          notes: data.notes,
          followUpDate: data.followUpDate,
        });
        toast({
          title: t('services.referrals.updated', 'Referral Updated'),
          description: t('services.referrals.updatedDesc', 'The referral has been updated successfully.'),
        });
      } else {
        await createReferral(data);
        toast({
          title: t('services.referrals.created', 'Referral Created'),
          description: t('services.referrals.createdDesc', 'The referral has been recorded successfully.'),
        });
      }
      onSaved();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        (isEdit
          ? t('services.referrals.error.update', 'Failed to update referral')
          : t('services.referrals.error.create', 'Failed to create referral'));
      toast({
        title: t('common.error', 'Error'),
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 !mt-0">
      <div
        className={`fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ease-out ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed inset-y-0 right-0 z-50 !mt-0 w-full max-w-xl bg-white dark:bg-neutral-900 shadow-xl flex flex-col transition-transform duration-300 ease-out ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">
            {isEdit
              ? t('services.referrals.drawer.editTitle', 'Edit Referral')
              : t('services.referrals.drawer.title', 'Create Referral')}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Recipient Selection (only in create mode) */}
          {!isEdit && (
            <div className="space-y-4">
              {defaultTargetType && defaultTargetName ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-1">
                      {t('services.referrals.drawer.selectRecipient', 'Select Recipient')}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t('services.referrals.drawer.whoDesc', 'Who is being referred to the external organization?')}
                    </p>
                  </div>
                  <SelectedPersonCard name={defaultTargetName} />
                </div>
              ) : (
              <>
              <div>
                <div className="flex items-center justify-between mb-3 rounded-lg border bg-slate-50/50 p-3 dark:bg-neutral-800/40">
                  <div>
                    <h3 className="font-semibold text-sm">
                      {t('services.referrals.drawer.bulkMode', 'Bulk Referral Selection')}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {t('services.referrals.drawer.bulkModeDesc', 'Refer multiple parents or children at once')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="bulk-referral-switch" className="text-xs font-medium cursor-pointer">
                      {isBulk ? t('services.assign.bulkActive', 'Bulk Active') : t('services.assign.singleActive', 'Single')}
                    </Label>
                    <Switch
                      id="bulk-referral-switch"
                      checked={isBulk}
                      onCheckedChange={(checked) => {
                        setIsBulk(checked);
                        setSelectedParent(null);
                        setSelectedChild(null);
                        setSelectedParentIds([]);
                        setSelectedChildIds([]);
                      }}
                    />
                  </div>
                </div>

                <h3 className="font-semibold mb-1">
                  {t('services.referrals.drawer.selectRecipient', 'Select Recipient')}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('services.referrals.drawer.whoDesc', 'Who is being referred to the external organization?')}
                </p>
              </div>

              {/* Segmented control */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTargetType('PARENT');
                    setSelectedParent(null);
                    setSelectedParentIds([]);
                  }}
                  className={cn(
                    'flex-1 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors',
                    targetType === 'PARENT'
                      ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300'
                      : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800'
                  )}
                >
                  {t('services.assign.parent', 'Parents')} {isBulk && selectedParentIds.length > 0 && `(${selectedParentIds.length})`}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTargetType('CHILD');
                    setSelectedChild(null);
                    setSelectedChildIds([]);
                  }}
                  className={cn(
                    'flex-1 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors',
                    targetType === 'CHILD'
                      ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300'
                      : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800'
                  )}
                >
                  {t('services.assign.child', 'Children')} {isBulk && selectedChildIds.length > 0 && `(${selectedChildIds.length})`}
                </button>
              </div>

              {/* Search parent */}
              {targetType === 'PARENT' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>{t('services.referrals.drawer.searchParent', 'Select Parents')}</Label>
                    <div className="flex items-center gap-2">
                      {isBulk && parents.length > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-primary font-semibold"
                          onClick={() => {
                            const allIds = parents.map((p) => p.id);
                            if (selectedParentIds.length === parents.length) {
                              setSelectedParentIds([]);
                            } else {
                              setSelectedParentIds(allIds);
                            }
                          }}
                        >
                          {selectedParentIds.length === parents.length ? t('common.deselectAll', 'Deselect All') : t('common.selectAll', '+ Select All Visible')}
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          setParentSearch('');
                          fetchParents('', 200);
                        }}
                      >
                        {t('common.listAll', 'List All')}
                      </Button>
                    </div>
                  </div>
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

                  {/* Single mode selection */}
                  {!isBulk && !loadingParents && parents.length > 0 && (
                    <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                      {parents.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedParent(p)}
                          className={cn(
                            'w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors',
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

                  {/* Bulk mode selection */}
                  {isBulk && !loadingParents && parents.length > 0 && (
                    <div className="border rounded-md divide-y max-h-56 overflow-y-auto">
                      {parents.map((p) => {
                        const checked = selectedParentIds.includes(p.id);
                        return (
                          <div
                            key={p.id}
                            onClick={() => {
                              setSelectedParentIds((prev) =>
                                checked ? prev.filter((id) => id !== p.id) : [...prev, p.id]
                              );
                            }}
                            className={cn(
                              'w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors',
                              checked && 'bg-amber-50/60 dark:bg-amber-950/30'
                            )}
                          >
                            {checked ? (
                              <CheckSquare className="h-5 w-5 text-amber-600 flex-shrink-0" />
                            ) : (
                              <Square className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            )}
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">{initials(p.fullName)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium truncate">{p.fullName}</div>
                              <div className="text-xs text-muted-foreground">{p.idTag || p.phone || ''}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {!loadingParents && parents.length === 0 && (
                    <p className="text-sm text-muted-foreground py-2 text-center">
                      {t('services.referrals.drawer.noParents', 'No parents found')}
                    </p>
                  )}
                  {!isBulk && selectedParent && (
                    <SelectedPersonCard name={selectedParent.fullName} />
                  )}
                  {isBulk && selectedParentIds.length > 0 && (
                    <div className="flex items-center gap-2 rounded-md bg-amber-50 p-2.5 dark:bg-amber-950/40 text-xs font-semibold text-amber-800 dark:text-amber-200">
                      <Users className="h-4 w-4 text-amber-600" />
                      <span>{selectedParentIds.length} {t('services.referrals.parentsSelected', 'Parents Selected for Referral')}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Search child */}
              {targetType === 'CHILD' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>{t('services.referrals.drawer.searchChild', 'Select Children')}</Label>
                    <div className="flex items-center gap-2">
                      {isBulk && children.length > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-primary font-semibold"
                          onClick={() => {
                            const allIds = children.map((c) => c.id);
                            if (selectedChildIds.length === children.length) {
                              setSelectedChildIds([]);
                            } else {
                              setSelectedChildIds(allIds);
                            }
                          }}
                        >
                          {selectedChildIds.length === children.length ? t('common.deselectAll', 'Deselect All') : t('common.selectAll', '+ Select All Visible')}
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          setChildSearch('');
                          fetchChildren('', 200);
                        }}
                      >
                        {t('common.listAll', 'List All')}
                      </Button>
                    </div>
                  </div>
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

                  {/* Single mode selection */}
                  {!isBulk && !loadingChildren && children.length > 0 && (
                    <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                      {children.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedChild(c)}
                          className={cn(
                            'w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors',
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

                  {/* Bulk mode selection */}
                  {isBulk && !loadingChildren && children.length > 0 && (
                    <div className="border rounded-md divide-y max-h-56 overflow-y-auto">
                      {children.map((c) => {
                        const checked = selectedChildIds.includes(c.id);
                        return (
                          <div
                            key={c.id}
                            onClick={() => {
                              setSelectedChildIds((prev) =>
                                checked ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                              );
                            }}
                            className={cn(
                              'w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors',
                              checked && 'bg-blue-50/60 dark:bg-blue-950/30'
                            )}
                          >
                            {checked ? (
                              <CheckSquare className="h-5 w-5 text-blue-600 flex-shrink-0" />
                            ) : (
                              <Square className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            )}
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">{initials(c.fullName)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium truncate">{c.fullName}</div>
                              <div className="text-xs text-muted-foreground">{c.parent?.fullName || ''}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {!loadingChildren && children.length === 0 && (
                    <p className="text-sm text-muted-foreground py-2 text-center">
                      {t('services.referrals.drawer.noChildren', 'No children found')}
                    </p>
                  )}
                  {!isBulk && selectedChild && (
                    <SelectedPersonCard name={selectedChild.fullName} />
                  )}
                  {isBulk && selectedChildIds.length > 0 && (
                    <div className="flex items-center gap-2 rounded-md bg-blue-50 p-2.5 dark:bg-blue-950/40 text-xs font-semibold text-blue-800 dark:text-blue-200">
                      <Baby className="h-4 w-4 text-blue-600" />
                      <span>{selectedChildIds.length} {t('services.referrals.childrenSelected', 'Children Selected for Referral')}</span>
                    </div>
                  )}
                </div>
              )}
              </>
            )}
            </div>
          )}

          {/* Show selected recipient in edit mode */}
          {isEdit && (
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {t('services.referrals.table.recipient', 'Recipient')}
              </Label>
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-xs">
                    {initials(
                      referral?.parent?.fullName ||
                        referral?.child?.fullName ||
                        '??'
                    )}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">
                    {referral?.parent?.fullName || referral?.child?.fullName || 'Unknown'}
                  </p>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] mt-0.5',
                      targetType === 'PARENT'
                        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                        : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                    )}
                  >
                    {targetType === 'PARENT'
                      ? t('services.assign.parent', 'Parent')
                      : t('services.assign.child', 'Child')}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="h-px bg-slate-200 dark:bg-neutral-700" />

          {/* Referral Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">
              {t('services.referrals.drawer.title', 'Referral Details')}
            </h3>

            {/* Organization */}
            <div className="space-y-2">
              <Label>
                {t('services.referrals.drawer.referredTo', 'Organization Name')} *
              </Label>
              <Input
                value={referredTo}
                onChange={(e) => setReferredTo(e.target.value)}
                placeholder={t(
                  'services.referrals.drawer.referredToPlaceholder',
                  'e.g. Tikur Anbessa Hospital'
                )}
              />
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label>
                {t('services.referrals.drawer.referralReason', 'Reason for Referral (Optional)')}
              </Label>
              <textarea
                value={referralReason}
                onChange={(e) => setReferralReason(e.target.value)}
                placeholder={t(
                  'services.referrals.drawer.referralReasonPlaceholder',
                  'e.g. Specialist consultation, physiotherapy...'
                )}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  {t('services.referrals.drawer.referralDate', 'Referral Date')} *
                </Label>
                <CalendarDatePicker
                  value={referralDate}
                  onChange={setReferralDate}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  {t('services.referrals.drawer.followUpDate', 'Follow-up Date (Optional)')}
                </Label>
                <CalendarDatePicker
                  value={followUpDate}
                  onChange={setFollowUpDate}
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>
                {t('services.referrals.drawer.status', 'Status')}
              </Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ReferralStatus)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="PENDING">
                  {t('services.referrals.status.pending', 'Pending')}
                </option>
                <option value="CONTACTED">
                  {t('services.referrals.status.contacted', 'Contacted')}
                </option>
                <option value="COMPLETED">
                  {t('services.referrals.status.completed', 'Completed')}
                </option>
                <option value="CANCELLED">
                  {t('services.referrals.status.cancelled', 'Cancelled')}
                </option>
              </select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>
                {t('services.referrals.drawer.notes', 'Notes')} {t('common.optional', '(Optional)')}
              </Label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t(
                  'services.referrals.drawer.notesPlaceholder',
                  'Additional details...'
                )}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex items-center justify-between">
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !canEdit}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit
              ? t('common.save', 'Save Changes')
              : t('services.referrals.new', 'Create Referral')}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SelectedPersonCard({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border bg-white dark:bg-neutral-900 p-3 mt-2">
      <Avatar className="h-9 w-9">
        <AvatarFallback className="text-xs">{initials(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{name}</div>
      </div>
      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 text-[10px]">
        Selected
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
