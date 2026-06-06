'use client';

import { formatCalendarDate } from '@/lib/calendar';
import { useCalendarSettings } from '@/components/providers/calendar-settings-provider';

export function CalendarDate({ value }: { value?: string | Date | null }) {
  const { calendarSystem } = useCalendarSettings();
  return <>{formatCalendarDate(value, calendarSystem)}</>;
}
