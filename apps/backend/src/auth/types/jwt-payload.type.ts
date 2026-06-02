import { StaffRole } from '@prisma/client';

export interface JwtPayload {
  staffId: string;
  email: string;
  role: StaffRole;
}
