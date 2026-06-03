'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  Baby,
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
  Stethoscope,
  School,
  UserPlus,
  Brain,
  Accessibility,
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

// Types and Enums
type ChildStatus = 'ACTIVE' | 'GRADUATED' | 'TRANSFERRED' | 'INACTIVE' | 'DECEASED';
type DisabilityType = 'PHYSICAL' | 'INTELLECTUAL' | 'MULTIPLE';
type SeverityLevel = 'MILD' | 'MODERATE' | 'SEVERE';
type SchoolEnrollmentStatus = 'ENROLLED' | 'NOT_ENROLLED' | 'GRADUATED';
type CommunicationAbility = 'VERBAL' | 'NON_VERBAL' | 'ASSISTED';

type StaffOption = {
  id: string;
  fullName: string;
  role?: string;
};

type ParentOption = {
  id: string;
  fullName: string;
};

type ChildRow = {
  id: string;
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

type ChildFormData = {
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

type SuggestedService = {
  id: string;
  name: string;
  category: string;
  description?: string | null;
};

const emptyForm: ChildFormData = {
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

const statusOptions: ChildStatus[] = ['ACTIVE', 'GRADUATED', 'TRANSFERRED', 'INACTIVE', 'DECEASED'];
const disabilityOptions: DisabilityType[] = ['PHYSICAL', 'INTELLECTUAL', 'MULTIPLE'];
const severityOptions: SeverityLevel[] = ['MILD', 'MODERATE', 'SEVERE'];

const steps = [
  'Personal Info',
  'Disability Details',
  'Medical & School',
  'Links & Assignment',
];

export default function ChildrenPage() {
  const [children, setChildren] = useState<ChildRow[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
  const [disabilityType, setDisabilityType] = useState('');
  const [severityLevel, setSeverityLevel] = useState('');
  const [assignedStaffId, setAssignedStaffId] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingChild, setEditingChild] = useState<ChildRow | null>(null);
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
    fetchChildren();
  }, [debouncedSearch, status, disabilityType, severityLevel, assignedStaffId, page]);

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
        // Non-admins can still assign to themselves
      }
    };

    fetchStaff();
  }, []);

  const staffOptions = useMemo(() => {
    const fromChildren = children
      .map((child) => child.assignedStaff)
      .filter((worker): worker is StaffOption => Boolean(worker?.id));
    const unique = new Map<string, StaffOption>();
    [...staff, ...fromChildren].forEach((worker) => unique.set(worker.id, worker));
    return [...unique.values()];
  }, [children, staff]);

  async function fetchChildren() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/children', {
        params: {
          page,
          limit: 10,
          search: debouncedSearch || undefined,
          status: status || undefined,
          disabilityType: disabilityType || undefined,
          severityLevel: severityLevel || undefined,
          assignedStaffId: assignedStaffId || undefined,
        },
      });
      setChildren(res.data.data || []);
      setPages(res.data.meta?.pages || 1);
      setTotal(res.data.meta?.total || 0);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load children.'));
    } finally {
      setLoading(false);
    }
  }

  function openNewDrawer() {
    setEditingChild(null);
    setDrawerOpen(true);
  }

  async function openEditDrawer(child: ChildRow) {
    setEditingChild(child);
    setDrawerOpen(true);
  }

  async function deactivateChild(child: ChildRow) {
    if (!globalThis.confirm(`Deactivate ${child.fullName}?`)) return;

    try {
      await api.delete(`/children/${child.id}`);
      fetchChildren();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to deactivate child.'));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Children</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Register and manage children profiles and progress.
          </p>
        </div>
        <Button onClick={openNewDrawer} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Register New Child
        </Button>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(250px,1fr)_160px_160px_160px_200px_auto] lg:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="child-search" className="text-sm font-semibold">Search Children</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/70" />
                <Input
                  id="child-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name..."
                  className="h-12 pl-10 pr-10 text-base shadow-sm focus-visible:ring-primary"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-slate-100 hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <FilterSelect label="Disability Type" value={disabilityType} onChange={setDisabilityType}>
              <option value="">All types</option>
              {disabilityOptions.map((option) => (
                <option key={option} value={option}>{formatEnum(option)}</option>
              ))}
            </FilterSelect>
            <FilterSelect label="Severity" value={severityLevel} onChange={setSeverityLevel}>
              <option value="">All levels</option>
              {severityOptions.map((option) => (
                <option key={option} value={option}>{formatEnum(option)}</option>
              ))}
            </FilterSelect>
            <FilterSelect label="Status" value={status} onChange={setStatus}>
              <option value="">All statuses</option>
              {statusOptions.map((option) => (
                <option key={option} value={option}>{formatEnum(option)}</option>
              ))}
            </FilterSelect>
            <FilterSelect label="Assigned Staff" value={assignedStaffId} onChange={setAssignedStaffId}>
              <option value="">All staff</option>
              {staffOptions.map((worker) => (
                <option key={worker.id} value={worker.id}>{worker.fullName}</option>
              ))}
            </FilterSelect>
            <Button
              variant="outline"
              className="h-11"
              onClick={() => {
                setSearch('');
                setStatus('');
                setDisabilityType('');
                setSeverityLevel('');
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

          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Photo+Name</TableHead>
                <TableHead>Disability Type</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Parent Name</TableHead>
                <TableHead>Assigned Staff</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(6)].map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={7}>
                      <div className="h-8 animate-pulse rounded bg-slate-100" />
                    </TableCell>
                  </TableRow>
                ))
              ) : children.length ? (
                children.map((child) => (
                  <TableRow key={child.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={child.photoUrl || undefined} alt={child.fullName} />
                          <AvatarFallback>{initials(child.fullName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{child.fullName}</div>
                          <div className="text-xs text-muted-foreground">{calculateAge(child.dateOfBirth)} years old</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <DisabilityIcon type={child.disabilityType} />
                        <span className="text-sm">{formatEnum(child.disabilityType)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <SeverityBadge level={child.severityLevel} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={child.status} />
                    </TableCell>
                    <TableCell>
                      {child.parent ? (
                        <Link href={`/dashboard/parents/${child.parent.id}`} className="text-primary hover:underline">
                          {child.parent.fullName}
                        </Link>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell>{child.assignedStaff?.fullName || 'Unassigned'}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" asChild>
                          <Link href={`/dashboard/children/${child.id}`} aria-label="View child">
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditDrawer(child)}
                          aria-label="Edit child"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deactivateChild(child)}
                          aria-label="Deactivate child"
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
                  <TableCell colSpan={7} className="h-64 text-center">
                    <p className="text-muted-foreground">No children found.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing page {page} of {pages} for {total} child records
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

      <ChildDrawer
        open={drawerOpen}
        childId={editingChild?.id}
        fallbackChild={editingChild}
        staffOptions={staffOptions}
        onClose={() => setDrawerOpen(false)}
        onSaved={(services) => {
          setDrawerOpen(false);
          setSuggestedServices(services);
          setShowConfirmation(true);
          fetchChildren();
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

function ChildDrawer({
  open,
  childId,
  fallbackChild,
  staffOptions,
  onClose,
  onSaved,
}: {
  open: boolean;
  childId?: string;
  fallbackChild: ChildRow | null;
  staffOptions: StaffOption[];
  onClose: () => void;
  onSaved: (services: SuggestedService[]) => void;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ChildFormData>(emptyForm);
  const [parents, setParents] = useState<ParentOption[]>([]);
  const [parentSearch, setParentSearch] = useState('');
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

    if (childId) {
      setLoading(true);
      api
        .get(`/children/${childId}`)
        .then((res) => setForm(childToForm(res.data)))
        .catch(() => {
          if (fallbackChild) {
            setForm({
              ...emptyForm,
              fullName: fallbackChild.fullName,
              photoUrl: fallbackChild.photoUrl || '',
              dateOfBirth: format(new Date(fallbackChild.dateOfBirth), 'yyyy-MM-dd'),
              disabilityType: fallbackChild.disabilityType,
              disabilityCategory: fallbackChild.disabilityCategory,
              severityLevel: fallbackChild.severityLevel,
              status: fallbackChild.status,
              parentId: fallbackChild.parentId,
              assignedStaffId: fallbackChild.assignedStaffId,
            });
          }
        })
        .finally(() => setLoading(false));
    }
  }, [fallbackChild, open, childId, staffOptions]);

  useEffect(() => {
    if (step === 3) {
      const fetchParents = async () => {
        try {
          const res = await api.get('/parents', { params: { search: parentSearch, limit: 10 } });
          setParents(res.data.data || []);
        } catch {
          // Ignore
        }
      };
      fetchParents();
    }
  }, [step, parentSearch]);

  if (!open) return null;

  function updateField(field: keyof ChildFormData, value: string) {
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
      if (childId) {
        await api.patch(`/children/${childId}`, payload);
        onSaved([]);
      } else {
        const res = await api.post('/children', payload);
        onSaved(res.data.suggestedServices || []);
      }
    } catch (err: unknown) {
      setServerError(getErrorMessage(err, 'Failed to save child.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/40"
        onClick={onClose}
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">
              {childId ? 'Edit Child' : 'Register New Child'}
            </h2>
            <p className="text-sm text-muted-foreground">{steps[step]}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
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
                        <AvatarImage src={form.photoUrl || undefined} alt={form.fullName || 'Child'} />
                        <AvatarFallback>{initials(form.fullName || 'Child')}</AvatarFallback>
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
                                photoUrl: error instanceof Error ? error.message : 'Could not process photo.',
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
                    </select>
                  </FormField>
                </div>
              )}

              {step === 1 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Disability Type" error={errors.disabilityType}>
                    <select className={selectClassName} value={form.disabilityType} onChange={(event) => updateField('disabilityType', event.target.value)}>
                      {disabilityOptions.map((option) => <option key={option} value={option}>{formatEnum(option)}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Disability Category" error={errors.disabilityCategory}>
                    <Input value={form.disabilityCategory} placeholder="e.g. Cerebral Palsy, Autism" onChange={(event) => updateField('disabilityCategory', event.target.value)} />
                  </FormField>
                  <FormField label="Severity Level" error={errors.severityLevel}>
                    <select className={selectClassName} value={form.severityLevel} onChange={(event) => updateField('severityLevel', event.target.value)}>
                      {severityOptions.map((option) => <option key={option} value={option}>{formatEnum(option)}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Communication Ability" error={errors.communicationAbility}>
                    <select className={selectClassName} value={form.communicationAbility} onChange={(event) => updateField('communicationAbility', event.target.value)}>
                      <option value="VERBAL">Verbal</option>
                      <option value="NON_VERBAL">Non-Verbal</option>
                      <option value="ASSISTED">Assisted</option>
                    </select>
                  </FormField>
                </div>
              )}

              {step === 2 && (
                <div className="grid gap-4">
                  <FormField label="Medical History">
                    <textarea
                      className={textareaClassName}
                      value={form.medicalHistory}
                      onChange={(event) => updateField('medicalHistory', event.target.value)}
                    />
                  </FormField>
                  <FormField label="Current Medications">
                    <textarea
                      className={textareaClassName}
                      value={form.medications}
                      onChange={(event) => updateField('medications', event.target.value)}
                    />
                  </FormField>
                  <FormField label="School Enrollment Status" error={errors.schoolEnrollmentStatus}>
                    <select className={selectClassName} value={form.schoolEnrollmentStatus} onChange={(event) => updateField('schoolEnrollmentStatus', event.target.value)}>
                      <option value="ENROLLED">Enrolled</option>
                      <option value="NOT_ENROLLED">Not Enrolled</option>
                      <option value="GRADUATED">Graduated</option>
                    </select>
                  </FormField>
                </div>
              )}

              {step === 3 && (
                <div className="grid gap-4">
                  <FormField label="Parent" error={errors.parentId}>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search parents..."
                        value={parentSearch}
                        onChange={(e) => setParentSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <select
                      className={selectClassName}
                      size={5}
                      value={form.parentId}
                      onChange={(e) => updateField('parentId', e.target.value)}
                    >
                      {parents.map((p) => (
                        <option key={p.id} value={p.id}>{p.fullName}</option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Assign Case Worker" error={errors.assignedStaffId}>
                    <select className={selectClassName} value={form.assignedStaffId} onChange={(event) => updateField('assignedStaffId', event.target.value)}>
                      <option value="">Select staff</option>
                      {staffOptions.map((worker) => <option key={worker.id} value={worker.id}>{worker.fullName}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Internal Notes">
                    <textarea
                      className={textareaClassName}
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
              {saving ? 'Saving...' : childId ? 'Save Changes' : 'Register Child'}
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
              <h2 className="text-lg font-semibold">Child registered successfully</h2>
              <p className="text-sm text-muted-foreground">The following services are suggested based on the profile.</p>
            </div>
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto space-y-3 p-6">
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
            <p className="text-sm text-muted-foreground">No automatic service suggestions.</p>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t p-4">
          <Button variant="outline" onClick={onClose}>Dismiss</Button>
          <Button onClick={onClose}>Review in Profile</Button>
        </div>
      </div>
    </div>
  );
}

// Helpers
function DisabilityIcon({ type }: { type: DisabilityType }) {
  if (type === 'PHYSICAL') return <Accessibility className="h-4 w-4 text-blue-600" />;
  if (type === 'INTELLECTUAL') return <Brain className="h-4 w-4 text-purple-600" />;
  return <div className="flex -space-x-1"><Accessibility className="h-4 w-4 text-blue-600" /><Brain className="h-4 w-4 text-purple-600" /></div>;
}

function SeverityBadge({ level }: { level: SeverityLevel }) {
  const classes = {
    MILD: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    MODERATE: 'bg-amber-50 text-amber-700 border-amber-200',
    SEVERE: 'bg-red-50 text-red-700 border-red-200',
  };
  return <Badge className={classes[level]}>{formatEnum(level)}</Badge>;
}

function StatusBadge({ status }: { status: ChildStatus }) {
  const classes = {
    ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    GRADUATED: 'bg-blue-50 text-blue-700 border-blue-200',
    TRANSFERRED: 'bg-amber-50 text-amber-700 border-amber-200',
    INACTIVE: 'bg-slate-100 text-slate-600 border-slate-200',
    DECEASED: 'bg-red-950 text-white border-red-900',
  };
  return <Badge className={classes[status]}>{formatEnum(status)}</Badge>;
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode }) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <select className={selectClassName} value={value} onChange={(e) => onChange(e.target.value)}>{children}</select>
    </label>
  );
}

function FormField({ label, error, children, className }: { label: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function validateStep(step: number, form: ChildFormData) {
  const errors: Record<string, string> = {};
  const req = (f: keyof ChildFormData, l: string) => { if (!String(form[f]).trim()) errors[f] = `${l} is required.`; };
  if (step === 0) { req('fullName', 'Full name'); req('dateOfBirth', 'Date of birth'); req('gender', 'Gender'); }
  if (step === 1) { req('disabilityCategory', 'Category'); }
  if (step === 3) { req('parentId', 'Parent'); req('assignedStaffId', 'Staff'); }
  return errors;
}

function childToForm(child: any): ChildFormData {
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

function formToPayload(form: ChildFormData) {
  return {
    ...form,
    fullName: form.fullName.trim(),
    parentId: form.parentId,
    assignedStaffId: form.assignedStaffId,
  };
}

function calculateAge(dob: string) {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatEnum(val: string) {
  return val.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getErrorMessage(err: any, fallback: string) {
  return err.response?.data?.message?.[0] || err.response?.data?.message || fallback;
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

const selectClassName = 'flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const textareaClassName = 'min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
