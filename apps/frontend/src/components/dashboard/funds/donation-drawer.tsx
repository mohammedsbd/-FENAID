'use client';

import { useState, useEffect } from 'react';
import { X, Search, User, DollarSign, FileText, Loader2, Tag, Shield, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/components/providers/locale-provider';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import { DonorType } from '@/types/finance';

interface DonationDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DonationDrawer({ open, onClose, onSuccess }: DonationDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [donorName, setDonorName] = useState('');
  const [donorContact, setDonorContact] = useState('');
  const [donorType, setDonorType] = useState<DonorType>(DonorType.INDIVIDUAL);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [purpose, setPurpose] = useState('');
  const [isRestricted, setIsRestricted] = useState(false);
  const [restrictedToChildId, setRestrictedToChildId] = useState('');
  const [restrictedToServiceId, setRestrictedToServiceId] = useState('');
  const [notes, setNotes] = useState('');
  
  const [children, setChildren] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  
  const { toast } = useToast();
  const { t } = useLocale();

  useEffect(() => {
    if (open) {
      setMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
        });
      });
    } else {
      setVisible(false);
      const timer = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      fetchRestrictionOptions();
    } else {
      resetForm();
    }
  }, [open]);

  async function fetchRestrictionOptions() {
    try {
      const [childRes, svcRes] = await Promise.all([
        api.get('/children?status=ACTIVE&limit=1000'),
        api.get('/services?isActive=true'),
      ]);
      // Extract data from paginated response
      setChildren(childRes.data?.data || childRes.data || []);
      setServices(svcRes.data || []);
    } catch (error) {
      console.error('Failed to fetch restriction options:', error);
      setChildren([]);
      setServices([]);
    }
  }

  function resetForm() {
    setDonorName('');
    setDonorContact('');
    setDonorType(DonorType.INDIVIDUAL);
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setPurpose('');
    setIsRestricted(false);
    setRestrictedToChildId('');
    setRestrictedToServiceId('');
    setNotes('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!donorName && donorType !== DonorType.ANONYMOUS) {
      toast({ title: t('donationDrawer.error', 'Error'), description: t('donationDrawer.enterDonorName', 'Please enter donor name.'), variant: 'destructive' });
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast({ title: t('donationDrawer.error', 'Error'), description: t('donationDrawer.enterValidAmount', 'Please enter a valid amount.'), variant: 'destructive' });
      return;
    }
    if (isRestricted && !restrictedToChildId && !restrictedToServiceId) {
      toast({ title: t('donationDrawer.error', 'Error'), description: t('donationDrawer.selectRestriction', 'Please select a child or service for restricted donation.'), variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        donorName: donorType === DonorType.ANONYMOUS ? 'Anonymous' : donorName,
        donorType,
        amount: amount.toString(),
        donationDate: new Date(date).toISOString(),
        isRestricted,
      };

      if (donorContact) payload.donorContact = donorContact;
      if (purpose) payload.purpose = purpose;
      if (notes) payload.notes = notes;
      
      if (isRestricted) {
        if (restrictedToChildId) payload.restrictedToChildId = restrictedToChildId;
        if (restrictedToServiceId) payload.restrictedToServiceId = restrictedToServiceId;
      }

      const res = await api.post('/donations', payload);
      toast({ 
        title: t('donationDrawer.success', 'Success'), 
        description: `${t('donationDrawer.donationRecorded', 'Donation recorded. Receipt:')} ${res.data.receiptNumber}` 
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to record donation:', error);
      const message = error.response?.data?.message || t('donationDrawer.recordFailed', 'Failed to record donation.');
      toast({ 
        title: t('donationDrawer.error', 'Error'), 
        description: Array.isArray(message) ? message[0] : message, 
        variant: 'destructive' 
      });
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
      <div className={`fixed inset-y-0 right-0 w-full max-w-md bg-background shadow-xl flex flex-col transition-transform duration-300 ease-out ${
        visible ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{t('donationDrawer.title', 'Record Donation')}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-4">
            <Label>{t('donationDrawer.donorInformation', 'Donor Information')}</Label>
            <div className="flex gap-2">
              {(['INDIVIDUAL', 'ORGANIZATION', 'ANONYMOUS'] as DonorType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setDonorType(type)}
                  className={`flex-1 py-2 text-xs font-medium rounded-md border transition-all ${
                    donorType === type 
                      ? "bg-primary text-white border-primary shadow-sm" 
                      : "bg-background text-muted-foreground border-input hover:border-primary/20"
                  }`}
                >
                  {t(`enum.donorType.${type.toLowerCase()}`, type)}
                </button>
              ))}
            </div>

            {donorType !== DonorType.ANONYMOUS && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="donorName">{t('donationDrawer.donorName', 'Donor Name')}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      id="donorName"
                      placeholder={t('donationDrawer.donorNamePlaceholder', 'Full name or Company name')}
                      className="pl-9"
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="donorContact">{t('donationDrawer.contactInfo', 'Contact Info (Optional)')}</Label>
                  <Input 
                    id="donorContact"
                    placeholder={t('donationDrawer.contactPlaceholder', 'Phone or Email')}
                    value={donorContact}
                    onChange={(e) => setDonorContact(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">{t('donationDrawer.amount', 'Amount (ETB)')}</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  id="amount"
                  type="number"
                  placeholder={t('donationDrawer.amountPlaceholder', '0.00')}
                  className="pl-9"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">{t('donationDrawer.donationDate', 'Donation Date')}</Label>
              <CalendarDatePicker
                value={date}
                onChange={setDate}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">{t('donationDrawer.purpose', 'Purpose / Fund')}</Label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                id="purpose"
                placeholder={t('donationDrawer.purposePlaceholder', 'e.g. General Fund, Ramadan 2024')}
                className="pl-9"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              />
            </div>
          </div>

          <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-amber-600" />
                <Label className="cursor-pointer" htmlFor="restricted">{t('donationDrawer.restrictedDonation', 'Restricted Donation')}</Label>
              </div>
              <input 
                id="restricted"
                type="checkbox"
                checked={isRestricted}
                onChange={(e) => setIsRestricted(e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
            </div>

            {isRestricted && (
              <div className="space-y-3 animate-in fade-in duration-200">
                <div className="space-y-2">
                  <Label className="text-xs">{t('donationDrawer.restrictedToChild', 'Restricted to Child (Optional)')}</Label>
                  <select 
                    className="w-full text-sm border rounded-md p-2 bg-background"
                    value={restrictedToChildId}
                    onChange={(e) => {
                      setRestrictedToChildId(e.target.value);
                      if (e.target.value) setRestrictedToServiceId('');
                    }}
                  >
                    <option value="">{t('donationDrawer.selectChild', '-- Select Child --')}</option>
                    {Array.isArray(children) && children.map(c => <option key={c.id} value={c.id}>{c.fullName}</option>)}
                  </select>
                </div>
                <div className="text-center text-xs text-muted-foreground">{t('donationDrawer.or', 'OR')}</div>
                <div className="space-y-2">
                  <Label className="text-xs">{t('donationDrawer.restrictedToService', 'Restricted to Service (Optional)')}</Label>
                  <select 
                    className="w-full text-sm border rounded-md p-2 bg-background"
                    value={restrictedToServiceId}
                    onChange={(e) => {
                      setRestrictedToServiceId(e.target.value);
                      if (e.target.value) setRestrictedToChildId('');
                    }}
                  >
                    <option value="">{t('donationDrawer.selectService', '-- Select Service --')}</option>
                    {Array.isArray(services) && services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t('donationDrawer.internalNotes', 'Internal Notes (Optional)')}</Label>
            <textarea 
              id="notes"
              className="w-full min-h-[80px] p-3 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={t('donationDrawer.notesPlaceholder', 'Any additional details...')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </form>

        <div className="p-4 border-t bg-muted/10 flex space-x-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>{t('donationDrawer.cancel', 'Cancel')}</Button>
          <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {t('donationDrawer.recordDonation', 'Record Donation')}
          </Button>
        </div>
      </div>
    </div>
  );
}
