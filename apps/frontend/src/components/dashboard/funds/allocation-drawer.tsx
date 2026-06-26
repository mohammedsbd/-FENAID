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

interface AllocationDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AllocationDrawer({ open, onClose, onSuccess }: AllocationDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [parents, setParents] = useState<Parent[]>([]);
  const [search, setSearch] = useState('');
  const [selectedParent, setSelectedParent] = useState<Parent | null>(null);
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const { toast } = useToast();
  const { t } = useLocale();

  useEffect(() => {
    if (open) {
      fetchParents();
    } else {
      resetForm();
    }
  }, [open]);

  async function fetchParents() {
    try {
      const res = await api.get('/parents?status=ACTIVE&limit=1000');
      setParents(res.data?.data || res.data || []);
    } catch (error) {
      console.error('Failed to fetch parents:', error);
      setParents([]);
    }
  }

  function resetForm() {
    setSelectedParent(null);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedParent) {
      toast({ title: t('allocationDrawer.error', 'Error'), description: t('allocationDrawer.selectParent', 'Please select a parent.'), variant: 'destructive' });
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast({ title: t('allocationDrawer.error', 'Error'), description: t('allocationDrawer.enterValidAmount', 'Please enter a valid amount.'), variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      await api.post('/fund-allocations', {
        parentId: selectedParent.id,
        amount: amount.toString(),
        purpose,
        allocationDate: new Date(date).toISOString(),
        notes,
      });
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-background h-full shadow-xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{t('allocationDrawer.title', 'New Fund Allocation')}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-4">
            <Label>{t('allocationDrawer.selectParentLabel', 'Select Parent')}</Label>
            {!selectedParent ? (
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
