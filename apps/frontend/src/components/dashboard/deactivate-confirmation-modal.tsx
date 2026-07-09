'use client';

import { Button } from '@/components/ui/button';
import { useLocale } from '@/components/providers/locale-provider';

interface DeactivateConfirmationModalProps {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
}

export function DeactivateConfirmationModal({
  name,
  onConfirm,
  onCancel,
  title: titleProp,
  description,
  confirmLabel: confirmLabelProp,
}: DeactivateConfirmationModalProps) {
  const { t } = useLocale();
  const title = titleProp ?? t('deactivateModal.defaultTitle', "Deactivate Profile?");
  const confirmLabel = confirmLabelProp ?? t('deactivateModal.defaultConfirm', "Deactivate Now");
  const defaultDescription = t('deactivateModal.defaultDescription', 'Are you sure you want to deactivate {name}? This will restrict their access and mark the profile as inactive in the system.', { name });

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto !mt-0 bg-slate-950/30 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="w-full max-w-md rounded-lg bg-white dark:bg-neutral-900 shadow-xl animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-neutral-100">{title}</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-neutral-400">
            {description || defaultDescription}
          </p>
        </div>
        <div className="flex justify-end gap-3 border-t bg-slate-50/50 dark:bg-neutral-800/50 px-6 py-4 rounded-b-lg">
          <Button variant="outline" onClick={onCancel}>
            {t('deactivateModal.cancel', 'Cancel')}
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  </div>
  );
}
