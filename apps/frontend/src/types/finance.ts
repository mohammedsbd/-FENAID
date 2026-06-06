
export enum FundAllocationStatus {
  ALLOCATED = 'ALLOCATED',
  DISBURSED = 'DISBURSED',
  PARTIALLY_DISBURSED = 'PARTIALLY_DISBURSED',
}

export enum DonorType {
  INDIVIDUAL = 'INDIVIDUAL',
  ORGANIZATION = 'ORGANIZATION',
  ANONYMOUS = 'ANONYMOUS',
}

export interface FundAllocation {
  id: string;
  parentId: string;
  allocatedById: string;
  amount: number;
  currency: string;
  purpose: string;
  allocationDate: string;
  status: FundAllocationStatus;
  receiptUrl?: string;
  parentAcknowledged: boolean;
  acknowledgedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  parent: {
    fullName: string;
    photoUrl?: string;
  };
  allocatedBy: {
    fullName: string;
  };
}

export interface Donation {
  id: string;
  donorName: string;
  donorContact?: string;
  donorType: DonorType;
  amount: number;
  currency: string;
  donationDate: string;
  purpose?: string;
  isRestricted: boolean;
  restrictedToChildId?: string;
  restrictedToServiceId?: string;
  receivedById: string;
  receiptNumber: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  receivedBy: {
    fullName: string;
  };
  restrictedToChild?: {
    fullName: string;
  };
  restrictedToService?: {
    name: string;
  };
}

export interface FinanceSummary {
  totalFundsAllocated: number;
  totalFundsDisbursed: number;
  totalDonationsReceived: number;
}
