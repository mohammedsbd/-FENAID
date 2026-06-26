'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
import { CalendarSystem, formatCalendarDate } from '@/lib/calendar';
import { useCalendarSettings } from '@/components/providers/calendar-settings-provider';
import { useLocale } from '@/components/providers/locale-provider';
import { useToast } from '@/hooks/use-toast';

export function SystemSettingsClient({ role }: { role?: string }) {
  const { calendarSystem, setCalendarSystem, refreshCalendarSettings } = useCalendarSettings();
  const { t } = useLocale();
  const [draftCalendarSystem, setDraftCalendarSystem] = useState<CalendarSystem>(calendarSystem);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setDraftCalendarSystem(calendarSystem);
  }, [calendarSystem]);

  if (role !== 'SUPER_ADMIN') {
    return null;
  }

  async function save() {
    setSaving(true);
    try {
      const response = await api.patch<{ calendarSystem: CalendarSystem }>('/settings/system', {
        calendarSystem: draftCalendarSystem,
      });
      setCalendarSystem(response.data.calendarSystem);
      await refreshCalendarSettings();
      toast({
        title: t('systemSettings.saved', 'Calendar settings saved'),
        description: t('systemSettings.savedDesc', 'System dates now display using {calendar}.', {
          calendar: response.data.calendarSystem === 'ETHIOPIAN' ? t('systemSettings.ethiopian', 'the Ethiopian calendar') : t('systemSettings.gregorian', 'the Gregorian calendar'),
        }),
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('systemSettings.saveFailed', 'Could not save calendar settings'),
        description: error.response?.data?.message || t('systemSettings.saveFailedDesc', 'Try again after checking your permissions.'),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md border bg-muted text-muted-foreground">
            <CalendarDays className="h-5 w-5" />
          </span>
          <div>
            <CardTitle className="text-lg">{t('systemSettings.title', 'System calendar')}</CardTitle>
            <CardDescription>
              {t('systemSettings.description', 'Controls date entry and display across staff pages.')}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-2">
          <CalendarOption
            label={t('systemSettings.gregorian', 'Gregorian')}
            description={t('systemSettings.gregorianDesc', 'Use standard Gregorian dates for staff screens.')}
            checked={draftCalendarSystem === 'GREGORIAN'}
            onClick={() => setDraftCalendarSystem('GREGORIAN')}
          />
          <CalendarOption
            label={t('systemSettings.ethiopian', 'Ethiopian')}
            description={t('systemSettings.ethiopianDesc', 'Use Ethiopian calendar dates for local workflows.')}
            checked={draftCalendarSystem === 'ETHIOPIAN'}
            onClick={() => setDraftCalendarSystem('ETHIOPIAN')}
          />
        </div>

        <div className="rounded-md border bg-muted/40 p-3 text-sm">
          <Label className="text-xs uppercase text-muted-foreground">{t('systemSettings.preview', 'Preview')}</Label>
          <p className="mt-1 font-medium">
            {t('systemSettings.today', 'Today: {date}', { date: formatCalendarDate(new Date(), draftCalendarSystem) })}
          </p>
        </div>

        <Button onClick={save} disabled={saving || draftCalendarSystem === calendarSystem}>
          <Save className="h-4 w-4" />
          {saving ? t('systemSettings.saving', 'Saving...') : t('systemSettings.save', 'Save calendar setting')}
        </Button>
      </CardContent>
    </Card>
  );
}

function CalendarOption({
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
