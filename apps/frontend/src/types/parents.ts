import { toIsoDateInputValue } from '@/lib/calendar';

export type ParentStatus = 'ACTIVE' | 'INACTIVE' | 'UNDER_REVIEW';
export type MembershipStatus = 'PAID' | 'UNPAID';
export type FinancialBracket = 'LOW' | 'MEDIUM' | 'HIGH';
export type MaritalStatus = 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
export type EmploymentStatus = 'EMPLOYED' | 'UNEMPLOYED' | 'SELF_EMPLOYED';

export type StaffOption = {
  id: string;
  fullName: string;
  role?: string;
  parentCount?: number;
  childCount?: number;
};

export type ParentRow = {
  id: string;
  idTag?: string | null;
  fullName: string;
  photoUrl?: string | null;
  nationalId: string;
  phone: string;
  email?: string | null;
  status: ParentStatus;
  membershipFee?: number | null;
  membershipStatus: MembershipStatus;
  financialBracket: FinancialBracket;
  maritalStatus: MaritalStatus;
  assignedStaffId: string;
  createdAt: string;
  assignedStaff?: StaffOption | null;
};

export type ParentFormData = {
  firstName: string;
  lastName: string;
  photoUrl: string;
  dateOfBirth: string;
  gender: string;
  nationalId: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  subcity: string;
  woreda: string;
  maritalStatus: MaritalStatus;
  educationLevel: string;
  referralSource: string;
  employmentStatus: EmploymentStatus;
  financialBracket: FinancialBracket;
  monthlyIncomeRange: string;
  numberOfDependents: string;
  disabledDependents: string;
  nonDisabledDependents: string;
  membershipFee: string;
  membershipStatus: MembershipStatus;
  assignedStaffId: string;
  internalNotes: string;
  status: ParentStatus;
};

export type SuggestedService = {
  id: string;
  name: string;
  category: string;
  description?: string | null;
};

export type ParentDetailResponse = ParentRow & {
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  city?: string;
  subcity?: string;
  woreda?: string;
  educationLevel: string;
  referralSource?: string;
  employmentStatus?: EmploymentStatus;
  numberOfDependents?: number;
  internalNotes?: string | null;
  children: Array<{
    child: {
      id: string;
      fullName: string;
      photoUrl?: string | null;
      dateOfBirth?: string;
      gender?: string;
      disabilityType: string;
      disabilityCategory?: string;
      severityLevel?: string;
      status: string;
    };
  }>;
  serviceAssignments: any[];
  fundAllocations: any[];
  appointments?: any[];
  documents: any[];
};

export const emptyParentForm: ParentFormData = {
  firstName: '',
  lastName: '',
  photoUrl: '',
  dateOfBirth: '',
  gender: '',
  nationalId: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  subcity: '',
  woreda: '',
  maritalStatus: 'MARRIED',
  educationLevel: '',
  referralSource: '',
  employmentStatus: 'UNEMPLOYED',
  financialBracket: 'LOW',
  monthlyIncomeRange: '',
  numberOfDependents: '0',
  disabledDependents: '0',
  nonDisabledDependents: '0',
  membershipFee: '',
  membershipStatus: 'UNPAID',
  assignedStaffId: '',
  internalNotes: '',
  status: 'ACTIVE',
};

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(' ');
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || '';
  return { firstName, lastName };
}

