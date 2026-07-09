'use client';

import { useState } from 'react';
import { Languages, Save, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocale } from '@/components/providers/locale-provider';

export function LanguageSwitcher() {
  const { t, locale, setLocale } = useLocale();
  const [draftLocale, setDraftLocale] = useState(locale);
  const [saving, setSaving] = useState(false);

  const hasChanges = draftLocale !== locale;

  async function handleSave() {
    setSaving(true);
    await setLocale(draftLocale);
    setSaving(false);
  }

  function handleCancel() {
    setDraftLocale(locale);
  }

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
        <div className="grid gap-3 md:grid-cols-3">
          <LanguageOption
            label={t('language.english', 'English')}
            description={t('language.english', 'English')}
            checked={draftLocale === 'en'}
            onClick={() => setDraftLocale('en')}
          />
          <LanguageOption
            label={t('language.amharic', 'Amharic')}
            description="አማርኛ"
            checked={draftLocale === 'am'}
            onClick={() => setDraftLocale('am')}
          />
          <LanguageOption
            label={t('language.oromo', 'Oromo')}
            description="Afaan Oromoo"
            checked={draftLocale === 'om'}
            onClick={() => setDraftLocale('om')}
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button onClick={handleSave} disabled={!hasChanges || saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? t('language.saving', 'Saving...') : t('language.save', 'Save Changes')}
          </Button>
          {hasChanges && (
            <Button variant="ghost" onClick={handleCancel}>
              <RotateCcw className="h-4 w-4 mr-2" />
              {t('language.cancel', 'Cancel')}
            </Button>
          )}
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
        checked ? 'border-primary bg-primary/5 ring-1 ring-primary dark:bg-primary/10' : 'bg-white dark:bg-neutral-950 hover:bg-muted/50 dark:hover:bg-neutral-800 dark:hover:bg-neutral-800'
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
