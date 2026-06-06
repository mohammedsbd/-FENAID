export enum AppointmentType {
  THERAPY = 'THERAPY',
  ASSESSMENT = 'ASSESSMENT',
  WORKSHOP = 'WORKSHOP',
  FUND_DISBURSEMENT = 'FUND_DISBURSEMENT',
  OTHER = 'OTHER',
}

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  EXCUSED = 'EXCUSED',
  RESCHEDULED = 'RESCHEDULED',
}

export interface AttendanceRecord {
  id: string;
  appointmentId: string;
  parentId?: string;
  childId?: string;
  status: AttendanceStatus;
  notes?: string;
  createdAt: string;
  parent?: { fullName: string };
  child?: { fullName: string };
}

export interface Appointment {
  id: string;
  title: string;
  staffId: string;
  childId?: string;
  parentId?: string;
  scheduledAt: string;
  durationMinutes: number;
  type: AppointmentType;
  isRecurring: boolean;
  recurrenceRule?: string;
  status: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
  staff: { id: string; fullName: string };
  child?: { id: string; fullName: string; photoUrl?: string };
  parent?: { id: string; fullName: string; photoUrl?: string };
  attendanceRecords?: AttendanceRecord[];
}
