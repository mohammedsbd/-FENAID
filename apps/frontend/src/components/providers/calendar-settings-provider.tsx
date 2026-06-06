'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import api from '@/lib/api';
import {
  CalendarSystem,
  getStoredCalendarSystem,
  storeCalendarSystem,
} from '@/lib/calendar';

type CalendarSettingsContextValue = {
  calendarSystem: CalendarSystem;
  loading: boolean;
  setCalendarSystem: (calendarSystem: CalendarSystem) => void;
  refreshCalendarSettings: () => Promise<void>;
};

const CalendarSettingsContext = createContext<CalendarSettingsContextValue>({
  calendarSystem: 'GREGORIAN',
  loading: true,
  setCalendarSystem: () => undefined,
  refreshCalendarSettings: async () => undefined,
});

export function CalendarSettingsProvider({ children }: { children: ReactNode }) {
  const [calendarSystem, setCalendarSystemState] = useState<CalendarSystem>('GREGORIAN');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setCalendarSystemState(getStoredCalendarSystem());
  }, []);

  const setCalendarSystem = useCallback((next: CalendarSystem) => {
    setCalendarSystemState(next);
    storeCalendarSystem(next);
  }, []);

  const refreshCalendarSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<{ calendarSystem: CalendarSystem }>('/settings/system');
      setCalendarSystem(response.data.calendarSystem);
    } catch {
      setCalendarSystem(getStoredCalendarSystem());
    } finally {
      setLoading(false);
    }
  }, [setCalendarSystem]);

  useEffect(() => {
    void refreshCalendarSettings();
  }, [refreshCalendarSettings]);

  const value = useMemo(
    () => ({
      calendarSystem,
      loading,
      setCalendarSystem,
      refreshCalendarSettings,
    }),
    [calendarSystem, loading, refreshCalendarSettings, setCalendarSystem],
  );

  return (
    <CalendarSettingsContext.Provider value={value}>
      {children}
    </CalendarSettingsContext.Provider>
  );
}

export function useCalendarSettings() {
  return useContext(CalendarSettingsContext);
}
