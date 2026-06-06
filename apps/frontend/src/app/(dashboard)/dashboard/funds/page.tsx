import FinanceClient from '@/components/dashboard/funds/finance-client';

export const metadata = {
  title: 'Funds & Donations | FIKIR',
  description: 'Manage fund allocations and donations',
};

export default function FundsPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Funds & Donations</h2>
      </div>
      <FinanceClient />
    </div>
  );
}
