'use client';

import { useEffect, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { Upload, X, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
import { getSession } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { formatEnum } from '@/lib/export';
import { 
  ParentStatus, 
  FinancialBracket, 
  MaritalStatus, 
  EmploymentStatus, 
  StaffOption, 
  ParentRow, 
  ParentFormData, 
  SuggestedService, 
  emptyParentForm, 
  parentToForm, 
  formToParentPayload 
} from '@/types/parents';

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

interface ParentDrawerProps {
  open: boolean;
  parentId?: string;
  fallbackParent: ParentRow | null;
  staffOptions: StaffOption[];
  onClose: () => void;
  onSaved: (services: SuggestedService[]) => void;
}

export function ParentDrawer({
  open,
  parentId,
  fallbackParent,
  staffOptions,
  onClose,
  onSaved,
}: ParentDrawerProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ParentFormData>(emptyParentForm);
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
      ...emptyParentForm,
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
              ...emptyParentForm,
              fullName: fallbackParent.fullName,
              nationalId: fallbackParent.nationalId,
              phone: fallbackParent.phone,
              email: fallbackParent.email || '',
              status: fallbackParent.status,
              financialBracket: fallbackParent.financialBracket,
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
      const payload = formToParentPayload(form);
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
        onClick={onClose}
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">
              {parentId ? 'Edit Parent Profile' : 'Register New Parent'}
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
                    <Input
                      value={form.fullName}
                      onChange={(event) => updateField('fullName', event.target.value)}
                    />
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
                                photoUrl: error instanceof Error ? error.message : 'Could not process photo.',
                              }));
                            });
                          }}
                        />
                      </label>
                    </div>
                  </FormField>
                  <FormField label="Date of Birth" error={errors.dateOfBirth}>
                    <CalendarDatePicker
                      value={form.dateOfBirth}
                      onChange={(value) => updateField('dateOfBirth', value)}
                      minYear={1900}
                      maxYear={new Date().getUTCFullYear()}
                    />
                  </FormField>
                  <FormField label="Gender" error={errors.gender}>
                    <select
                      className={selectClassName}
                      value={form.gender}
                      onChange={(event) => updateField('gender', event.target.value)}
                    >
                      <option value="">Select gender</option>
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                    </select>
                  </FormField>
                  <FormField label="National ID" error={errors.nationalId}>
                    <Input
                      value={form.nationalId}
                      onChange={(event) => updateField('nationalId', event.target.value)}
                    />
                  </FormField>
                  <FormField label="Phone Number" error={errors.phone}>
                    <Input
                      type="tel"
                      value={form.phone}
                      onChange={(event) => updateField('phone', event.target.value)}
                    />
                  </FormField>
                  <FormField label="Email Address (Optional)" error={errors.email} className="md:col-span-2">
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(event) => updateField('email', event.target.value)}
                    />
                  </FormField>
                </div>
              )}

              {step === 1 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Address" error={errors.address} className="md:col-span-2">
                    <Input
                      value={form.address}
                      onChange={(event) => updateField('address', event.target.value)}
                    />
                  </FormField>
                  <FormField label="City" error={errors.city}>
                    <Input value={form.city} onChange={(event) => updateField('city', event.target.value)} />
                  </FormField>
                  <FormField label="Subcity" error={errors.subcity}>
                    <Input
                      value={form.subcity}
                      onChange={(event) => updateField('subcity', event.target.value)}
                    />
                  </FormField>
                  <FormField label="Woreda" error={errors.woreda}>
                    <Input
                      value={form.woreda}
                      onChange={(event) => updateField('woreda', event.target.value)}
                    />
                  </FormField>
                  <FormField label="Marital Status" error={errors.maritalStatus}>
                    <select
                      className={selectClassName}
                      value={form.maritalStatus}
                      onChange={(event) => updateField('maritalStatus', event.target.value as MaritalStatus)}
                    >
                      {maritalOptions.map((option) => (
                        <option key={option} value={option}>
                          {formatEnum(option)}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Education Level" error={errors.educationLevel}>
                    <Input
                      value={form.educationLevel}
                      onChange={(event) => updateField('educationLevel', event.target.value)}
                    />
                  </FormField>
                  <FormField label="Referral Source" error={errors.referralSource}>
                    <Input
                      value={form.referralSource}
                      onChange={(event) => updateField('referralSource', event.target.value)}
                    />
                  </FormField>
                </div>
              )}

              {step === 2 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label="Employment Status" error={errors.employmentStatus}>
                    <select
                      className={selectClassName}
                      value={form.employmentStatus}
                      onChange={(event) =>
                        updateField('employmentStatus', event.target.value as EmploymentStatus)
                      }
                    >
                      {employmentOptions.map((option) => (
                        <option key={option} value={option}>
                          {formatEnum(option)}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Financial Bracket" error={errors.financialBracket}>
                    <select
                      className={selectClassName}
                      value={form.financialBracket}
                      onChange={(event) =>
                        updateField('financialBracket', event.target.value as FinancialBracket)
                      }
                    >
                      {bracketOptions.map((option) => (
                        <option key={option} value={option}>
                          {formatEnum(option)}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Monthly Income Range" error={errors.monthlyIncomeRange}>
                    <Input
                      placeholder="e.g. 5,000 - 10,000 ETB"
                      value={form.monthlyIncomeRange}
                      onChange={(event) => updateField('monthlyIncomeRange', event.target.value)}
                    />
                  </FormField>
                  <FormField label="Number of Dependents" error={errors.numberOfDependents}>
                    <Input
                      type="number"
                      min="0"
                      value={form.numberOfDependents}
                      onChange={(event) => updateField('numberOfDependents', event.target.value)}
                    />
                  </FormField>
                </div>
              )}

              {step === 3 && (
                <div className="grid gap-4">
                  <FormField label="Assign Case Worker" error={errors.assignedStaffId}>
                    <select
                      className={selectClassName}
                      value={form.assignedStaffId}
                      onChange={(event) => updateField('assignedStaffId', event.target.value)}
                    >
                      <option value="">Select staff</option>
                      {staffOptions.map((worker) => (
                        <option key={worker.id} value={worker.id}>
                          {worker.fullName}
                        </option>
                      ))}
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
                    <select
                      className={selectClassName}
                      value={form.status}
                      onChange={(event) => updateField('status', event.target.value as ParentStatus)}
                    >
                      {statusOptions.map((option) => (
                        <option key={option} value={option}>
                          {formatEnum(option)}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t px-6 py-4">
          <Button
            variant="outline"
            disabled={step === 0 || saving}
            onClick={() => setStep((current) => current - 1)}
          >
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
      {error && <p className="text-xs font-medium text-red-500">{error}</p>}
    </div>
  );
}

function validateStep(step: number, form: ParentFormData) {
  const errors: Record<string, string> = {};

  if (step === 0) {
    if (!form.fullName.trim()) errors.fullName = 'Full name is required';
    if (!form.dateOfBirth) errors.dateOfBirth = 'Date of birth is required';
    if (!form.gender) errors.gender = 'Gender is required';
    if (!form.nationalId.trim()) errors.nationalId = 'National ID is required';
    if (!form.phone.trim()) errors.phone = 'Phone number is required';
  }

  if (step === 1) {
    if (!form.address.trim()) errors.address = 'Address is required';
    if (!form.city.trim()) errors.city = 'City is required';
    if (!form.subcity.trim()) errors.subcity = 'Subcity is required';
  }

  if (step === 3) {
    if (!form.assignedStaffId) errors.assignedStaffId = 'Staff assignment is required';
  }

  return errors;
}

function initials(value: string) {
  return value
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
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

const selectClassName =
  'flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

const textareaClassName =
  'min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';
