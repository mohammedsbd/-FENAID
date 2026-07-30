'use client';

import { useState, useEffect } from 'react';
import { X, Search, User, DollarSign, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useLocale } from '@/components/providers/locale-provider';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import { useToast } from '@/hooks/use-toast';

interface Parent {
  id: string;
  fullName: string;
  photoUrl?: string;
  nationalId: string;
}

interface Child {
  id: string;
  fullName: string;
  photoUrl?: string;
  disabilityType?: string;
}

interface AllocationDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AllocationDrawer({ open, onClose, onSuccess }: AllocationDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [targetType, setTargetType] = useState<'PARENT' | 'CHILD'>('PARENT');
  const [parents, setParents] = useState<Parent[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [search, setSearch] = useState('');
  const [selectedParent, setSelectedParent] = useState<Parent | null>(null);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const { toast } = useToast();
  const { t } = useLocale();

  useEffect(() => {
    if (open) {
      setMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
    } else {
      setVisible(false);
      const timer = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      if (targetType === 'PARENT') fetchParents();
      else fetchChildren();
    } else {
      resetForm();
    }
  }, [open, targetType]);

  async function fetchParents() {
    try {
      const res = await api.get('/parents?status=ACTIVE&limit=1000');
      setParents(res.data?.data || res.data || []);
    } catch (error) {
      console.error('Failed to fetch parents:', error);
      setParents([]);
    }
  }

  async function fetchChildren() {
    try {
      const res = await api.get('/children?status=ACTIVE&limit=1000');
      setChildren(res.data?.data || res.data || []);
    } catch (error) {
      console.error('Failed to fetch children:', error);
      setChildren([]);
    }
  }

  function resetForm() {
    setSelectedParent(null);
    setSelectedChild(null);
    setAmount('');
    setPurpose('');
    setDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setSearch('');
  }

  const filteredParents = Array.isArray(parents)
    ? parents.filter(p =>
        p.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        p.nationalId?.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const filteredChildren = Array.isArray(children)
    ? children.filter(c =>
        c.fullName?.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      toast({ title: t('allocationDrawer.error', 'Error'), description: t('allocationDrawer.enterValidAmount', 'Please enter a valid amount.'), variant: 'destructive' });
      return;
    }
    if (targetType === 'PARENT' && !selectedParent) {
      toast({ title: t('allocationDrawer.error', 'Error'), description: t('allocationDrawer.selectParent', 'Please select a parent.'), variant: 'destructive' });
      return;
    }
    if (targetType === 'CHILD' && !selectedChild) {
      toast({ title: t('allocationDrawer.error', 'Error'), description: t('allocationDrawer.selectChild', 'Please select a child.'), variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        amount: amount.toString(),
        purpose,
        allocationDate: new Date(date).toISOString(),
        notes,
      };
      if (targetType === 'PARENT') payload.parentId = selectedParent!.id;
      else payload.childId = selectedChild!.id;

      await api.post('/fund-allocations', payload);
      toast({ title: t('allocationDrawer.success', 'Success'), description: t('allocationDrawer.recorded', 'Fund allocation recorded successfully.') });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to create allocation:', error);
      toast({ title: t('allocationDrawer.error', 'Error'), description: t('allocationDrawer.recordFailed', 'Failed to record allocation.'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 !mt-0">
      <div className={`fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ease-out ${
        visible ? 'opacity-100' : 'opacity-0'
      }`} onClick={onClose} />
      <div className={`fixed inset-y-0 right-0 w-full max-w-2xl bg-background shadow-xl flex flex-col transition-transform duration-300 ease-out ${
        visible ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{t('allocationDrawer.title', 'New Fund Allocation')}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-2">
            <Label>{t('allocationDrawer.targetType', 'Allocate To')}</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setTargetType('PARENT'); setSelectedParent(null); setSelectedChild(null); setSearch(''); }}
                className={cn(
                  'flex-1 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors',
                  targetType === 'PARENT'
                    ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300'
                    : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800'
                )}
              >
                {t('allocationDrawer.parent', 'Parent')}
              </button>
              <button
                type="button"
                onClick={() => { setTargetType('CHILD'); setSelectedParent(null); setSelectedChild(null); setSearch(''); }}
                className={cn(
                  'flex-1 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors',
                  targetType === 'CHILD'
                    ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300'
                    : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800'
                )}
              >
                {t('allocationDrawer.child', 'Child')}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <Label>{targetType === 'PARENT' ? t('allocationDrawer.selectParentLabel', 'Select Parent') : t('allocationDrawer.selectChildLabel', 'Select Child')}</Label>
            {targetType === 'PARENT' ? (
              !selectedParent ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder={t('allocationDrawer.searchPlaceholder', 'Search by name or ID...')}
                      className="pl-9"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div className="border rounded-md max-h-48 overflow-y-auto bg-muted/20">
                    {filteredParents.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">{t('allocationDrawer.noParents', 'No parents found.')}</div>
                    ) : (
                      filteredParents.map(p => (
                        <div
                          key={p.id}
                          className="flex items-center p-2 hover:bg-muted cursor-pointer border-b last:border-0"
                          onClick={() => setSelectedParent(p)}
                        >
                          <Avatar className="w-8 h-8 mr-3">
                            <AvatarImage src={p.photoUrl} />
                            <AvatarFallback>{p.fullName?.charAt(0) || 'P'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-medium">{p.fullName}</div>
                            <div className="text-xs text-muted-foreground">{p.nationalId}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-primary/5 border-primary/10">
                  <div className="flex items-center">
                    <Avatar className="w-10 h-10 mr-3">
                      <AvatarImage src={selectedParent.photoUrl} />
                      <AvatarFallback>{selectedParent.fullName?.charAt(0) || 'P'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{selectedParent.fullName}</div>
                      <div className="text-xs text-muted-foreground">{selectedParent.nationalId}</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedParent(null)} className="text-primary hover:text-primary/90 hover:bg-primary/10">
                    {t('allocationDrawer.change', 'Change')}
                  </Button>
                </div>
              )
            ) : (
              !selectedChild ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder={t('allocationDrawer.searchChildPlaceholder', 'Search by name...')}
                      className="pl-9"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div className="border rounded-md max-h-48 overflow-y-auto bg-muted/20">
                    {filteredChildren.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">{t('allocationDrawer.noChildren', 'No children found.')}</div>
                    ) : (
                      filteredChildren.map(c => (
                        <div
                          key={c.id}
                          className="flex items-center p-2 hover:bg-muted cursor-pointer border-b last:border-0"
                          onClick={() => setSelectedChild(c)}
                        >
                          <Avatar className="w-8 h-8 mr-3">
                            <AvatarImage src={c.photoUrl} />
                            <AvatarFallback>{c.fullName?.charAt(0) || 'C'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-medium">{c.fullName}</div>
                            {c.disabilityType && <div className="text-xs text-muted-foreground">{c.disabilityType}</div>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-primary/5 border-primary/10">
                  <div className="flex items-center">
                    <Avatar className="w-10 h-10 mr-3">
                      <AvatarImage src={selectedChild.photoUrl} />
                      <AvatarFallback>{selectedChild.fullName?.charAt(0) || 'C'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{selectedChild.fullName}</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedChild(null)} className="text-primary hover:text-primary/90 hover:bg-primary/10">
                    {t('allocationDrawer.change', 'Change')}
                  </Button>
                </div>
              )
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">{t('allocationDrawer.amount', 'Amount (ETB)')}</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  placeholder={t('allocationDrawer.amountPlaceholder', '0.00')}
                  className="pl-9"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">{t('allocationDrawer.allocationDate', 'Allocation Date')}</Label>
              <CalendarDatePicker
                value={date}
                onChange={setDate}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">{t('allocationDrawer.purpose', 'Purpose')}</Label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                id="purpose"
                placeholder={t('allocationDrawer.purposePlaceholder', 'e.g. Monthly Support, School Fees')}
                className="pl-9"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t('allocationDrawer.notes', 'Notes (Optional)')}</Label>
            <textarea
              id="notes"
              className="w-full min-h-[100px] p-3 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={t('allocationDrawer.notesPlaceholder', 'Any additional details...')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </form>

        <div className="p-4 border-t bg-muted/10 flex space-x-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>{t('allocationDrawer.cancel', 'Cancel')}</Button>
          <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {t('allocationDrawer.record', 'Record Allocation')}
          </Button>
        </div>
      </div>
    </div>
  );
}
