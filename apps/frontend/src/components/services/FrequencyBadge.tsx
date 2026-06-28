'use client';

import { Badge } from '@/components/ui/badge';
import { useLocale } from '@/components/providers/locale-provider';

type ServiceFrequency = 'ONE_TIME' | 'WEEKLY' | 'MONTHLY' | 'ONGOING';

const frequencyLabels: Record<ServiceFrequency, string> = {
  ONE_TIME: 'services.frequency.oneTime',
  WEEKLY: 'services.frequency.weekly',
  MONTHLY: 'services.frequency.monthly',
  ONGOING: 'services.frequency.ongoing',
};

const frequencyFallsbacks: Record<ServiceFrequency, string> = {
  ONE_TIME: 'One Time',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  ONGOING: 'Ongoing',
};

const frequencyConfig: Record<ServiceFrequency, { className: string }> = {
  ONE_TIME: { className: 'bg-slate-100 text-slate-700 border-slate-200' },
  WEEKLY: { className: 'bg-blue-50 text-blue-700 border-blue-200' },
  MONTHLY: { className: 'bg-purple-50 text-purple-700 border-purple-200' },
  ONGOING: { className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

export function FrequencyBadge({ frequency }: { frequency: ServiceFrequency }) {
  const { t } = useLocale();
  const config = frequencyConfig[frequency];
  return (
    <Badge variant="outline" className={`${config.className} text-xs`}>
      {t(frequencyLabels[frequency], frequencyFallsbacks[frequency])}
    </Badge>
  );
}
