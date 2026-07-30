export const DISABILITY_BY_TYPE = {
  PHYSICAL: {
    categories: [
      'Mobility Impairment',
      'Visual Impairment',
      'Hearing Impairment',
      'Speech Impairment',
      'Fine Motor Delay',
      'Gross Motor Delay',
      'Other',
    ] as string[],
    severities: ['MILD', 'MODERATE', 'SEVERE'] as string[],
    communications: ['VERBAL', 'NON_VERBAL', 'ASSISTED'] as string[],
  },
  INTELLECTUAL: {
    categories: [
      'Autism',
      'Down Syndrome',
      'Developmental Delay',
      'Learning Disability',
      'Intellectual Disability',
      'Other',
    ] as string[],
    severities: ['MILD', 'MODERATE', 'SEVERE'] as string[],
    communications: ['VERBAL', 'NON_VERBAL', 'ASSISTED'] as string[],
  },
  MULTIPLE: {
    categories: [
      'Multiple Disabilities',
      'Other',
    ] as string[],
    severities: ['MILD', 'MODERATE', 'SEVERE'] as string[],
    communications: ['NON_VERBAL', 'ASSISTED'] as string[],
  },
} as const;

export function getDisabilityConfig(type: string | undefined) {
  if (!type || !(type in DISABILITY_BY_TYPE)) return null;
  return DISABILITY_BY_TYPE[type as keyof typeof DISABILITY_BY_TYPE];
}

export function getCategoryOptions(type: string | undefined): string[] {
  return getDisabilityConfig(type)?.categories ?? [];
}

export function getSeverityOptions(type: string | undefined): string[] {
  return getDisabilityConfig(type)?.severities ?? [];
}

export function getCommunicationOptions(type: string | undefined): string[] {
  return getDisabilityConfig(type)?.communications ?? [];
}

export const ALL_CATEGORIES = Array.from(
  new Set(
    Object.values(DISABILITY_BY_TYPE).flatMap(c => c.categories)
  )
);

export const ALL_SEVERITIES = Array.from(
  new Set(
    Object.values(DISABILITY_BY_TYPE).flatMap(c => c.severities)
  )
);

export const ALL_COMMUNICATIONS = Array.from(
  new Set(
    Object.values(DISABILITY_BY_TYPE).flatMap(c => c.communications)
  )
);
