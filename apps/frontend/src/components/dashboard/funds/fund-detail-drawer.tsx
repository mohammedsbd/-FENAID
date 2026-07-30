'use client';

import { useState, useEffect } from 'react';
import { X, DollarSign, User, FileText, Calendar, CheckCircle2, XCircle, Fingerprint, Clock, Archive, HandCoins, ShieldCheck, AlertCircle, Building2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FundAllocation, Donation } from '@/types/finance';
import { useLocale } from '@/components/providers/locale-provider';
import { format } from 'date-fns';

interface FundDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  allocation?: FundAllocation | null;
  donation?: Donation | null;
}

export function FundDetailDrawer({ open, onClose, allocation, donation }: FundDetailDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
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

  if (!mounted) return null;

  const isAllocation = !!allocation;
  const data = allocation || donation;
  if (!data) return null;

  return (
    <div className="fixed inset-0 z-50 !mt-0">
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ease-out ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed inset-y-0 right-0 w-full max-w-xl bg-background shadow-xl flex flex-col transition-transform duration-300 ease-out ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {isAllocation
              ? t('fundDetail.allocationTitle', 'Fund Allocation Details')
              : t('fundDetail.donationTitle', 'Donation Details')}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Header Card */}
          <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/20">
            <div className={`p-3 rounded-full ${isAllocation ? 'bg-primary/10' : 'bg-accent/10'}`}>
              {isAllocation ? (
                <DollarSign className="w-6 h-6 text-primary" />
              ) : (
                <HandCoins className="w-6 h-6 text-accent" />
              )}
            </div>
            <div>
              <p className="text-2xl font-bold">
                {allocation?.amount.toLocaleString() || donation?.amount.toLocaleString()} ETB
              </p>
              <p className="text-sm text-muted-foreground">
                {allocation?.purpose || donation?.purpose || t('fundDetail.noPurpose', 'No purpose specified')}
              </p>
            </div>
            {isAllocation && allocation && (
              <Badge
                variant={allocation.status === 'DISBURSED' ? 'default' : 'outline'}
                className="ml-auto"
              >
                {t(`enum.allocationStatus.${allocation.status.toLowerCase()}`, allocation.status)}
              </Badge>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            {isAllocation && allocation ? (
              <>
                <div className="space-y-1 p-3 border rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                    <User className="w-3 h-3" /> {t('fundDetail.parent', 'Parent')}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar className="w-7 h-7">
                      <AvatarImage src={allocation.parent.photoUrl} />
                      <AvatarFallback>{allocation.parent.fullName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-semibold">{allocation.parent.fullName}</span>
                  </div>
                </div>

                <div className="space-y-1 p-3 border rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                    <Fingerprint className="w-3 h-3" /> {t('fundDetail.allocationId', 'Allocation ID')}
                  </p>
                  <p className="text-sm font-mono font-semibold mt-1">{allocation.id.slice(0, 8)}...</p>
                </div>

                <div className="space-y-1 p-3 border rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {t('fundDetail.date', 'Allocation Date')}
                  </p>
                  <p className="text-sm font-semibold mt-1">{format(new Date(allocation.allocationDate), 'MMM d, yyyy')}</p>
                </div>

                <div className="space-y-1 p-3 border rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                    <User className="w-3 h-3" /> {t('fundDetail.allocatedBy', 'Allocated By')}
                  </p>
                  <p className="text-sm font-semibold mt-1">{allocation.allocatedBy?.fullName || t('fundDetail.unknown', 'Unknown')}</p>
                </div>

                <div className="space-y-1 p-3 border rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                    {allocation.parentAcknowledged ? (
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                    ) : (
                      <XCircle className="w-3 h-3 text-muted-foreground" />
                    )}
                    {t('fundDetail.acknowledgement', 'Acknowledgement')}
                  </p>
                  <p className="text-sm font-semibold mt-1">
                    {allocation.parentAcknowledged
                      ? `${t('fundDetail.acknowledged', 'Acknowledged')}${allocation.acknowledgedAt ? ` (${format(new Date(allocation.acknowledgedAt), 'MMM d, yyyy')})` : ''}`
                      : t('fundDetail.pendingAcknowledgement', 'Pending acknowledgement')}
                  </p>
                </div>

                <div className="space-y-1 p-3 border rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                    <Archive className="w-3 h-3" /> {t('fundDetail.amount', 'Amount')}
                  </p>
                  <p className="text-sm font-semibold mt-1">{allocation.amount.toLocaleString()} {allocation.currency || 'ETB'}</p>
                </div>

                {allocation.childId && (
                  <div className="space-y-1 p-3 border rounded-lg col-span-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                      <User className="w-3 h-3" /> {t('fundDetail.child', 'Child')}
                    </p>
                    <p className="text-sm font-semibold mt-1">{t('fundDetail.childAllocation', 'This allocation is linked to a specific child')}</p>
                  </div>
                )}
              </>
            ) : donation ? (
              <>
                <div className="space-y-1 p-3 border rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> {t('fundDetail.donorName', 'Donor Name')}
                  </p>
                  <p className="text-sm font-semibold mt-1">{donation.donorName}</p>
                </div>

                <div className="space-y-1 p-3 border rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                    <Fingerprint className="w-3 h-3" /> {t('fundDetail.receiptNo', 'Receipt No.')}
                  </p>
                  <p className="text-sm font-mono font-semibold mt-1">{donation.receiptNumber}</p>
                </div>

                <div className="space-y-1 p-3 border rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {t('fundDetail.date', 'Date')}
                  </p>
                  <p className="text-sm font-semibold mt-1">{format(new Date(donation.donationDate), 'MMM d, yyyy')}</p>
                </div>

                <div className="space-y-1 p-3 border rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                    <User className="w-3 h-3" /> {t('fundDetail.receivedBy', 'Received By')}
                  </p>
                  <p className="text-sm font-semibold mt-1">{donation.receivedBy?.fullName || t('fundDetail.system', 'System')}</p>
                </div>

                <div className="space-y-1 p-3 border rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                    <HandCoins className="w-3 h-3" /> {t('fundDetail.donorType', 'Donor Type')}
                  </p>
                  <Badge variant="outline" className="mt-1 w-fit text-[10px] uppercase tracking-wider">
                    {t(`enum.donorType.${donation.donorType.toLowerCase()}`, donation.donorType)}
                  </Badge>
                </div>

                <div className="space-y-1 p-3 border rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                    {donation.isRestricted ? (
                      <AlertCircle className="w-3 h-3 text-accent" />
                    ) : (
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                    )}
                    {t('fundDetail.restriction', 'Restriction')}
                  </p>
                  <p className="text-sm font-semibold mt-1">
                    {donation.isRestricted
                      ? `${t('fundDetail.restricted', 'Restricted')} — ${donation.restrictedToChild?.fullName || donation.restrictedToService?.name || t('fundDetail.unknown', 'Unknown')}`
                      : t('fundDetail.unrestricted', 'Unrestricted')}
                  </p>
                </div>

                <div className="space-y-1 p-3 border rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                    <Archive className="w-3 h-3" /> {t('fundDetail.amount', 'Amount')}
                  </p>
                  <p className="text-sm font-semibold mt-1">{donation.amount.toLocaleString()} {donation.currency || 'ETB'}</p>
                </div>

                {donation.donorContact && (
                  <div className="space-y-1 p-3 border rounded-lg col-span-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> {t('fundDetail.donorContact', 'Donor Contact')}
                    </p>
                    <p className="text-sm font-semibold mt-1">{donation.donorContact}</p>
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* Notes */}
          {allocation?.notes || donation?.notes ? (
            <div className="space-y-2 p-4 border rounded-lg">
              <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
                <FileText className="w-3 h-3" /> {t('fundDetail.notes', 'Notes')}
              </p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{allocation?.notes || donation?.notes}</p>
            </div>
          ) : null}

          {/* Timestamps */}
          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/10 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>
                {t('fundDetail.created', 'Created')}: {format(new Date(data.createdAt), 'MMM d, yyyy HH:mm')}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Archive className="w-3 h-3" />
              <span>
                {t('fundDetail.updated', 'Updated')}: {format(new Date(data.updatedAt), 'MMM d, yyyy HH:mm')}
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 border-t bg-muted/10">
          <Button variant="outline" className="w-full" onClick={onClose}>
            {t('fundDetail.close', 'Close')}
          </Button>
        </div>
      </div>
    </div>
  );
}
