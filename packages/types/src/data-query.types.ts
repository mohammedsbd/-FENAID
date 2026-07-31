export interface DataQueryFilters {
  child?: {
    ageMin?: number;
    ageMax?: number;
    gender?: string;
    disabilityType?: string[];
    disabilityCategory?: string[];
    severityLevel?: string[];
    communicationAbility?: string[];
    schoolEnrollmentStatus?: string[];
    status?: string[];
    registeredAfter?: string;
    registeredBefore?: string;
  };
  parent?: {
    gender?: string;
    financialBracket?: string[];
    educationLevel?: string[];
    maritalStatus?: string[];
    employmentStatus?: string[];
    referralSource?: string[];
    status?: string[];
    numberOfDependentsMin?: number;
    numberOfDependentsMax?: number;
  };
  location?: {
    city?: string;
    subcities?: string[];
    woreda?: string;
  };
  services?: {
    serviceIds?: string[];
    serviceStatus?: string[];
    deliveryMethod?: string[];
    startedAfter?: string;
    startedBefore?: string;
    minSessionsCompleted?: number;
    hasNoService?: boolean;
  };
  training?: {
    appointmentIds?: string[];
    attendanceStatus?: string[];
    minWorkshopsAttended?: number;
    attendedAfter?: string;
    attendedBefore?: string;
    hasNeverAttended?: boolean;
  };
  financial?: {
    hasAllocation?: boolean;
    allocationStatus?: string[];
    purposeKeyword?: string;
    minAmount?: number;
    maxAmount?: number;
    disbursedAfter?: string;
    disbursedBefore?: string;
    acknowledgementStatus?: string;
  };
  progress?: {
    minMilestonesAchieved?: number;
    specificMilestoneTitle?: string;
    goalType?: string[];
    goalAchieved?: boolean;
    lastNoteAfter?: string;
    lastNoteBefore?: string;
    noNoteInLastDays?: number;
  };
  caseWorker?: {
    staffId?: string;
    unassigned?: boolean;
  };
}

export interface DataQueryRequest {
  dataSubject: 'CHILD' | 'PARENT' | 'PARENT_CHILD_PAIR';
  filters: DataQueryFilters;
  columns: string[];
  anonymize?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  format?: 'excel' | 'pdf' | 'anonymized_excel' | 'anonymized_pdf';
}

export interface QuerySummary {
  total: number;
  byGender?: { male: number; female: number };
  byDisabilityType?: Array<{ type: string; count: number }>;
  bySubcity?: Array<{ subcity: string; count: number }>;
  bySeverity?: Array<{ level: string; count: number }>;
  byStatus?: Array<{ status: string; count: number }>;
  byFinancialBracket?: Array<{ bracket: string; count: number }>;
}

export interface DataQueryResponse {
  total: number;
  page: number;
  pageSize: number;
  pages: number;
  summary: QuerySummary;
  results: Record<string, unknown>[];
}
