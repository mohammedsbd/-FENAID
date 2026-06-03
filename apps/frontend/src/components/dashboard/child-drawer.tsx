'use client';

import { useEffect, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { Upload, X, ChevronRight, Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
import { getSession } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { formatEnum } from '@/lib/export';
import { format } from 'date-fns';
import { 
  ChildStatus, 
  DisabilityType, 
  SeverityLevel, 
  SchoolEnrollmentStatus, 
  CommunicationAbility, 
  StaffOption, 
  ChildRow, 
  ChildFormData, 
  SuggestedService, 
  emptyChildForm, 
  childToForm, 
  formToChildPayload 
} from '@/types/children';

const statusOptions: ChildStatus[] = ['ACTIVE', 'GRADUATED', 'TRANSFERRED', 'INACTIVE', 'DECEASED'];
const disabilityOptions: DisabilityType[] = ['PHYSICAL', 'INTELLECTUAL', 'MULTIPLE'];
const severityOptions: SeverityLevel[] = ['MILD', 'MODERATE', 'SEVERE'];

const steps = [
  'Personal Info',
  'Disability Details',
  'Medical & School',
  'Links & Assignment',
];

interface ChildDrawerProps {
  open: boolean;
  childId?: string;
  fallbackChild: ChildRow | null;
  staffOptions: StaffOption[];
  onClose: () => void;
  onSaved: (services: SuggestedService[]) => void;
}

type ParentOption = {
  id: string;
  fullName: string;
};

export function ChildDrawer({
  open,
  childId,
  fallbackChild,
  staffOptions,
  onClose,
  onSaved,
}: ChildDrawerProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ChildFormData>(emptyChildForm);
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
      ...emptyChildForm,
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
              ...emptyChildForm,
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
      const payload = formToChildPayload(form);
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

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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
