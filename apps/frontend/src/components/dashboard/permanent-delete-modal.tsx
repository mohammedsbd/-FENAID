'use client';

import { AlertTriangle, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useLocale } from '@/components/providers/locale-provider';

interface PermanentDeleteModalProps {
  name: string;
  /** What else disappears with the record, e.g. "progress notes, goals and documents". */
  relatedSummary?: string;
  deleting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation for deletes that cannot be undone. Deactivating is reversible
 * and uses DeactivateConfirmationModal instead — this one is for erasing.
 */
export function PermanentDeleteModal({
  name,
  relatedSummary,
  deleting = false,
  onConfirm,
  onCancel,
}: PermanentDeleteModalProps) {
  const { t } = useLocale();

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto !mt-0 bg-slate-950/40 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="w-full max-w-md rounded-lg bg-white shadow-xl animate-in fade-in zoom-in duration-200 dark:bg-neutral-900">
          <div className="p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-neutral-100">
                  {t('permanentDelete.title', 'Delete permanently?')}
                </h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-neutral-400">
                  {t(
                    'permanentDelete.description',
                    '{name} will be erased from the system for good. This cannot be undone.',
                    { name },
                  )}
                </p>
                {relatedSummary && (
                  <p className="mt-2 text-sm text-slate-500 dark:text-neutral-400">
                    {t('permanentDelete.relatedIntro', 'This also removes their')} {relatedSummary}.
                  </p>
                )}
                <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                  {t(
                    'permanentDelete.hint',
                    'To keep the record but take it out of use, deactivate it instead.',
                  )}
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 rounded-b-lg border-t bg-slate-50/50 px-6 py-4 dark:bg-neutral-800/50">
            <Button variant="outline" onClick={onCancel} disabled={deleting}>
              {t('permanentDelete.cancel', 'Cancel')}
            </Button>
            <Button variant="destructive" onClick={onConfirm} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('permanentDelete.deleting', 'Deleting...')}
                </>
              ) : (
                t('permanentDelete.confirm', 'Delete permanently')
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
