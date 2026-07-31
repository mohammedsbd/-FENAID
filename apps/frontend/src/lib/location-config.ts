export const ADDIS_ABABA = 'Addis Ababa';

export const SUBCITIES = [
  'Addis Ketema',
  'Akaky Kaliti',
  'Arada',
  'Bole',
  'Gullele',
  'Kirkos',
  'Kolfe Keranio',
  'Lemi Kura',
  'Lideta',
  'Nifas Silk-Lafto',
  'Yeka',
];

export const SUBCITY_WOREDAS: Record<string, string[]> = {
  'Addis Ketema': Array.from({ length: 11 }, (_, i) => `Woreda ${i + 1}`),
  'Akaky Kaliti': Array.from({ length: 13 }, (_, i) => `Woreda ${i + 1}`),
  'Arada': Array.from({ length: 10 }, (_, i) => `Woreda ${i + 1}`),
  'Bole': Array.from({ length: 14 }, (_, i) => `Woreda ${i + 1}`),
  'Gullele': Array.from({ length: 10 }, (_, i) => `Woreda ${i + 1}`),
  'Kirkos': Array.from({ length: 11 }, (_, i) => `Woreda ${i + 1}`),
  'Kolfe Keranio': Array.from({ length: 13 }, (_, i) => `Woreda ${i + 1}`),
  'Lemi Kura': Array.from({ length: 11 }, (_, i) => `Woreda ${i + 1}`),
  'Lideta': Array.from({ length: 10 }, (_, i) => `Woreda ${i + 1}`),
  'Nifas Silk-Lafto': Array.from({ length: 11 }, (_, i) => `Woreda ${i + 1}`),
  'Yeka': Array.from({ length: 13 }, (_, i) => `Woreda ${i + 1}`),
};

export function getWoredaOptions(subcities: string[]): string[] {
  const woredas = subcities.flatMap((s) => SUBCITY_WOREDAS[s] ?? []);
  return Array.from(new Set(woredas));
}
