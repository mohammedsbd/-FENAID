'use client';

import { Languages } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocale } from '@/components/providers/locale-provider';
import { t } from '@/lib/i18n';

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md border bg-muted text-muted-foreground">
            <Languages className="h-5 w-5" />
          </span>
          <div>
            <CardTitle className="text-lg">{t('language.title', 'Language')}</CardTitle>
            <CardDescription>
              {t('language.description', 'Choose your preferred language for the system interface.')}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-2">
          <LanguageOption
            label={t('language.english', 'English')}
            description={t('language.english', 'English')}
            checked={locale === 'en'}
            onClick={() => setLocale('en')}
          />
          <LanguageOption
            label={t('language.amharic', 'Amharic')}
            description="አማርኛ"
            checked={locale === 'am'}
            onClick={() => setLocale('am')}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function LanguageOption({
  label,
  description,
  checked,
  onClick,
}: {
  label: string;
  description: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border p-4 text-left transition ${
        checked ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'bg-white hover:bg-muted/50'
      }`}
    >
      <span className="flex items-center gap-2">
        <span
          className={`flex h-4 w-4 items-center justify-center rounded-full border ${
            checked ? 'border-primary' : 'border-muted-foreground'
          }`}
        >
          {checked && <span className="h-2 w-2 rounded-full bg-primary" />}
        </span>
        <span className="text-sm font-semibold">{label}</span>
      </span>
      <span className="mt-2 block text-xs leading-5 text-muted-foreground">
        {description}
      </span>
    </button>
  );
}
