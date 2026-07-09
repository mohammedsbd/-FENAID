'use client';

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  addEthiopianMonths,
  addGregorianMonths,
  CalendarSystem,
  daysInEthiopianMonth,
  daysInGregorianMonth,
  ethiopianMonths,
  ethiopianToGregorian,
  formatCalendarDate,
  gregorianMonths,
  gregorianToEthiopian,
  parseIsoDate,
  toIsoDateInputValue,
} from '@/lib/calendar';
import { cn } from '@/lib/utils';
import { useCalendarSettings } from '@/components/providers/calendar-settings-provider';
import { useLocale } from '@/components/providers/locale-provider';

type CalendarDatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  minYear?: number;
  maxYear?: number;
  className?: string;
};

export function CalendarDatePicker({
  value,
  onChange,
  label,
  placeholder,
  disabled,
  minYear = 1900,
  maxYear = 2100,
  className,
}: CalendarDatePickerProps) {
  const { calendarSystem } = useCalendarSettings();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const resolvedPlaceholder = placeholder ?? t('datePicker.selectDate', 'Select date');
  const [viewIso, setViewIso] = useState(value || todayIso());
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const displayValue = value
    ? formatCalendarDate(value, calendarSystem)
    : resolvedPlaceholder;

  const grid = useMemo(
    () => buildMonthGrid(viewIso, calendarSystem),
    [calendarSystem, viewIso],
  );

  const selectedIso = value ? toIsoDateInputValue(value) : '';

  useEffect(() => {
    if (value) {
      setViewIso(value);
    }
  }, [value]);

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event: MouseEvent) {
      const target = event.target as Node;
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(target) &&
        (!popupRef.current || !popupRef.current.contains(target))
      ) {
        setOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className={cn('relative', className)}>
      {label && <span className="mb-2 block text-sm font-medium">{label}</span>}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-left text-sm ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          !value && 'text-muted-foreground',
        )}
      >
        <span className="truncate">{displayValue}</span>
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
      </button>

      {open && typeof document === 'object' && createPortal(
        <CalendarDatePickerPopup
          grid={grid}
          calendarSystem={calendarSystem}
          selectedIso={selectedIso}
          minYear={minYear}
          maxYear={maxYear}
          wrapperRef={wrapperRef}
          popupRef={popupRef}
          onSelect={(iso) => {
            onChange(iso);
            setViewIso(iso);
            setOpen(false);
          }}
          onClear={() => {
            onChange('');
            setOpen(false);
          }}
          onToday={() => {
            const today = todayIso();
            onChange(today);
            setViewIso(today);
            setOpen(false);
          }}
          onPrevMonth={() =>
            setViewIso(
              calendarSystem === 'ETHIOPIAN'
                ? addEthiopianMonths(viewIso, -1)
                : addGregorianMonths(viewIso, -1),
            )
          }
          onNextMonth={() =>
            setViewIso(
              calendarSystem === 'ETHIOPIAN'
                ? addEthiopianMonths(viewIso, 1)
                : addGregorianMonths(viewIso, 1),
            )
          }
          onYearChange={(year) =>
            setViewIso(setCalendarYearMonth(viewIso, calendarSystem, year, grid.month))
          }
          onMonthChange={(month) =>
            setViewIso(setCalendarYearMonth(viewIso, calendarSystem, grid.year, month))
          }
        />,
        document.body,
      )}
    </div>
  );
}

