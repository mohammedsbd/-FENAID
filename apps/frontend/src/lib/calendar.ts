export type CalendarSystem = 'GREGORIAN' | 'ETHIOPIAN';

export type EthiopianDate = {
  year: number;
  month: number;
  day: number;
};

const ETHIOPIAN_EPOCH = 1724221;
const UNIX_EPOCH_JDN = 2440588;
const DAY_MS = 86_400_000;

export const gregorianMonths = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const ethiopianMonths = [
  'Meskerem',
  'Tikimt',
  'Hidar',
  'Tahsas',
  'Tir',
  'Yekatit',
  'Megabit',
  'Miazia',
  'Ginbot',
  'Sene',
  'Hamle',
  'Nehase',
  'Pagume',
];

export function getStoredCalendarSystem(): CalendarSystem {
  if (typeof window === 'undefined') return 'GREGORIAN';

  const stored = window.localStorage.getItem('fikir-calendar-system');
  return stored === 'ETHIOPIAN' ? 'ETHIOPIAN' : 'GREGORIAN';
}

export function storeCalendarSystem(calendarSystem: CalendarSystem) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('fikir-calendar-system', calendarSystem);
}

export function toIsoDateInputValue(value?: string | Date | null) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatCalendarDate(
  value?: string | Date | null,
  calendarSystem: CalendarSystem = getStoredCalendarSystem(),
) {
  const iso = toIsoDateInputValue(value);
  if (!iso) return '';

  const date = parseIsoDate(iso);

  if (calendarSystem === 'ETHIOPIAN') {
    const ethiopian = gregorianToEthiopian(date);
    return `${ethiopianMonths[ethiopian.month - 1]} ${ethiopian.day}, ${ethiopian.year} E.C.`;
  }

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function parseIsoDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function gregorianToEthiopian(date: Date): EthiopianDate {
  const jdn = gregorianToJdn(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );

  let year = Math.floor((4 * (jdn - ETHIOPIAN_EPOCH) + 1463) / 1461);

  while (jdn < ethiopianToJdn(year, 1, 1)) year -= 1;
  while (jdn >= ethiopianToJdn(year + 1, 1, 1)) year += 1;

  const dayOfYear = jdn - ethiopianToJdn(year, 1, 1);
  const month = Math.floor(dayOfYear / 30) + 1;
  const day = (dayOfYear % 30) + 1;

  return { year, month, day };
}

export function ethiopianToGregorian(input: EthiopianDate) {
  const jdn = ethiopianToJdn(input.year, input.month, input.day);
  return jdnToGregorianDate(jdn);
}

export function daysInEthiopianMonth(year: number, month: number) {
  if (month <= 12) return 30;
  return isEthiopianLeapYear(year) ? 6 : 5;
}

export function isEthiopianLeapYear(year: number) {
  return (year + 1) % 4 === 0;
}

export function daysInGregorianMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function addGregorianMonths(value: string, amount: number) {
  const date = parseIsoDate(value);
  const totalMonths = date.getUTCFullYear() * 12 + date.getUTCMonth() + amount;
  const year = Math.floor(totalMonths / 12);
  const month = ((totalMonths % 12) + 12) % 12;
  const day = Math.min(date.getUTCDate(), daysInGregorianMonth(year, month + 1));
  return toIsoDateInputValue(new Date(Date.UTC(year, month, day)));
}

export function addEthiopianMonths(value: string, amount: number) {
  const current = gregorianToEthiopian(parseIsoDate(value));
  const absoluteMonth = current.year * 13 + (current.month - 1) + amount;
  const year = Math.floor(absoluteMonth / 13);
  const month = (absoluteMonth % 13) + 1;
  const day = Math.min(current.day, daysInEthiopianMonth(year, month));
  return toIsoDateInputValue(ethiopianToGregorian({ year, month, day }));
}

function gregorianToJdn(year: number, month: number, day: number) {
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS) + UNIX_EPOCH_JDN;
}

function jdnToGregorianDate(jdn: number) {
  return new Date((jdn - UNIX_EPOCH_JDN) * DAY_MS);
}

function ethiopianToJdn(year: number, month: number, day: number) {
  return (
    ETHIOPIAN_EPOCH +
    365 * (year - 1) +
    Math.floor(year / 4) +
    30 * (month - 1) +
    day -
    1
  );
}
