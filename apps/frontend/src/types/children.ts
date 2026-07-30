import { toIsoDateInputValue } from '@/lib/calendar';

export type ChildStatus = 'ACTIVE' | 'GRADUATED' | 'TRANSFERRED' | 'INACTIVE' | 'DECEASED';
export type DisabilityType = 'PHYSICAL' | 'INTELLECTUAL' | 'MULTIPLE';
export type SeverityLevel = 'MILD' | 'MODERATE' | 'SEVERE';
export type SchoolEnrollmentStatus = 'ENROLLED' | 'NOT_ENROLLED' | 'GRADUATED';
export type CommunicationAbility = 'VERBAL' | 'NON_VERBAL' | 'ASSISTED';

export type StaffOption = {
  id: string;
  fullName: string;
  role?: string;
  parentCount?: number;
  childCount?: number;
};

export type SuggestedService = {
  id: string;
  name: string;
  category: string;
  description?: string | null;
};

export type ChildRow = {
  id: string;
  idTag?: string | null;
  fullName: string;
  photoUrl?: string | null;
  dateOfBirth: string;
  disabilityType: DisabilityType;
  disabilityCategory: string;
  severityLevel: SeverityLevel;
  status: ChildStatus;
  assignedStaffId: string;
  createdAt: string;
  parents: Array<{
    parent: {
      id: string;
      fullName: string;
    };
  }>;
  assignedStaff?: StaffOption | null;
};

export type ChildFormData = {
  firstName: string;
  lastName: string;
  photoUrl: string;
  dateOfBirth: string;
  gender: string;
  disabilityType: DisabilityType;
  disabilityCategory: string;
  severityLevel: SeverityLevel;
  communicationAbility: CommunicationAbility;
  medicalHistory: string;
  medications: string;
  schoolEnrollmentStatus: SchoolEnrollmentStatus;
  parentIds: string[];
  assignedStaffId: string;
  internalNotes: string;
  status: ChildStatus;
};

export const emptyChildForm: ChildFormData = {
  firstName: '',
  lastName: '',
  photoUrl: '',
  dateOfBirth: '',
  gender: '',
  disabilityType: 'PHYSICAL',
  disabilityCategory: '',
  severityLevel: 'MILD',
  communicationAbility: 'VERBAL',
  medicalHistory: '',
  medications: '',
  schoolEnrollmentStatus: 'NOT_ENROLLED',
  parentIds: [],
  assignedStaffId: '',
  internalNotes: '',
  status: 'ACTIVE',
};

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = (fullName || '').trim().split(' ');
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') || '' };
}

export function childToForm(child: any): ChildFormData {
  const { firstName, lastName } = splitFullName(child.fullName || '');
  return {
    firstName,
    lastName,
    photoUrl: child.photoUrl || '',
    dateOfBirth: toIsoDateInputValue(child.dateOfBirth),
    gender: child.gender || '',
    disabilityType: child.disabilityType || 'PHYSICAL',
    disabilityCategory: child.disabilityCategory || '',
    severityLevel: child.severityLevel || 'MILD',
    communicationAbility: child.communicationAbility || 'VERBAL',
    medicalHistory: child.medicalHistory || '',
    medications: child.medications || '',
    schoolEnrollmentStatus: child.schoolEnrollmentStatus || 'NOT_ENROLLED',
    parentIds: (child.parents || []).map((cp: any) => cp.parent?.id).filter(Boolean),
    assignedStaffId: child.assignedStaffId || '',
    internalNotes: child.internalNotes || '',
    status: child.status || 'ACTIVE',
  };
}

export function formToChildPayload(form: ChildFormData) {
  return {
    ...form,
    fullName: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
    photoUrl: form.photoUrl || null,
    dateOfBirth: form.dateOfBirth,
    gender: form.gender,
    disabilityType: form.disabilityType,
    disabilityCategory: form.disabilityCategory,
    severityLevel: form.severityLevel,
    communicationAbility: form.communicationAbility,
    medicalHistory: form.medicalHistory || null,
    medications: form.medications || null,
    schoolEnrollmentStatus: form.schoolEnrollmentStatus,
    parentIds: form.parentIds,
    assignedStaffId: form.assignedStaffId,
  };
}
