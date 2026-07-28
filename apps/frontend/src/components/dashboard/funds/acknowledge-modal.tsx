'use client';

import { useState, useEffect } from 'react';
import { X, HandCoins, CheckCircle2, Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { useLocale } from '@/components/providers/locale-provider';
import { useToast } from '@/hooks/use-toast';
import { FundAllocation } from '@/types/finance';

interface AcknowledgeModalProps {
  open: boolean;
  allocation: FundAllocation | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function AcknowledgeModal({ open, allocation, onClose, onSuccess }: AcknowledgeModalProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
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
      await api.post(`/fund-allocations/${allocation.id}/acknowledge`, {
        acknowledged: true,
      });
      toast({ title: t('acknowledgeModal.success', 'Success'), description: t('acknowledgeModal.recorded', 'Parent acknowledgement recorded.') });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to record acknowledgement:', error);
      toast({ title: t('acknowledgeModal.error', 'Error'), description: t('acknowledgeModal.recordFailed', 'Failed to record acknowledgement.'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 !mt-0">
      <div className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200 ease-out ${
        visible ? 'opacity-100' : 'opacity-0'
      }`} onClick={onClose} />
      <div className={`relative w-full max-w-sm bg-background dark:bg-neutral-900 rounded-xl shadow-2xl overflow-hidden transition-all duration-200 ease-out ${
        visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      }`}>
        <div className="p-6">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-accent/10 rounded-full">
              <HandCoins className="w-8 h-8 text-accent" />
            </div>
          </div>
          
          <h3 className="text-lg font-bold text-center mb-2">{t('acknowledgeModal.title', 'Record Acknowledgement')}</h3>
          <p className="text-sm text-muted-foreground text-center mb-6">
            {t('acknowledgeModal.confirmQuestion', 'Has')} <strong>{allocation.parent.fullName}</strong> {t('acknowledgeModal.confirmedReceiving', 'confirmed receiving the')} <strong>{allocation.amount.toLocaleString()} ETB</strong>?
          </p>

          <div className="flex items-start p-3 bg-primary/5 border border-primary/10 rounded-lg mb-6">
            <Info className="w-4 h-4 text-primary mr-2 mt-0.5 shrink-0" />
            <p className="text-[11px] text-primary leading-tight">
              {t('acknowledgeModal.infoText', 'Once both Disbursement and Acknowledgement are recorded, this record will be locked and marked as Verified.')}
            </p>
          </div>

          <div className="flex space-x-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>{t('acknowledgeModal.noCancel', 'No, Cancel')}</Button>
            <Button 
              className="flex-1 bg-accent hover:bg-accent/90 text-white" 
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              {t('acknowledgeModal.yesRecorded', 'Yes, Recorded')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
