'use client';

import FinanceClient from '@/components/dashboard/funds/finance-client';
import { useLocale } from '@/components/providers/locale-provider';

export default function FundsPage() {
  const { t } = useLocale();
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">{t('funds.title', 'Funds & Donations')}</h2>
      </div>
      <FinanceClient />
    </div>
  );
}