function CalendarDatePickerPopup({
  grid,
  calendarSystem,
  selectedIso,
  minYear,
  maxYear,
  wrapperRef,
  popupRef,
  onSelect,
  onClear,
  onToday,
  onPrevMonth,
  onNextMonth,
  onYearChange,
  onMonthChange,
}: {
  grid: ReturnType<typeof buildMonthGrid>;
  calendarSystem: CalendarSystem;
  selectedIso: string;
  minYear: number;
  maxYear: number;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  popupRef: React.RefObject<HTMLDivElement>;
  onSelect: (iso: string) => void;
  onClear: () => void;
  onToday: () => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
}) {
  const [style, setStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const popupWidth = Math.min(360, window.innerWidth - 32);
    let left = rect.left;
    let top = rect.bottom + 4;

    if (left + popupWidth > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - popupWidth - 8);
    }

    setStyle({
      position: 'fixed',
      left,
      top,
      zIndex: 100,
    });

    function updatePosition() {
      if (!wrapperRef.current) return;
      const r = wrapperRef.current.getBoundingClientRect();
      let newLeft = r.left;
      let newTop = r.bottom + 4;
      if (newLeft + popupWidth > window.innerWidth - 8) {
        newLeft = Math.max(8, window.innerWidth - popupWidth - 8);
      }
      setStyle({ position: 'fixed', left: newLeft, top: newTop, zIndex: 100 });
    }

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, []);

  useLayoutEffect(() => {
    if (!popupRef.current || !wrapperRef.current) return;
    const popupRect = popupRef.current.getBoundingClientRect();
    if (popupRect.bottom > window.innerHeight - 8) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setStyle(prev => ({
        ...prev,
        top: rect.top - popupRect.height - 4,
      }));
    }
  }, []);

  return (
    <div
      ref={popupRef}
      style={style}
      className="w-[min(360px,calc(100vw-2rem))] rounded-md border bg-white dark:bg-neutral-900 dark:border-neutral-700 p-3 shadow-lg"
    >
      <CalendarDatePickerControls
        grid={grid}
        calendarSystem={calendarSystem}
        selectedIso={selectedIso}
        minYear={minYear}
        maxYear={maxYear}
        onSelect={onSelect}
        onClear={onClear}
        onToday={onToday}
        onPrevMonth={onPrevMonth}
        onNextMonth={onNextMonth}
        onYearChange={onYearChange}
        onMonthChange={onMonthChange}
      />
    </div>
  );
}

