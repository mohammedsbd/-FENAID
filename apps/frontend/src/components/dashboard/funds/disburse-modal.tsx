'use client';

import { useState, useEffect } from 'react';
import { X, Upload, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
import { useLocale } from '@/components/providers/locale-provider';
import { useToast } from '@/hooks/use-toast';
import { FundAllocation } from '@/types/finance';

interface DisburseModalProps {
  open: boolean;
  allocation: FundAllocation | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function DisburseModal({ open, allocation, onClose, onSuccess }: DisburseModalProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState('');
  const { toast } = useToast();
  const { t } = useLocale();

  useEffect(() => {
    if (open && allocation) {
      setMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
        });
      });
    } else if (!open) {
      setVisible(false);
      const timer = setTimeout(() => setMounted(false), 200);
      return () => clearTimeout(timer);
    }
  }, [open, allocation]);

  if (!mounted || !allocation) return null;

  async function handleConfirm() {
    if (!allocation) return;
    setLoading(true);
    try {
      await api.patch(`/fund-allocations/${allocation.id}`, {
        status: 'DISBURSED',
        receiptUrl: receiptUrl || 'manual-disbursement', // Fallback if no URL provided
      });
      toast({ title: t('disburseModal.success', 'Success'), description: t('disburseModal.markedAsDisbursed', 'Funds marked as disbursed.') });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to disburse funds:', error);
      toast({ title: t('disburseModal.error', 'Error'), description: t('disburseModal.markFailed', 'Failed to mark as disbursed.'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 !mt-0">
      <div className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200 ease-out ${
        visible ? 'opacity-100' : 'opacity-0'
      }`} onClick={onClose} />
      <div className={`relative w-full max-w-md bg-background rounded-xl shadow-2xl overflow-hidden transition-all duration-200 ease-out ${
        visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      }`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-foreground">{t('disburseModal.title', 'Confirm Disbursement')}</h3>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg mb-6">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-accent mr-3 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-accent">{t('disburseModal.finalAction', 'Final Action Required')}</p>
                <p className="text-xs text-accent/80 mt-1">
                  {t('disburseModal.markingText', 'You are marking')} <strong>{allocation.amount.toLocaleString()} ETB</strong> {t('disburseModal.asDisbursedTo', 'as disbursed to')} <strong>{allocation.parent.fullName}</strong>.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="receipt">{t('disburseModal.receiptLabel', 'Receipt URL / Reference (Optional)')}</Label>
              <div className="relative">
                <Upload className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  id="receipt"
                  placeholder={t('disburseModal.receiptPlaceholder', 'Link to scanned receipt or reference no.')}
                  className="pl-9"
                  value={receiptUrl}
                  onChange={(e) => setReceiptUrl(e.target.value)}
                />
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                {t('disburseModal.proTip', 'Pro tip: Upload the receipt to the documents section first and paste the link here.')}
              </p>
            </div>
          </div>

          <div className="mt-8 flex space-x-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>{t('disburseModal.cancel', 'Cancel')}</Button>
            <Button 
              className="flex-1 bg-primary hover:bg-primary/90 text-white" 
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              {t('disburseModal.confirm', 'Confirm Disbursement')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
