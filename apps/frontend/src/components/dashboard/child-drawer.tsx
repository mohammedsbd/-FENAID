'use client';

import { useEffect, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { Upload, X, ChevronRight, Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
import { getSession } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { formatEnum } from '@/lib/export';
import { toIsoDateInputValue } from '@/lib/calendar';
import { useLocale } from '@/components/providers/locale-provider';
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
  const { t } = useLocale();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ChildFormData>(emptyChildForm);
  const [parents, setParents] = useState<ParentOption[]>([]);
  const [parentSearch, setParentSearch] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
        });
      });
      return () => cancelAnimationFrame(frame);
    } else {
      setVisible(false);
      const timer = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const steps = [
    t('childDrawer.personalInfo', 'Personal Info'),
    t('childDrawer.disabilityDetails', 'Disability Details'),
    t('childDrawer.medicalSchool', 'Medical & School'),
    t('childDrawer.linksAssignment', 'Links & Assignment'),
  ];

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
              dateOfBirth: toIsoDateInputValue(fallbackChild.dateOfBirth),
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

  if (!mounted) return null;

  function updateField(field: keyof ChildFormData, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function nextStep() {
    const validationErrors = validateStep(step, form, t);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) return;
    setStep((current) => Math.min(steps.length - 1, current + 1));
  }

  async function save() {
    const validationErrors = validateStep(step, form, t);
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
      setServerError(getErrorMessage(err, t('childDrawer.error.saveFailed', 'Failed to save child.')));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto transition-opacity duration-300 ease-out ${
      visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
    } bg-slate-950/30 backdrop-blur-sm`}>
      <button
        type="button"
        className="fixed inset-0"
        onClick={onClose}
      />
      <aside className={`absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col bg-white shadow-xl transition-transform duration-300 ease-out ${
        visible ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">
              {childId ? t('childDrawer.editTitle', 'Edit Child') : t('childDrawer.registerTitle', 'Register New Child')}
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
                  <FormField label={t('childDrawer.fullName', 'Full Name')} error={errors.fullName}>
                    <Input value={form.fullName} onChange={(event) => updateField('fullName', event.target.value)} />
                  </FormField>
                  <FormField label={t('childDrawer.photoUpload', 'Photo Upload')} error={errors.photoUrl}>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={form.photoUrl || undefined} alt={form.fullName || t('childDrawer.child', 'Child')} />
                        <AvatarFallback>{initials(form.fullName || t('childDrawer.child', 'Child'))}</AvatarFallback>
                      </Avatar>
                      <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                        <Upload className="h-4 w-4" />
                        {t('childDrawer.upload', 'Upload')}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => {
                            handlePhotoUpload(event, (value) => updateField('photoUrl', value)).catch((error: unknown) => {
                              setErrors((current) => ({
                                ...current,
                                photoUrl: error instanceof Error ? error.message : t('childDrawer.error.photoProcess', 'Could not process photo.'),
                              }));
                            });
                          }}
                        />
                      </label>
                    </div>
                  </FormField>
                  <FormField label={t('childDrawer.dateOfBirth', 'Date of Birth')} error={errors.dateOfBirth}>
                    <CalendarDatePicker
                      value={form.dateOfBirth}
                      onChange={(value) => updateField('dateOfBirth', value)}
                      minYear={1900}
                      maxYear={new Date().getUTCFullYear()}
                    />
                  </FormField>
                  <FormField label={t('childDrawer.gender', 'Gender')} error={errors.gender}>
                    <select className={selectClassName} value={form.gender} onChange={(event) => updateField('gender', event.target.value)}>
                      <option value="">{t('childDrawer.selectGender', 'Select gender')}</option>
                      <option value="Female">{t('childDrawer.female', 'Female')}</option>
                      <option value="Male">{t('childDrawer.male', 'Male')}</option>
                    </select>
                  </FormField>
                </div>
              )}

              {step === 1 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label={t('childDrawer.disabilityType', 'Disability Type')} error={errors.disabilityType}>
                    <select className={selectClassName} value={form.disabilityType} onChange={(event) => updateField('disabilityType', event.target.value)}>
                      {disabilityOptions.map((option) => <option key={option} value={option}>{formatEnum(option)}</option>)}
                    </select>
                  </FormField>
                  <FormField label={t('childDrawer.disabilityCategory', 'Disability Category')} error={errors.disabilityCategory}>
                    <Input value={form.disabilityCategory} placeholder={t('childDrawer.disabilityCategoryPlaceholder', 'e.g. Cerebral Palsy, Autism')} onChange={(event) => updateField('disabilityCategory', event.target.value)} />
                  </FormField>
                  <FormField label={t('childDrawer.severityLevel', 'Severity Level')} error={errors.severityLevel}>
                    <select className={selectClassName} value={form.severityLevel} onChange={(event) => updateField('severityLevel', event.target.value)}>
                      {severityOptions.map((option) => <option key={option} value={option}>{formatEnum(option)}</option>)}
                    </select>
                  </FormField>
                  <FormField label={t('childDrawer.communicationAbility', 'Communication Ability')} error={errors.communicationAbility}>
                    <select className={selectClassName} value={form.communicationAbility} onChange={(event) => updateField('communicationAbility', event.target.value)}>
                      <option value="VERBAL">{t('childDrawer.verbal', 'Verbal')}</option>
                      <option value="NON_VERBAL">{t('childDrawer.nonVerbal', 'Non-Verbal')}</option>
                      <option value="ASSISTED">{t('childDrawer.assisted', 'Assisted')}</option>
                    </select>
                  </FormField>
                </div>
              )}

              {step === 2 && (
                <div className="grid gap-4">
                  <FormField label={t('childDrawer.medicalHistory', 'Medical History')}>
                    <textarea
                      className={textareaClassName}
                      value={form.medicalHistory}
                      onChange={(event) => updateField('medicalHistory', event.target.value)}
                    />
                  </FormField>
                  <FormField label={t('childDrawer.currentMedications', 'Current Medications')}>
                    <textarea
                      className={textareaClassName}
                      value={form.medications}
                      onChange={(event) => updateField('medications', event.target.value)}
                    />
                  </FormField>
                  <FormField label={t('childDrawer.schoolEnrollment', 'School Enrollment Status')} error={errors.schoolEnrollmentStatus}>
                    <select className={selectClassName} value={form.schoolEnrollmentStatus} onChange={(event) => updateField('schoolEnrollmentStatus', event.target.value)}>
                      <option value="ENROLLED">{t('childDrawer.enrolled', 'Enrolled')}</option>
                      <option value="NOT_ENROLLED">{t('childDrawer.notEnrolled', 'Not Enrolled')}</option>
                      <option value="GRADUATED">{t('childDrawer.graduated', 'Graduated')}</option>
                    </select>
                  </FormField>
                </div>
              )}

              {step === 3 && (
                <div className="grid gap-4">
                  <FormField label={t('childDrawer.parent', 'Parent')} error={errors.parentId}>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder={t('childDrawer.searchParents', 'Search parents...')}
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
                  <FormField label={t('childDrawer.assignStaff', 'Assign Case Worker')} error={errors.assignedStaffId}>
                    <select className={selectClassName} value={form.assignedStaffId} onChange={(event) => updateField('assignedStaffId', event.target.value)}>
                      <option value="">{t('childDrawer.selectStaff', 'Select staff')}</option>
                      {staffOptions.map((worker) => <option key={worker.id} value={worker.id}>{worker.fullName}</option>)}
                    </select>
                  </FormField>
                  <FormField label={t('childDrawer.internalNotes', 'Internal Notes')}>
                    <textarea
                      className={textareaClassName}
                      value={form.internalNotes}
                      onChange={(event) => updateField('internalNotes', event.target.value)}
                    />
                  </FormField>
                  <FormField label={t('childDrawer.status', 'Status')} error={errors.status}>
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
            {t('childDrawer.back', 'Back')}
          </Button>
          {step < steps.length - 1 ? (
            <Button onClick={nextStep} disabled={loading}>
              {t('childDrawer.next', 'Next')}
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={save} disabled={saving || loading}>
              {saving ? t('childDrawer.saving', 'Saving...') : childId ? t('childDrawer.saveChanges', 'Save Changes') : t('childDrawer.registerChild', 'Register Child')}
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

function validateStep(step: number, form: ChildFormData, t: (key: string, fallback?: string) => string) {
  const errors: Record<string, string> = {};
  if (step === 0) {
    if (!String(form.fullName).trim()) errors.fullName = t('childDrawer.error.fullNameRequired', 'Full name is required.');
    if (!String(form.dateOfBirth).trim()) errors.dateOfBirth = t('childDrawer.error.dobRequired', 'Date of birth is required.');
    if (!String(form.gender).trim()) errors.gender = t('childDrawer.error.genderRequired', 'Gender is required.');
  }
  if (step === 1) {
    if (!String(form.disabilityCategory).trim()) errors.disabilityCategory = t('childDrawer.error.categoryRequired', 'Category is required.');
  }
  if (step === 3) {
    if (!String(form.parentId).trim()) errors.parentId = t('childDrawer.error.parentRequired', 'Parent is required.');
    if (!String(form.assignedStaffId).trim()) errors.assignedStaffId = t('childDrawer.error.staffRequired', 'Staff is required.');
  }
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
