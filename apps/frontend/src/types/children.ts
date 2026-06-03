import { format } from 'date-fns';

export type ChildStatus = 'ACTIVE' | 'GRADUATED' | 'TRANSFERRED' | 'INACTIVE' | 'DECEASED';
export type DisabilityType = 'PHYSICAL' | 'INTELLECTUAL' | 'MULTIPLE';
export type SeverityLevel = 'MILD' | 'MODERATE' | 'SEVERE';
export type SchoolEnrollmentStatus = 'ENROLLED' | 'NOT_ENROLLED' | 'GRADUATED';
export type CommunicationAbility = 'VERBAL' | 'NON_VERBAL' | 'ASSISTED';

export type StaffOption = {
  id: string;
  fullName: string;
  role?: string;
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
  parentId: string;
  assignedStaffId: string;
  createdAt: string;
  parent?: {
    id: string;
    fullName: string;
  } | null;
  assignedStaff?: StaffOption | null;
};

export type ChildFormData = {
  fullName: string;
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
  parentId: string;
  assignedStaffId: string;
  internalNotes: string;
  status: ChildStatus;
};

export const emptyChildForm: ChildFormData = {
  fullName: '',
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
  parentId: '',
  assignedStaffId: '',
  internalNotes: '',
  status: 'ACTIVE',
};

export function childToForm(child: any): ChildFormData {
  return {
    fullName: child.fullName || '',
    photoUrl: child.photoUrl || '',
    dateOfBirth: child.dateOfBirth ? format(new Date(child.dateOfBirth), 'yyyy-MM-dd') : '',
    gender: child.gender || '',
    disabilityType: child.disabilityType || 'PHYSICAL',
    disabilityCategory: child.disabilityCategory || '',
    severityLevel: child.severityLevel || 'MILD',
    communicationAbility: child.communicationAbility || 'VERBAL',
    medicalHistory: child.medicalHistory || '',
    medications: child.medications || '',
    schoolEnrollmentStatus: child.schoolEnrollmentStatus || 'NOT_ENROLLED',
    parentId: child.parentId || '',
    assignedStaffId: child.assignedStaffId || '',
    internalNotes: child.internalNotes || '',
    status: child.status || 'ACTIVE',
  };
}

export function formToChildPayload(form: ChildFormData) {
  return {
    ...form,
    fullName: form.fullName.trim(),
    parentId: form.parentId,
    assignedStaffId: form.assignedStaffId,
  };
}
