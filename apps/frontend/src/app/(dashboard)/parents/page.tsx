'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Upload,
  UserMinus,
  X,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import api from '@/lib/api';
import { getSession } from '@/lib/auth';
import { cn } from '@/lib/utils';

type ParentStatus = 'ACTIVE' | 'INACTIVE' | 'UNDER_REVIEW';
type FinancialBracket = 'LOW' | 'MEDIUM' | 'HIGH';
type MaritalStatus = 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
type EmploymentStatus = 'EMPLOYED' | 'UNEMPLOYED' | 'SELF_EMPLOYED';

type StaffOption = {
  id: string;
  fullName: string;
  role?: string;
};

type ParentRow = {
  id: string;
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

type ParentFormData = {
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

type SuggestedService = {
  id: string;
  name: string;
  category: string;
  description?: string | null;
};

type ParentDetailResponse = ParentRow & {
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  city?: string;
  subcity?: string;
  woreda?: string;
  educationLevel?: string;
  referralSource?: string;
  employmentStatus?: EmploymentStatus;
  numberOfDependents?: number;
  internalNotes?: string | null;
};

const emptyForm: ParentFormData = {
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

const statusOptions: ParentStatus[] = ['ACTIVE', 'UNDER_REVIEW', 'INACTIVE'];
const bracketOptions: FinancialBracket[] = ['LOW', 'MEDIUM', 'HIGH'];
const maritalOptions: MaritalStatus[] = ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'];
const employmentOptions: EmploymentStatus[] = ['EMPLOYED', 'UNEMPLOYED', 'SELF_EMPLOYED'];

const steps = [
  'Personal Info',
  'Location & Background',
  'Financial & Social',
  'Assignment & Notes',
];

export default function ParentsPage() {
  const [parents, setParents] = useState<ParentRow[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
  const [financialBracket, setFinancialBracket] = useState('');
  const [assignedStaffId, setAssignedStaffId] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingParent, setEditingParent] = useState<ParentRow | null>(null);
  const [suggestedServices, setSuggestedServices] = useState<SuggestedService[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    const timeout = globalThis.setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search);
    }, 300);

    return () => globalThis.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    fetchParents();
  }, [debouncedSearch, status, financialBracket, assignedStaffId, page]);

  useEffect(() => {
    const session = getSession();
    if (session) {
      setStaff([{ id: session.id, fullName: session.fullName, role: session.role }]);
    }

    const fetchStaff = async () => {
      try {
        const res = await api.get('/dashboard/admin');
        const options = (res.data.caseWorkerWorkload || []).map(
          (worker: { staffId: string; staffName: string }) => ({
            id: worker.staffId,
            fullName: worker.staffName,
          }),
        );
        if (options.length) {
          setStaff(options);
        }
      } catch {
        // Non-admins can still assign to themselves from the current session.
      }
    };

    fetchStaff();
  }, []);

  const staffOptions = useMemo(() => {
    const fromParents = parents
      .map((parent) => parent.assignedStaff)
      .filter((worker): worker is StaffOption => Boolean(worker?.id));
    const unique = new Map<string, StaffOption>();
    [...staff, ...fromParents].forEach((worker) => unique.set(worker.id, worker));
    return [...unique.values()];
  }, [parents, staff]);

  async function fetchParents() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/parents', {
        params: {
          page,
          limit: 10,
          search: debouncedSearch || undefined,
          status: status || undefined,
          financialBracket: financialBracket || undefined,
          assignedStaffId: assignedStaffId || undefined,
        },
      });
      setParents(res.data.data || []);
      setPages(res.data.meta?.pages || 1);
      setTotal(res.data.meta?.total || 0);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load parents.'));
    } finally {
      setLoading(false);
    }
  }

  function openNewDrawer() {
    setEditingParent(null);
    setDrawerOpen(true);
  }

  async function openEditDrawer(parent: ParentRow) {
    setEditingParent(parent);
    setDrawerOpen(true);
  }

  async function deactivateParent(parent: ParentRow) {
    if (!globalThis.confirm(`Deactivate ${parent.fullName}?`)) return;

    try {
      await api.delete(`/parents/${parent.id}`);
      fetchParents();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to deactivate parent.'));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Parents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Search, filter, register, and manage parent records.
          </p>
        </div>
        <Button onClick={openNewDrawer} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Register New Parent
        </Button>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(350px,1fr)_160px_160px_200px_auto] lg:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="parent-search" className="text-sm font-semibold">Search Parents</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/70" />
                <Input
                  id="parent-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name or National ID..."
                  className="h-12 pl-10 pr-10 text-base shadow-sm focus-visible:ring-primary"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-slate-100 hover:text-foreground transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <FilterSelect label="Status" value={status} onChange={setStatus}>
              <option value="">All statuses</option>
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {formatEnum(option)}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              label="Financial Bracket"
              value={financialBracket}
              onChange={setFinancialBracket}
            >
              <option value="">All brackets</option>
              {bracketOptions.map((option) => (
                <option key={option} value={option}>
                  {formatEnum(option)}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              label="Assigned Case Worker"
              value={assignedStaffId}
              onChange={setAssignedStaffId}
            >
              <option value="">All staff</option>
              {staffOptions.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.fullName}
                </option>
              ))}
            </FilterSelect>
            <Button
              variant="outline"
              className="h-11"
              onClick={() => {
                setSearch('');
                setStatus('');
                setFinancialBracket('');
                setAssignedStaffId('');
                setPage(1);
              }}
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {debouncedSearch && !loading && (
            <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Search className="h-4 w-4" />
              <span>Found {total} {total === 1 ? 'parent' : 'parents'} matching "{debouncedSearch}"</span>
              <button
                onClick={() => setSearch('')}
                className="ml-1 text-primary hover:underline font-medium"
              >
                Clear search
              </button>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Photo+Name</TableHead>
                <TableHead>National ID</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Financial Bracket</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned Staff</TableHead>
                <TableHead>Registered Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(6)].map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={8}>
                      <div className="h-8 animate-pulse rounded bg-slate-100" />
                    </TableCell>
                  </TableRow>
                ))
              ) : parents.length ? (
                parents.map((parent) => (
                  <TableRow key={parent.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={parent.photoUrl || undefined} alt={parent.fullName} />
                          <AvatarFallback>{initials(parent.fullName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{parent.fullName}</div>
                          <div className="text-xs text-muted-foreground">{parent.email || 'No email'}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{parent.nationalId}</TableCell>
                    <TableCell>{parent.phone}</TableCell>
                    <TableCell>
                      <BracketBadge bracket={parent.financialBracket} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={parent.status} />
                    </TableCell>
                    <TableCell>{parent.assignedStaff?.fullName || 'Unassigned'}</TableCell>
                    <TableCell>{formatDate(parent.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" asChild>
                          <Link href={`/dashboard/parents/${parent.id}`} aria-label="View parent">
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditDrawer(parent)}
                          aria-label="Edit parent"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deactivateParent(parent)}
                          aria-label="Deactivate parent"
                          className="text-red-600 hover:text-red-700"
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="rounded-full bg-slate-50 p-4">
                        <UserMinus className="h-10 w-10 text-muted-foreground/50" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-lg font-semibold">No parents found</p>
                        <p className="max-w-xs text-sm text-muted-foreground">
                          {debouncedSearch
                            ? `We couldn't find any parents matching "${debouncedSearch}". Try a different name or ID.`
                            : "You haven't registered any parents yet. Click the 'Register New Parent' button to get started."}
                        </p>
                      </div>
                      {debouncedSearch && (
                        <Button variant="outline" size="sm" onClick={() => setSearch('')}>
                          Clear Search
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing page {page} of {pages} for {total} parent records
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pages}
                onClick={() => setPage((current) => Math.min(pages, current + 1))}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <ParentDrawer
        open={drawerOpen}
        parentId={editingParent?.id}
        fallbackParent={editingParent}
        staffOptions={staffOptions}
        onClose={() => setDrawerOpen(false)}
        onSaved={(services) => {
          setDrawerOpen(false);
          setSuggestedServices(services);
          setShowConfirmation(true);
          fetchParents();
        }}
      />

      {showConfirmation && (
        <ConfirmationModal
          services={suggestedServices}
          onClose={() => setShowConfirmation(false)}
        />
      )}
    </div>
  );
}

function ParentDrawer({
  open,
  parentId,
  fallbackParent,
  staffOptions,
  onClose,
  onSaved,
}: {
  open: boolean;
  parentId?: string;
  fallbackParent: ParentRow | null;
  staffOptions: StaffOption[];
  onClose: () => void;
  onSaved: (services: SuggestedService[]) => void;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ParentFormData>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setStep(0);
    setErrors({});
    setServerError(null);
    setForm({
      ...emptyForm,
      assignedStaffId: staffOptions[0]?.id || getSession()?.id || '',
    });

    if (parentId) {
      setLoading(true);
      api
        .get(`/parents/${parentId}`)
        .then((res) => setForm(parentToForm(res.data)))
        .catch(() => {
          if (fallbackParent) {
            setForm({
              ...emptyForm,
              fullName: fallbackParent.fullName,
              photoUrl: fallbackParent.photoUrl || '',
              nationalId: fallbackParent.nationalId,
              phone: fallbackParent.phone,
              email: fallbackParent.email || '',
              financialBracket: fallbackParent.financialBracket,
              maritalStatus: fallbackParent.maritalStatus,
              status: fallbackParent.status,
              assignedStaffId: fallbackParent.assignedStaffId,
            });
          }
        })
        .finally(() => setLoading(false));
    }
  }, [fallbackParent, open, parentId, staffOptions]);

  if (!open) return null;

  function updateField(field: keyof ParentFormData, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function nextStep() {
    const validationErrors = validateStep(step, form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) return;
    setStep((current) => Math.min(steps.length - 1, current + 1));
  }

  async function save() {
    const validationErrors = validateStep(step, form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) return;

    setSaving(true);
    setServerError(null);
    try {
      const payload = formToPayload(form);
      if (parentId) {
        await api.patch(`/parents/${parentId}`, payload);
        onSaved([]);
      } else {
        const res = await api.post('/parents', payload);
        onSaved(res.data.suggestedServices || []);
      }
    } catch (err: unknown) {
      setServerError(getErrorMessage(err, 'Failed to save parent.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/40"
        aria-label="Close drawer"
        onClick={onClose}
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">
              {parentId ? 'Edit Parent' : 'Register New Parent'}
            </h2>
            <p className="text-sm text-muted-foreground">{steps[step]}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close drawer">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="border-b px-6 py-4">
          <div className="grid grid-cols-4 gap-2">
            {steps.map((label, index) => (
              <div key={label} className="space-y-2">
                <div
                  className={cn(
                    'h-2 rounded-full bg-slate-200',
                    index <= step && 'bg-primary',
                  )}
                />
                <p className="truncate text-[11px] font-medium text-muted-foreground">
                  {index + 1}. {label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="space-y-3">
              {[...Array(8)].map((_, index) => (
                <div key={index} className="h-10 animate-pulse rounded bg-slate-100" />
              ))}
            </div>
          ) : (
            <div className="space-y-5">
              {serverError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {serverError}
                </div>
              )}
              {step === 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Full Name" error={errors.fullName}>
                    <Input value={form.fullName} onChange={(event) => updateField('fullName', event.target.value)} />
                  </FormField>
                  <FormField label="Photo Upload" error={errors.photoUrl}>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={form.photoUrl || undefined} alt={form.fullName || 'Parent'} />
                        <AvatarFallback>{initials(form.fullName || 'Parent')}</AvatarFallback>
                      </Avatar>
                      <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                        <Upload className="h-4 w-4" />
                        Upload
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => {
                            handlePhotoUpload(event, (value) => updateField('photoUrl', value)).catch((error: unknown) => {
                              setErrors((current) => ({
                                ...current,
                                photoUrl:
                                  error instanceof Error
                                    ? error.message
                                    : 'Could not process the selected photo.',
                              }));
                            });
                          }}
                        />
                      </label>
                    </div>
                  </FormField>
                  <FormField label="Date of Birth" error={errors.dateOfBirth}>
                    <Input type="date" value={form.dateOfBirth} onChange={(event) => updateField('dateOfBirth', event.target.value)} />
                  </FormField>
                  <FormField label="Gender" error={errors.gender}>
                    <select className={selectClassName} value={form.gender} onChange={(event) => updateField('gender', event.target.value)}>
                      <option value="">Select gender</option>
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </select>
                  </FormField>
                  <FormField label="National ID" error={errors.nationalId}>
                    <Input value={form.nationalId} onChange={(event) => updateField('nationalId', event.target.value)} />
                  </FormField>
                  <FormField label="Phone" error={errors.phone}>
                    <Input value={form.phone} onChange={(event) => updateField('phone', event.target.value)} />
                  </FormField>
                  <FormField label="Email" error={errors.email}>
                    <Input type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} />
                  </FormField>
                </div>
              )}

              {step === 1 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Address" error={errors.address} className="md:col-span-2">
                    <Input value={form.address} onChange={(event) => updateField('address', event.target.value)} />
                  </FormField>
                  <FormField label="City" error={errors.city}>
                    <Input value={form.city} onChange={(event) => updateField('city', event.target.value)} />
                  </FormField>
                  <FormField label="Subcity" error={errors.subcity}>
                    <Input value={form.subcity} onChange={(event) => updateField('subcity', event.target.value)} />
                  </FormField>
                  <FormField label="Woreda" error={errors.woreda}>
                    <Input value={form.woreda} onChange={(event) => updateField('woreda', event.target.value)} />
                  </FormField>
                  <FormField label="Marital Status" error={errors.maritalStatus}>
                    <select className={selectClassName} value={form.maritalStatus} onChange={(event) => updateField('maritalStatus', event.target.value)}>
                      {maritalOptions.map((option) => <option key={option} value={option}>{formatEnum(option)}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Education Level" error={errors.educationLevel}>
                    <Input value={form.educationLevel} onChange={(event) => updateField('educationLevel', event.target.value)} />
                  </FormField>
                  <FormField label="Referral Source">
                    <Input
                      value={form.referralSource}
                      placeholder="Optional"
                      onChange={(event) => updateField('referralSource', event.target.value)}
                    />
                  </FormField>
                </div>
              )}

              {step === 2 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Employment Status" error={errors.employmentStatus}>
                    <select className={selectClassName} value={form.employmentStatus} onChange={(event) => updateField('employmentStatus', event.target.value)}>
                      {employmentOptions.map((option) => <option key={option} value={option}>{formatEnum(option)}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Financial Bracket" error={errors.financialBracket}>
                    <select className={selectClassName} value={form.financialBracket} onChange={(event) => updateField('financialBracket', event.target.value)}>
                      {bracketOptions.map((option) => <option key={option} value={option}>{formatEnum(option)}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Monthly Income Range">
                    <Input value={form.monthlyIncomeRange} placeholder="Example: 5,000-10,000 ETB" onChange={(event) => updateField('monthlyIncomeRange', event.target.value)} />
                  </FormField>
                  <FormField label="Number of Dependents" error={errors.numberOfDependents}>
                    <Input type="number" min={0} value={form.numberOfDependents} onChange={(event) => updateField('numberOfDependents', event.target.value)} />
                  </FormField>
                </div>
              )}

              {step === 3 && (
                <div className="grid gap-4">
                  <FormField label="Assign Case Worker" error={errors.assignedStaffId}>
                    <select className={selectClassName} value={form.assignedStaffId} onChange={(event) => updateField('assignedStaffId', event.target.value)}>
                      <option value="">Select staff</option>
                      {staffOptions.map((worker) => <option key={worker.id} value={worker.id}>{worker.fullName}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Internal Notes">
                    <textarea
                      className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={form.internalNotes}
                      onChange={(event) => updateField('internalNotes', event.target.value)}
                    />
                  </FormField>
                  <FormField label="Status" error={errors.status}>
                    <select className={selectClassName} value={form.status} onChange={(event) => updateField('status', event.target.value)}>
                      {statusOptions.map((option) => <option key={option} value={option}>{formatEnum(option)}</option>)}
                    </select>
                  </FormField>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t px-6 py-4">
          <Button variant="outline" disabled={step === 0 || saving} onClick={() => setStep((current) => current - 1)}>
            Back
          </Button>
          {step < steps.length - 1 ? (
            <Button onClick={nextStep} disabled={loading}>
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={save} disabled={saving || loading}>
              {saving ? 'Saving...' : parentId ? 'Save Changes' : 'Register Parent'}
            </Button>
          )}
        </div>
      </aside>
    </div>
  );
}

function ConfirmationModal({
  services,
  onClose,
}: {
  services: SuggestedService[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="border-b p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Parent saved</h2>
              <p className="text-sm text-muted-foreground">Suggested services are ready for review.</p>
            </div>
          </div>
        </div>
        <div className="space-y-3 p-6">
          {services.length ? (
            services.map((service) => (
              <div key={service.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{service.name}</p>
                  <Badge variant="secondary">{service.category}</Badge>
                </div>
                {service.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{service.description}</p>
                )}
              </div>
            ))
          ) : (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              No automatic service suggestions were returned for this profile.
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t p-4">
          <Button variant="outline" onClick={onClose}>
            Later
          </Button>
          <Button onClick={onClose}>
            <FileText className="h-4 w-4" />
            Assign Now
          </Button>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <select className={selectClassName} value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}

function FormField({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function validateStep(step: number, form: ParentFormData) {
  const errors: Record<string, string> = {};
  const required = (field: keyof ParentFormData, label: string) => {
    if (!String(form[field]).trim()) errors[field] = `${label} is required.`;
  };

  if (step === 0) {
    required('fullName', 'Full name');
    required('dateOfBirth', 'Date of birth');
    required('gender', 'Gender');
    required('nationalId', 'National ID');
    required('phone', 'Phone');
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) {
      errors.email = 'Enter a valid email address.';
    }
  }

  if (step === 1) {
    required('address', 'Address');
    required('city', 'City');
    required('subcity', 'Subcity');
    required('woreda', 'Woreda');
    required('educationLevel', 'Education level');
  }

  if (step === 2) {
    if (Number(form.numberOfDependents) < 0 || Number.isNaN(Number(form.numberOfDependents))) {
      errors.numberOfDependents = 'Dependents must be zero or more.';
    }
  }

  if (step === 3) {
    required('assignedStaffId', 'Case worker');
  }

  return errors;
}

function parentToForm(parent: ParentDetailResponse): ParentFormData {
  return {
    fullName: parent.fullName || '',
    photoUrl: parent.photoUrl || '',
    dateOfBirth: parent.dateOfBirth ? format(new Date(parent.dateOfBirth), 'yyyy-MM-dd') : '',
    gender: parent.gender || '',
    nationalId: parent.nationalId || '',
    phone: parent.phone || '',
    email: parent.email || '',
    address: parent.address || '',
    city: parent.city || '',
    subcity: parent.subcity || '',
    woreda: parent.woreda || '',
    maritalStatus: parent.maritalStatus || 'MARRIED',
    educationLevel: parent.educationLevel || '',
    referralSource: parent.referralSource || '',
    employmentStatus: parent.employmentStatus || 'UNEMPLOYED',
    financialBracket: parent.financialBracket || 'LOW',
    monthlyIncomeRange: '',
    numberOfDependents: String(parent.numberOfDependents ?? 0),
    assignedStaffId: parent.assignedStaffId || '',
    internalNotes: parent.internalNotes || '',
    status: parent.status || 'ACTIVE',
  };
}

function formToPayload(form: ParentFormData) {
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

async function handlePhotoUpload(
  event: ChangeEvent<HTMLInputElement>,
  onLoaded: (value: string) => void,
): Promise<void> {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    throw new Error('Select an image file.');
  }

  const imageUrl = globalThis.URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new globalThis.Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Could not read the selected image.'));
      element.src = imageUrl;
    });

    const maxDimension = 900;
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = globalThis.document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not process the selected image.');
    }

    context.drawImage(image, 0, 0, width, height);

    let quality = 0.82;
    let dataUrl = canvas.toDataURL('image/jpeg', quality);

    while (dataUrl.length > 900_000 && quality > 0.46) {
      quality -= 0.08;
      dataUrl = canvas.toDataURL('image/jpeg', quality);
    }

    if (dataUrl.length > 1_200_000) {
      throw new Error('Photo is too large after compression. Choose a smaller image.');
    }

    onLoaded(dataUrl);
  } finally {
    globalThis.URL.revokeObjectURL(imageUrl);
  }
}

function StatusBadge({ status }: { status: ParentStatus }) {
  const classes = {
    ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    UNDER_REVIEW: 'bg-amber-50 text-amber-700 border-amber-200',
    INACTIVE: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  return <Badge className={classes[status]}>{formatEnum(status)}</Badge>;
}

function BracketBadge({ bracket }: { bracket: FinancialBracket }) {
  const classes = {
    LOW: 'bg-red-50 text-red-700 border-red-200',
    MEDIUM: 'bg-blue-50 text-blue-700 border-blue-200',
    HIGH: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  return <Badge className={classes[bracket]}>{formatEnum(bracket)}</Badge>;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    Array.isArray((error as { response?: { data?: { message?: unknown } } }).response?.data?.message)
  ) {
    return (error as { response: { data: { message: string[] } } }).response.data.message.join(' ');
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { data?: { message?: unknown } } }).response?.data?.message === 'string'
  ) {
    return (error as { response: { data: { message: string } } }).response.data.message;
  }

  return fallback;
}

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDate(value: string) {
  return format(new Date(value), 'MMM dd, yyyy');
}

function initials(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

const selectClassName =
  'flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';
