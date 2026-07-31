export const EDUCATION_LEVELS = [
  'NO_FORMAL',
  'PRIMARY',
  'SECONDARY',
  'HIGH_SCHOOL',
  'DIPLOMA',
  'BACHELOR',
  'MASTER',
  'DOCTORATE',
  'VOCATIONAL',
  'OTHER',
];

export const EDUCATION_LEVEL_LABELS: Record<string, string> = {
  NO_FORMAL: 'No Formal Education',
  PRIMARY: 'Primary School',
  SECONDARY: 'Secondary School',
  HIGH_SCHOOL: 'High School',
  DIPLOMA: 'Diploma',
  BACHELOR: "Bachelor's Degree",
  MASTER: "Master's Degree",
  DOCTORATE: 'Doctorate',
  VOCATIONAL: 'Vocational Training',
  OTHER: 'Other',
};

export function getEducationLevelLabel(value: string): string {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, '_');
  return EDUCATION_LEVEL_LABELS[normalized] ?? value;
}
