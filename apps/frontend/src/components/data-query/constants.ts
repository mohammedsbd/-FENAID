import type { DataQueryFilters } from '@fikir/types';

export { SUBCITIES } from '@/lib/location-config';
export { EDUCATION_LEVEL_LABELS, getEducationLevelLabel } from '@/lib/education-config';

export const COLUMN_GROUPS: Record<string, { key: string; label: string }[]> = {
  Child: [
    { key: 'fullName', label: 'Full Name' },
    { key: 'age', label: 'Age' },
    { key: 'gender', label: 'Gender' },
    { key: 'disabilityType', label: 'Disability Type' },
    { key: 'disabilityCategory', label: 'Disability Category' },
    { key: 'severityLevel', label: 'Severity' },
    { key: 'communicationAbility', label: 'Communication Ability' },
    { key: 'schoolEnrollmentStatus', label: 'School Status' },
    { key: 'educationLevel', label: 'Education Level' },
    { key: 'status', label: 'Status' },
    { key: 'registrationDate', label: 'Registration Date' },
    { key: 'assignedCaseWorker', label: 'Assigned Case Worker' },
  ],
  Parent: [
    { key: 'parentFullName', label: 'Full Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'subcity', label: 'Sub-city' },
    { key: 'woreda', label: 'Woreda' },
    { key: 'financialBracket', label: 'Financial Bracket' },
    { key: 'educationLevel', label: 'Education Level' },
    { key: 'employmentStatus', label: 'Employment Status' },
    { key: 'maritalStatus', label: 'Marital Status' },
    { key: 'referralSource', label: 'Referral Source' },
  ],
  Services: [
    { key: 'serviceName', label: 'Service Name' },
    { key: 'serviceStatus', label: 'Service Status' },
    { key: 'startDate', label: 'Start Date' },
    { key: 'endDate', label: 'End Date' },
  ],
  Financial: [
    { key: 'totalAllocated', label: 'Total Allocated' },
    { key: 'totalDisbursed', label: 'Total Disbursed' },
    { key: 'fundPurpose', label: 'Fund Purpose' },
  ],
  Progress: [
    { key: 'milestonesAchievedCount', label: 'Milestones Achieved Count' },
    { key: 'lastProgressNoteDate', label: 'Last Note Date' },
  ],
};

export const DEFAULT_COLUMNS: Record<string, string[]> = {
  CHILD: ['fullName', 'age', 'gender', 'disabilityType', 'severityLevel', 'subcity', 'assignedCaseWorker'],
  PARENT: ['parentFullName', 'phone', 'subcity', 'educationLevel', 'financialBracket', 'status'],
  PARENT_CHILD_PAIR: [
    'childFullName',
    'age',
    'disabilityType',
    'parentFullName',
    'parentPhone',
    'subcity',
    'financialBracket',
  ],
};

export function emptyFilters(): DataQueryFilters {
  return {};
}

export function countSectionFilters(section?: Record<string, unknown>): number {
  if (!section) return 0;
  return Object.values(section).filter((value) => {
    if (value === undefined || value === null || value === '') return false;
    if (Array.isArray(value) && value.length === 0) return false;
    if (typeof value === 'boolean' && value === false) return false;
    return true;
  }).length;
}
