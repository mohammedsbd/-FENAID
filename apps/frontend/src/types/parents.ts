import { toIsoDateInputValue } from '@/lib/calendar';

export type ParentStatus = 'ACTIVE' | 'INACTIVE' | 'UNDER_REVIEW';
export type FinancialBracket = 'LOW' | 'MEDIUM' | 'HIGH';
export type MaritalStatus = 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
export type EmploymentStatus = 'EMPLOYED' | 'UNEMPLOYED' | 'SELF_EMPLOYED';

export type StaffOption = {
  id: string;
  fullName: string;
  role?: string;
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
  financialBracket: FinancialBracket;
  maritalStatus: MaritalStatus;
  assignedStaffId: string;
  createdAt: string;
  assignedStaff?: StaffOption | null;
};

export type ParentFormData = {
  fullName: string;
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
    id: string;
    fullName: string;
    photoUrl?: string | null;
    dateOfBirth?: string;
    gender?: string;
    disabilityType: string;
    disabilityCategory?: string;
    severityLevel?: string;
    status: string;
  }>;
  serviceAssignments: any[];
  fundAllocations: any[];
  appointments?: any[];
  documents: any[];
};

export const emptyParentForm: ParentFormData = {
  fullName: '',
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
  assignedStaffId: '',
  internalNotes: '',
  status: 'ACTIVE',
};

export function parentToForm(parent: ParentDetailResponse): ParentFormData {
  const notes = parseParentNotes(parent.internalNotes || '');

  return {
    fullName: parent.fullName,
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
    numberOfDependents: String(parent.numberOfDependents ?? 0),
    assignedStaffId: parent.assignedStaffId || '',
    internalNotes: notes.internalNotes,
    status: parent.status || 'ACTIVE',
  };
}

export function parseParentNotes(notes: string) {
  const monthlyIncomePrefix = 'Monthly income range:';
  let monthlyIncomeRange = '';
  const internalNotes = notes
    .split('\n')
    .filter((line) => {
      if (line.startsWith(monthlyIncomePrefix)) {
        monthlyIncomeRange = line.slice(monthlyIncomePrefix.length).trim();
        return false;
      }

      return true;
    })
    .join('\n')
    .trim();

  return {
    internalNotes,
    monthlyIncomeRange,
  };
}

export function formToParentPayload(form: ParentFormData) {
  return {
    fullName: form.fullName.trim(),
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
    numberOfDependents: Number(form.numberOfDependents),
    referralSource: form.referralSource.trim() || undefined,
    status: form.status,
    internalNotes: [
      form.internalNotes.trim(),
      form.monthlyIncomeRange.trim() ? `Monthly income range: ${form.monthlyIncomeRange.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    assignedStaffId: form.assignedStaffId,
  };
}
