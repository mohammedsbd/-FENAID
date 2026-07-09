'use client';

import { useState } from 'react';
import { User, ShieldCheck, History, Activity, Globe, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MyAccountClient } from '@/components/dashboard/my-account-client';
import { SystemSettingsClient } from '@/components/dashboard/system-settings-client';
import { LanguageSwitcher } from '@/components/dashboard/language-switcher';
import { useLocale } from '@/components/providers/locale-provider';

type Tab = 'profile' | 'security' | 'sessions' | 'activity' | 'language' | 'system';

const TAB_ICONS: Record<Tab, typeof User> = {
  profile: User,
  security: ShieldCheck,
  sessions: History,
  activity: Activity,
  language: Globe,
  system: Settings2,
};

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('profile');
  const { t } = useLocale();

  const tabs: { key: Tab; label: string }[] = [
    { key: 'profile', label: t('settings.tab.profile', 'Profile') },
    { key: 'security', label: t('settings.tab.security', 'Security') },
    { key: 'sessions', label: t('settings.tab.sessions', 'Sessions') },
    { key: 'activity', label: t('settings.tab.activity', 'Activity') },
    { key: 'language', label: t('settings.tab.language', 'Language') },
    { key: 'system', label: t('settings.tab.system', 'System') },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('settings.title', 'Settings')}</h1>
        <p className="text-muted-foreground">{t('settings.subtitle', 'Manage your account, language, and system preferences.')}</p>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b">
        {tabs.map(({ key, label }) => {
          const Icon = TAB_ICONS[key];
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors flex items-center gap-2',
                tab === key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </div>

      {(tab === 'profile' || tab === 'security' || tab === 'sessions' || tab === 'activity') && (
        <MyAccountClient tab={tab} />
      )}
      {tab === 'language' && <LanguageSwitcher />}
      {tab === 'system' && <SystemSettingsClient />}
    </div>
  );
}