function CalendarDatePickerControls({
  grid,
  calendarSystem,
  selectedIso,
  minYear,
  maxYear,
  onSelect,
  onClear,
  onToday,
  onPrevMonth,
  onNextMonth,
  onYearChange,
  onMonthChange,
}: {
  grid: ReturnType<typeof buildMonthGrid>;
  calendarSystem: CalendarSystem;
  selectedIso: string;
  minYear: number;
  maxYear: number;
  onSelect: (iso: string) => void;
  onClear: () => void;
  onToday: () => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
}) {
  const { t, locale } = useLocale();

  const { minYearAdj, maxYearAdj } = useMemo(() => {
    if (calendarSystem === 'ETHIOPIAN') {
      const ethMin = gregorianToEthiopian(new Date(Date.UTC(minYear, 0, 1))).year;
      const ethMax = gregorianToEthiopian(new Date(Date.UTC(maxYear, 11, 31))).year;
      return { minYearAdj: ethMin, maxYearAdj: ethMax };
    }
    return { minYearAdj: minYear, maxYearAdj: maxYear };
  }, [calendarSystem, minYear, maxYear]);

  const years = useMemo(() => {
    let min = minYearAdj;
    let max = maxYearAdj;
    if (grid.year < min) min = grid.year;
    if (grid.year > max) max = grid.year;

    return Array.from({ length: max - min + 1 }, (_, index) => max - index);
  }, [minYearAdj, maxYearAdj, grid.year]);

  const translatedMonths = useMemo(() => {
    if (calendarSystem === 'ETHIOPIAN') {
      return grid.months.map((name, i) => t(`calendar.ethiopianMonth.${i + 1}`, name));
    }
    const fmt = new Intl.DateTimeFormat(locale, { month: 'long' });
    return grid.months.map((_, i) => fmt.format(new Date(Date.UTC(2000, i, 1))));
  }, [calendarSystem, grid.months, locale, t]);

  const translatedTitle = useMemo(() => {
    if (calendarSystem === 'ETHIOPIAN') {
      return `${translatedMonths[grid.month - 1]} ${grid.year} ${t('calendar.ec', 'E.C.')}`;
    }
    return `${translatedMonths[grid.month - 1]} ${grid.year}`;
  }, [calendarSystem, grid.month, grid.year, translatedMonths, t]);

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onPrevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 text-center">
          <p className="text-sm font-semibold">{translatedTitle}</p>
          <p className="text-xs text-muted-foreground">
            {calendarSystem === 'ETHIOPIAN' ? t('datePicker.ethiopian', 'Ethiopian calendar') : t('datePicker.gregorian', 'Gregorian calendar')}
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={grid.year}
          onChange={(event) => onYearChange(Number(event.target.value))}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={grid.month}
          onChange={(event) => onMonthChange(Number(event.target.value))}
        >
          {translatedMonths.map((monthName, index) => (
            <option key={monthName} value={index + 1}>
              {monthName}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted-foreground">
        {t('datePicker.dayHeaders', 'S,M,T,W,T,F,S').split(',').map((day, index) => (
          <div key={`${day}-${index}`} className="h-6 leading-6">
            {day}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {grid.days.map((day, index) =>
          day ? (
            <button
              type="button"
              key={day.iso}
              onClick={() => onSelect(day.iso)}
              className={cn(
                'h-8 rounded-md text-sm transition hover:bg-muted',
                day.iso === selectedIso && 'bg-primary text-primary-foreground hover:bg-primary',
                day.iso === todayIso() && day.iso !== selectedIso && 'border border-primary text-primary',
              )}
            >
              {day.label}
            </button>
          ) : (
            <span key={`empty-${index}`} className="h-8" />
          ),
        )}
      </div>

      <div className="mt-3 flex items-center justify-between border-t pt-3">
        <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={onClear}>
          <X className="h-4 w-4" />
          {t('datePicker.clear', 'Clear')}
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-8 px-2" onClick={onToday}>
          {t('datePicker.today', 'Today')}
        </Button>
      </div>
    </>
  );
}

function buildMonthGrid(viewIso: string, calendarSystem: CalendarSystem) {
  if (calendarSystem === 'ETHIOPIAN') {
    const ethiopian = gregorianToEthiopian(parseIsoDate(viewIso));
    const daysInMonth = daysInEthiopianMonth(ethiopian.year, ethiopian.month);
    const firstIso = toIsoDateInputValue(
      ethiopianToGregorian({
        year: ethiopian.year,
        month: ethiopian.month,
        day: 1,
      }),
    );
    const firstWeekday = parseIsoDate(firstIso).getUTCDay();
    const days = [
      ...Array<null>(firstWeekday).fill(null),
      ...Array.from({ length: daysInMonth }, (_, index) => {
        const day = index + 1;
        return {
          label: String(day),
          iso: toIsoDateInputValue(
            ethiopianToGregorian({
              year: ethiopian.year,
              month: ethiopian.month,
              day,
            }),
          ),
        };
      }),
    ];

    return {
      year: ethiopian.year,
      month: ethiopian.month,
      months: ethiopianMonths,
      title: `${ethiopianMonths[ethiopian.month - 1]} ${ethiopian.year} E.C.`,
      days,
    };
  }

  const viewDate = parseIsoDate(viewIso);
  const year = viewDate.getUTCFullYear();
  const month = viewDate.getUTCMonth() + 1;
  const daysInMonth = daysInGregorianMonth(year, month);
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const days = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      return {
        label: String(day),
        iso: toIsoDateInputValue(new Date(Date.UTC(year, month - 1, day))),
      };
    }),
  ];

  return {
    year,
    month,
    months: gregorianMonths,
    title: `${gregorianMonths[month - 1]} ${year}`,
    days,
  };
}

function setCalendarYearMonth(
  currentIso: string,
  calendarSystem: CalendarSystem,
  year: number,
  month: number,
) {
  if (calendarSystem === 'ETHIOPIAN') {
    const current = gregorianToEthiopian(parseIsoDate(currentIso));
    return toIsoDateInputValue(
      ethiopianToGregorian({
        year,
        month,
        day: Math.min(current.day, daysInEthiopianMonth(year, month)),
      }),
    );
  }

  const current = parseIsoDate(currentIso);
  const day = Math.min(current.getUTCDate(), daysInGregorianMonth(year, month));
  return toIsoDateInputValue(new Date(Date.UTC(year, month - 1, day)));
}

function todayIso() {
  return toIsoDateInputValue(new Date());
}
