import FinanceClient from '@/components/dashboard/funds/finance-client';
import { t } from '@/lib/i18n';

export const metadata = {
  title: t('funds.metadata.title', 'Funds & Donations | FIKIR'),
  description: t('funds.metadata.description', 'Manage fund allocations and donations'),
};

export default function FundsPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">{t('funds.title', 'Funds & Donations')}</h2>
      </div>
      <FinanceClient />
    </div>
  );
}
