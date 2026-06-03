export type AccountRole = 'SUPER_ADMIN' | 'CASE_WORKER' | 'VIEWER';
export type AccessLevel = 'FULL' | 'READ_ONLY' | 'NO_ACCESS';
export type PermissionModule =
  | 'ACCOUNTS'
  | 'MY_ACCOUNT'
  | 'AUDIT_LOGS'
  | 'SESSIONS'
  | 'PERMISSIONS'
  | 'PARENTS'
  | 'CHILDREN'
  | 'SERVICES'
  | 'FINANCE'
  | 'APPOINTMENTS'
  | 'DOCUMENTS'
  | 'DASHBOARD'
  | 'REPORTS'
  | 'DONATIONS';

export type AccountRow = {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  photoUrl?: string | null;
  role: AccountRole;
  isActive: boolean;
  mustChangePassword: boolean;
  deletedAt?: string | null;
  createdAt: string;
  lastLoginAt?: string | null;
  _count?: {
    assignedParents: number;
    assignedChildren: number;
    sessions: number;
  };
};

export type SessionRow = {
  id: string;
  tokenId: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  expiresAt: string;
  revokedAt?: string | null;
  lastSeenAt?: string | null;
  createdAt: string;
  staff: {
    id: string;
    fullName: string;
    email: string;
    role: AccountRole;
  };
};

export type AuditLogRow = {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  changes: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  staff?: {
    id: string;
    fullName: string;
    email: string;
    role: AccountRole;
  } | null;
};

export type PermissionRow = {
  role: Exclude<AccountRole, 'SUPER_ADMIN'>;
  module: PermissionModule;
  accessLevel: AccessLevel;
};
