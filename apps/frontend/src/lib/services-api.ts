import api from './api';

// --- Service Types ---

export interface ServiceDto {
  id: string;
  name: string;
  description: string | null;
  category: string;
  targetType: 'PARENT' | 'CHILD';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  activeAssignmentCount?: number;
}

export interface CreateServiceData {
  name: string;
  description?: string | null;
  category: string;
  targetType: 'PARENT' | 'CHILD';
  isActive?: boolean;
}

export interface UpdateServiceData {
  name?: string;
  description?: string | null;
  category?: string;
  targetType?: 'PARENT' | 'CHILD';
  isActive?: boolean;
}

export interface ListServicesParams {
  targetType?: 'PARENT' | 'CHILD';
  isActive?: boolean;
  search?: string;
}

// --- Assignment Types ---

export interface ServiceAssignmentDto {
  id: string;
  serviceId: string;
  targetType: 'PARENT' | 'CHILD';
  parentId: string | null;
  childId: string | null;
  assignedStaffId: string;
  startDate: string;
  endDate: string | null;
  frequency: 'ONE_TIME' | 'WEEKLY' | 'MONTHLY' | 'ONGOING';
  deliveryMethod: 'ON_SITE' | 'HOME_VISIT' | 'REFERRAL';
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  service?: ServiceDto;
  parent?: { id: string; fullName: string; photoUrl: string | null } | null;
  child?: { id: string; fullName: string; photoUrl: string | null } | null;
  assignedStaff?: { id: string; fullName: string } | null;
}

export interface CreateAssignmentData {
  serviceId: string;
  targetType: 'PARENT' | 'CHILD';
  parentId?: string;
  childId?: string;
  assignedStaffId: string;
  startDate: string;
  endDate?: string;
  frequency: 'ONE_TIME' | 'WEEKLY' | 'MONTHLY' | 'ONGOING';
  deliveryMethod: 'ON_SITE' | 'HOME_VISIT' | 'REFERRAL';
  status?: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
}

export interface UpdateAssignmentData {
  status?: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  endDate?: string;
  deliveryMethod?: 'ON_SITE' | 'HOME_VISIT' | 'REFERRAL';
  frequency?: 'ONE_TIME' | 'WEEKLY' | 'MONTHLY' | 'ONGOING';
}

export interface ListAssignmentsParams {
  status?: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  targetType?: 'PARENT' | 'CHILD';
  assignedStaffId?: string;
  parentId?: string;
  childId?: string;
  page?: number;
  limit?: number;
  search?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

// --- Service APIs ---

export async function getServices(params?: ListServicesParams): Promise<ServiceDto[]> {
  const res = await api.get('/services', { params });
  return res.data;
}

export async function getService(id: string): Promise<ServiceDto> {
  const res = await api.get(`/services/${id}`);
  return res.data;
}

export async function createService(data: CreateServiceData): Promise<ServiceDto> {
  const res = await api.post('/services', data);
  return res.data;
}

export async function updateService(id: string, data: UpdateServiceData): Promise<ServiceDto> {
  const res = await api.patch(`/services/${id}`, data);
  return res.data;
}

export async function deleteService(id: string): Promise<ServiceDto> {
  const res = await api.delete(`/services/${id}`);
  return res.data;
}

// --- Assignment APIs ---

export async function getAssignments(params?: ListAssignmentsParams): Promise<PaginatedResult<ServiceAssignmentDto>> {
  const res = await api.get('/service-assignments', { params });
  return res.data;
}

export async function getAssignment(id: string): Promise<ServiceAssignmentDto> {
  const res = await api.get(`/service-assignments/${id}`);
  return res.data;
}

export async function getAssignmentsByParent(parentId: string): Promise<ServiceAssignmentDto[]> {
  const res = await api.get(`/service-assignments/parent/${parentId}`);
  return res.data;
}

export async function getAssignmentsByChild(childId: string): Promise<ServiceAssignmentDto[]> {
  const res = await api.get(`/service-assignments/child/${childId}`);
  return res.data;
}

export async function createAssignment(data: CreateAssignmentData): Promise<ServiceAssignmentDto> {
  const res = await api.post('/service-assignments', data);
  return res.data;
}

export async function updateAssignment(id: string, data: UpdateAssignmentData): Promise<ServiceAssignmentDto> {
  const res = await api.patch(`/service-assignments/${id}`, data);
  return res.data;
}
