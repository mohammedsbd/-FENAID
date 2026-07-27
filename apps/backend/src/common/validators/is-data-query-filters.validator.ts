import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

const VALID_SECTIONS = ['child', 'parent', 'location', 'services', 'training', 'financial', 'progress', 'caseWorker'] as const;

const SECTION_FIELD_TYPES: Record<string, Record<string, string>> = {
  child: {
    ageMin: 'number', ageMax: 'number', gender: 'string',
    disabilityType: 'string[]', disabilityCategory: 'string[]',
    severityLevel: 'string[]', communicationAbility: 'string[]',
    schoolEnrollmentStatus: 'string[]', status: 'string[]',
    registeredAfter: 'string', registeredBefore: 'string',
  },
  parent: {
    gender: 'string', financialBracket: 'string[]',
    maritalStatus: 'string[]', employmentStatus: 'string[]',
    referralSource: 'string[]', status: 'string[]',
    numberOfDependentsMin: 'number', numberOfDependentsMax: 'number',
  },
  location: {
    city: 'string', subcities: 'string[]', woreda: 'string',
  },
  services: {
    serviceIds: 'string[]', serviceStatus: 'string[]',
    deliveryMethod: 'string[]', startedAfter: 'string',
    startedBefore: 'string', minSessionsCompleted: 'number',
    hasNoService: 'boolean',
  },
  training: {
    appointmentIds: 'string[]', attendanceStatus: 'string[]',
    minWorkshopsAttended: 'number', attendedAfter: 'string',
    attendedBefore: 'string', hasNeverAttended: 'boolean',
  },
  financial: {
    hasAllocation: 'boolean', allocationStatus: 'string[]',
    purposeKeyword: 'string', minAmount: 'number', maxAmount: 'number',
    disbursedAfter: 'string', disbursedBefore: 'string',
    acknowledgementStatus: 'string',
  },
  progress: {
    minMilestonesAchieved: 'number', specificMilestoneTitle: 'string',
    goalType: 'string[]', goalAchieved: 'boolean',
    lastNoteAfter: 'string', lastNoteBefore: 'string',
    noNoteInLastDays: 'number',
  },
  caseWorker: {
    staffId: 'string', unassigned: 'boolean',
  },
};

export function IsDataQueryFilters(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsDataQueryFilters',
      target: object.constructor,
      propertyName,
      options: validationOptions || { message: 'error.dataQuery.invalidFilterStructure' },
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'object' || value === null) return false;
          const obj = value as Record<string, unknown>;
          for (const key of Object.keys(obj)) {
            if (!(VALID_SECTIONS as readonly string[]).includes(key)) return false;
            const section = obj[key];
            if (typeof section !== 'object' || section === null) continue;
            const fieldTypes = SECTION_FIELD_TYPES[key];
            if (!fieldTypes) return false;
            for (const fieldKey of Object.keys(section as Record<string, unknown>)) {
              if (!(fieldKey in fieldTypes)) return false;
              const fieldValue = (section as Record<string, unknown>)[fieldKey];
              const expectedType = fieldTypes[fieldKey];
              if (fieldValue === undefined || fieldValue === null) continue;
              if (expectedType === 'string[]') {
                if (!Array.isArray(fieldValue)) return false;
                if (!fieldValue.every((v) => typeof v === 'string')) return false;
              } else if (typeof fieldValue !== expectedType) {
                return false;
              }
            }
          }
          return true;
        },
        defaultMessage() {
          return 'error.dataQuery.invalidFilterStructure';
        },
      },
    });
  };
}