export function parentToForm(parent: ParentDetailResponse): ParentFormData {
  const notes = parseParentNotes(parent.internalNotes || '');
  const { firstName, lastName } = splitFullName(parent.fullName);
  const totalDeps = parent.numberOfDependents ?? 0;
  let disDeps = notes.disabledDependents;
  let nonDisDeps = notes.nonDisabledDependents;

  if (!disDeps && !nonDisDeps) {
    const disabledChildrenCount = parent.children ? parent.children.length : 0;
    const disNum = Math.min(disabledChildrenCount, totalDeps);
    disDeps = String(disNum);
    nonDisDeps = String(Math.max(0, totalDeps - disNum));
  }

  return {
    firstName,
    lastName,
    photoUrl: parent.photoUrl || '',
    dateOfBirth: toIsoDateInputValue(parent.dateOfBirth),
    gender: parent.gender || '',
    nationalId: parent.nationalId,
    phone: parent.phone,
    email: parent.email || '',
    address: parent.address || '',
    city: parent.city || '',
    subcity: parent.subcity || '',
    woreda: parent.woreda || '',
    maritalStatus: parent.maritalStatus || 'SINGLE',
    educationLevel: parent.educationLevel || '',
    referralSource: parent.referralSource || '',
    employmentStatus: parent.employmentStatus || 'UNEMPLOYED',
    financialBracket: parent.financialBracket || 'LOW',
    monthlyIncomeRange: notes.monthlyIncomeRange,
    numberOfDependents: String(totalDeps),
    disabledDependents: disDeps,
    nonDisabledDependents: nonDisDeps,
    membershipFee: parent.membershipFee != null ? String(parent.membershipFee) : '',
    membershipStatus: parent.membershipStatus || 'UNPAID',
    assignedStaffId: parent.assignedStaffId || '',
    internalNotes: notes.internalNotes,
    status: parent.status || 'ACTIVE',
  };
}

export function parseParentNotes(notes: string) {
  const monthlyIncomePrefix = 'Monthly income range:';
  const dependentsBreakdownPrefix = 'Dependents breakdown:';
  let monthlyIncomeRange = '';
  let disabledDependents = '';
  let nonDisabledDependents = '';

  const internalNotes = notes
    .split('\n')
    .filter((line) => {
      if (line.startsWith(monthlyIncomePrefix)) {
        monthlyIncomeRange = line.slice(monthlyIncomePrefix.length).trim();
        return false;
      }
      if (line.startsWith(dependentsBreakdownPrefix)) {
        const str = line.slice(dependentsBreakdownPrefix.length).trim();
        const match = str.match(/(\d+)\s*disabled,\s*(\d+)\s*non-disabled/i);
        if (match) {
          disabledDependents = match[1];
          nonDisabledDependents = match[2];
        }
        return false;
      }

      return true;
    })
    .join('\n')
    .trim();

  return {
    internalNotes,
    monthlyIncomeRange,
    disabledDependents,
    nonDisabledDependents,
  };
}

export function formToParentPayload(form: ParentFormData) {
  const disabledCount = Math.max(0, Number(form.disabledDependents) || 0);
  const nonDisabledCount = Math.max(0, Number(form.nonDisabledDependents) || 0);
  const totalDependents = disabledCount + nonDisabledCount;

  return {
    fullName: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
    photoUrl: form.photoUrl || undefined,
    dateOfBirth: form.dateOfBirth,
    gender: form.gender,
    nationalId: form.nationalId.trim(),
    phone: form.phone.trim(),
    email: form.email.trim() || undefined,
    address: form.address.trim(),
    city: form.city.trim(),
    subcity: form.subcity.trim(),
    woreda: form.woreda.trim(),
    maritalStatus: form.maritalStatus,
    employmentStatus: form.employmentStatus,
    financialBracket: form.financialBracket,
    educationLevel: form.educationLevel.trim(),
    numberOfDependents: totalDependents,
    membershipFee: form.membershipFee ? Number(form.membershipFee) : undefined,
    membershipStatus: form.membershipStatus,
    referralSource: form.referralSource.trim() || undefined,
    status: form.status,
    internalNotes: [
      form.internalNotes.trim(),
      form.monthlyIncomeRange.trim() ? `Monthly income range: ${form.monthlyIncomeRange.trim()}` : '',
      `Dependents breakdown: ${disabledCount} disabled, ${nonDisabledCount} non-disabled`,
    ]
      .filter(Boolean)
      .join('\n'),
    assignedStaffId: form.assignedStaffId,
  };
}
