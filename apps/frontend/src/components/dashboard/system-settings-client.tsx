'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
import { CalendarSystem, formatCalendarDate } from '@/lib/calendar';
import { useCalendarSettings } from '@/components/providers/calendar-settings-provider';
import { useToast } from '@/hooks/use-toast';

export function SystemSettingsClient({ role }: { role?: string }) {
  const { calendarSystem, setCalendarSystem, refreshCalendarSettings } = useCalendarSettings();
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
        title: 'Calendar settings saved',
        description: `System dates now display using ${response.data.calendarSystem === 'ETHIOPIAN' ? 'the Ethiopian calendar' : 'the Gregorian calendar'}.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Could not save calendar settings',
        description: error.response?.data?.message || 'Try again after checking your permissions.',
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
            <CardTitle className="text-lg">System calendar</CardTitle>
            <CardDescription>
              Controls date entry and display across staff pages.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-2">
          <CalendarOption
            label="Gregorian"
            description="Use standard Gregorian dates for staff screens."
            checked={draftCalendarSystem === 'GREGORIAN'}
            onClick={() => setDraftCalendarSystem('GREGORIAN')}
          />
          <CalendarOption
            label="Ethiopian"
            description="Use Ethiopian calendar dates for local workflows."
            checked={draftCalendarSystem === 'ETHIOPIAN'}
            onClick={() => setDraftCalendarSystem('ETHIOPIAN')}
          />
        </div>

        <div className="rounded-md border bg-muted/40 p-3 text-sm">
          <Label className="text-xs uppercase text-muted-foreground">Preview</Label>
          <p className="mt-1 font-medium">
            Today: {formatCalendarDate(new Date(), draftCalendarSystem)}
          </p>
        </div>

        <Button onClick={save} disabled={saving || draftCalendarSystem === calendarSystem}>
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save calendar setting'}
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
