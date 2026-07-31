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
import { SUBCITIES, SUBCITY_WOREDAS } from '@/lib/location-config';
import { useLocale } from '@/components/providers/locale-provider';
import { 
  ParentStatus, 
  MembershipStatus,
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
const membershipStatusOptions: MembershipStatus[] = ['PAID', 'UNPAID'];
const bracketOptions: FinancialBracket[] = ['LOW', 'MEDIUM', 'HIGH'];
const maritalOptions: MaritalStatus[] = ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'];
const employmentOptions: EmploymentStatus[] = ['EMPLOYED', 'UNEMPLOYED', 'SELF_EMPLOYED'];

const WORKLOAD_LIMIT = 10;

function parseIncomeRange(range: string): number | null {
  const cleaned = range.replace(/,/g, '').replace(/\s+/g, ' ');
  const match = cleaned.match(/(\d+)/g);
  if (!match) return null;
  const nums = match.map(Number).filter(n => n > 0);
  if (nums.length === 0) return null;
  return Math.max(...nums);
}

function bracketFromIncome(incomeRange: string): FinancialBracket | null {
  const maxIncome = parseIncomeRange(incomeRange);
  if (maxIncome === null) return null;
  if (maxIncome <= 5000) return 'LOW';
  if (maxIncome <= 15000) return 'MEDIUM';
  return 'HIGH';
}

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
  const { t } = useLocale();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState<ParentFormData>(emptyParentForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const steps = [
    t('parentDrawer.personalInfo', 'Personal Info'),
    t('parentDrawer.locationBackground', 'Location & Background'),
    t('parentDrawer.financialSocial', 'Financial & Social'),
    t('parentDrawer.assignmentNotes', 'Assignment & Notes'),
  ];

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
            const nameParts = (fallbackParent.fullName || '').split(' ');
            setForm({
              ...emptyParentForm,
              firstName: nameParts[0] || '',
              lastName: nameParts.slice(1).join(' ') || '',
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

  if (!mounted) return null;

  function updateField(field: keyof ParentFormData, value: string) {
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
      const payload = formToParentPayload(form);
      if (parentId) {
        await api.patch(`/parents/${parentId}`, payload);
        onSaved([]);
      } else {
        const res = await api.post('/parents', payload);
        onSaved(res.data.suggestedServices || []);
      }
    } catch (err: unknown) {
      setServerError(getErrorMessage(err, t('parentDrawer.error.saveFailed', 'Failed to save parent.')));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 !mt-0">
      <div className={`fixed inset-0 bg-slate-950/30 backdrop-blur-sm transition-opacity duration-300 ease-out ${
        visible ? 'opacity-100' : 'opacity-0'
      }`} onClick={onClose} />
      <aside className={`absolute right-0 top-0 h-full w-full max-w-2xl bg-white dark:bg-neutral-900 shadow-xl flex flex-col transition-transform duration-300 ease-out ${
        visible ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex items-center justify-between border-b px-6 py-3">
          <div>
            <h2 className="text-lg font-semibold">
              {parentId ? t('parentDrawer.editTitle', 'Edit Parent Profile') : t('parentDrawer.registerTitle', 'Register New Parent')}
            </h2>
            <p className="text-sm text-muted-foreground">{steps[step]}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="border-b px-6 py-3">
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

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-3 px-6 pb-5">
              {[...Array(8)].map((_, index) => (
                <div key={index} className="h-10 animate-pulse rounded bg-slate-100" />
              ))}
            </div>
          ) : (
            <div className="px-6 pb-5">
              {serverError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {serverError}
                </div>
              )}
              {step === 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label={t('parentDrawer.firstName', 'First Name')} error={errors.firstName}>
                    <Input
                      value={form.firstName}
                      onChange={(event) => updateField('firstName', event.target.value)}
                    />
                  </FormField>
                  <FormField label={t('parentDrawer.lastName', 'Last Name')} error={errors.lastName}>
                    <Input
                      value={form.lastName}
                      onChange={(event) => updateField('lastName', event.target.value)}
                    />
                  </FormField>
                  <FormField label={t('parentDrawer.photoUpload', 'Photo Upload')} error={errors.photoUrl}>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={form.photoUrl || undefined} alt={`${form.firstName} ${form.lastName}` || t('parentDrawer.parent', 'Parent')} />
                        <AvatarFallback>{initials(`${form.firstName} ${form.lastName}` || t('parentDrawer.parent', 'Parent'))}</AvatarFallback>
                      </Avatar>
                      <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                        <Upload className="h-4 w-4" />
                        {t('parentDrawer.upload', 'Upload')}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => {
                            handlePhotoUpload(event, (value) => updateField('photoUrl', value)).catch((error: unknown) => {
                              setErrors((current) => ({
                                ...current,
                                photoUrl: error instanceof Error ? error.message : t('parentDrawer.error.photoProcess', 'Could not process photo.'),
                              }));
                            });
                          }}
                        />
                      </label>
                    </div>
                  </FormField>
                  <FormField label={t('parentDrawer.dateOfBirth', 'Date of Birth')} error={errors.dateOfBirth}>
                    <CalendarDatePicker
                      value={form.dateOfBirth}
                      onChange={(value) => updateField('dateOfBirth', value)}
                      minYear={1900}
                      maxYear={new Date().getUTCFullYear()}
                    />
                  </FormField>
                  <FormField label={t('parentDrawer.gender', 'Gender')} error={errors.gender}>
                    <select
                      className={selectClassName}
                      value={form.gender}
                      onChange={(event) => updateField('gender', event.target.value)}
                    >
                      <option value="">{t('parentDrawer.selectGender', 'Select gender')}</option>
                      <option value="Female">{t('parentDrawer.female', 'Female')}</option>
                      <option value="Male">{t('parentDrawer.male', 'Male')}</option>
                    </select>
                  </FormField>
                  <FormField label={t('parentDrawer.nationalId', 'National ID')} error={errors.nationalId}>
                    <Input
                      value={form.nationalId}
                      onChange={(event) => updateField('nationalId', event.target.value)}
                    />
                  </FormField>
                  <FormField label={t('parentDrawer.phoneNumber', 'Phone Number')} error={errors.phone}>
                    <Input
                      type="tel"
                      value={form.phone}
                      onChange={(event) => updateField('phone', event.target.value)}
                    />
                  </FormField>
                  <FormField label={t('parentDrawer.emailOptional', 'Email Address (Optional)')} error={errors.email} className="md:col-span-2">
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
                  <FormField label={t('parentDrawer.address', 'Address')} error={errors.address} className="md:col-span-2">
                    <Input
                      value={form.address}
                      onChange={(event) => updateField('address', event.target.value)}
                    />
                  </FormField>
                  <FormField label={t('parentDrawer.city', 'City')} error={errors.city}>
                    <select
                      className={selectClassName}
                      value={form.city}
                      onChange={(event) => updateField('city', event.target.value)}
                    >
                      <option value="">{t('parentDrawer.selectCity', 'Select city')}</option>
                      <option value="Addis Ababa">{t('parentDrawer.city.addisAbaba', 'Addis Ababa')}</option>
                      <option value="Adama">{t('parentDrawer.city.adama', 'Adama')}</option>
                      <option value="Bahir Dar">{t('parentDrawer.city.bahirDar', 'Bahir Dar')}</option>
                      <option value="Dire Dawa">{t('parentDrawer.city.direDawa', 'Dire Dawa')}</option>
                      <option value="Gondar">{t('parentDrawer.city.gondar', 'Gondar')}</option>
                      <option value="Hawassa">{t('parentDrawer.city.hawassa', 'Hawassa')}</option>
                      <option value="Jimma">{t('parentDrawer.city.jimma', 'Jimma')}</option>
                      <option value="Mekelle">{t('parentDrawer.city.mekelle', 'Mekelle')}</option>
                      <option value="Shashamane">{t('parentDrawer.city.shashamane', 'Shashamane')}</option>
                      <option value="Arba Minch">{t('parentDrawer.city.arbaMinch', 'Arba Minch')}</option>
                      <option value="Dessie">{t('parentDrawer.city.dessie', 'Dessie')}</option>
                      <option value="Harar">{t('parentDrawer.city.harar', 'Harar')}</option>
                      <option value="Jijiga">{t('parentDrawer.city.jijiga', 'Jijiga')}</option>
                    </select>
                  </FormField>
                  <FormField label={t('parentDrawer.subcity', 'Subcity')} error={errors.subcity}>
                    <select
                      className={selectClassName}
                      value={form.subcity}
                      onChange={(event) => updateField('subcity', event.target.value)}
                    >
                      <option value="">Select subcity</option>
                      {SUBCITIES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label={t('parentDrawer.woreda', 'Woreda')} error={errors.woreda}>
                    <select
                      className={selectClassName}
                      value={form.woreda}
                      onChange={(event) => updateField('woreda', event.target.value)}
                    >
                      <option value="">{t('parentDrawer.selectWoreda', 'Select woreda')}</option>
                      {(form.subcity && SUBCITY_WOREDAS[form.subcity]
                        ? SUBCITY_WOREDAS[form.subcity]
                        : []
                      ).map((w) => (
                        <option key={w} value={w}>{w}</option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label={t('parentDrawer.maritalStatus', 'Marital Status')} error={errors.maritalStatus}>
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
                  <FormField label={t('parentDrawer.educationLevel', 'Education Level')} error={errors.educationLevel}>
                    <select className={selectClassName} value={form.educationLevel} onChange={(event) => updateField('educationLevel', event.target.value)}>
                      <option value="">{t('parentDrawer.selectEducation', 'Select education level...')}</option>
                      <option value="NO_FORMAL">{t('parentDrawer.education.noFormal', 'No Formal Education')}</option>
                      <option value="PRIMARY">{t('parentDrawer.education.primary', 'Primary School')}</option>
                      <option value="SECONDARY">{t('parentDrawer.education.secondary', 'Secondary School')}</option>
                      <option value="HIGH_SCHOOL">{t('parentDrawer.education.highSchool', 'High School')}</option>
                      <option value="DIPLOMA">{t('parentDrawer.education.diploma', 'Diploma')}</option>
                      <option value="BACHELOR">{t('parentDrawer.education.bachelor', "Bachelor's Degree")}</option>
                      <option value="MASTER">{t('parentDrawer.education.master', "Master's Degree")}</option>
                      <option value="DOCTORATE">{t('parentDrawer.education.doctorate', 'Doctorate')}</option>
                      <option value="VOCATIONAL">{t('parentDrawer.education.vocational', 'Vocational Training')}</option>
                      <option value="OTHER">{t('parentDrawer.education.other', 'Other')}</option>
                    </select>
                  </FormField>
                  <FormField label={t('parentDrawer.referralSource', 'Referral Source')} error={errors.referralSource}>
                    <Input
                      value={form.referralSource}
                      onChange={(event) => updateField('referralSource', event.target.value)}
                    />
                  </FormField>
                </div>
              )}

              {step === 2 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label={t('parentDrawer.employmentStatus', 'Employment Status')} error={errors.employmentStatus}>
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
                  <FormField label={t('parentDrawer.financialBracket', 'Financial Bracket')} error={errors.financialBracket}>
                    <div className="relative">
                      <select
                        className={cn(selectClassName, 'opacity-60')}
                        value={form.financialBracket}
                        disabled
                      >
                        {bracketOptions.map((option) => (
                          <option key={option} value={option}>
                            {formatEnum(option)}
                          </option>
                        ))}
                      </select>
                      {form.monthlyIncomeRange.trim() && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground pointer-events-none">
                          {t('parentDrawer.autoCalculated', 'auto')}
                        </span>
                      )}
                    </div>
                  </FormField>
                  <FormField label={t('parentDrawer.monthlyIncome', 'Monthly Income Range')} error={errors.monthlyIncomeRange}>
                    <Input
                      placeholder={t('parentDrawer.monthlyIncomePlaceholder', 'e.g. 5,000 - 10,000 ETB')}
                      value={form.monthlyIncomeRange}
                      onChange={(event) => {
                        const val = event.target.value;
                        const bracket = bracketFromIncome(val);
                        setForm((current) => ({
                          ...current,
                          monthlyIncomeRange: val,
                          financialBracket: bracket || current.financialBracket,
                        }));
                        setErrors((current) => {
                          const next = { ...current };
                          delete next.monthlyIncomeRange;
                          delete next.financialBracket;
                          return next;
                        });
                      }}
                    />
                  </FormField>
                  <FormField label={t('parentDrawer.dependents', 'Number of Dependents')} error={errors.numberOfDependents}>
                    <Input
                      type="number"
                      min="0"
                      value={form.numberOfDependents}
                      onChange={(event) => updateField('numberOfDependents', event.target.value)}
                    />
                  </FormField>
                  <FormField label={t('parentDrawer.membershipFee', 'Membership Fee (ETB)')} error={errors.membershipFee}>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={t('parentDrawer.membershipFeePlaceholder', 'e.g. 500')}
                      value={form.membershipFee}
                      onChange={(event) => updateField('membershipFee', event.target.value)}
                    />
                  </FormField>
                  <FormField label={t('parentDrawer.membershipStatus', 'Membership Status')} error={errors.membershipStatus}>
                    <select
                      className={selectClassName}
                      value={form.membershipStatus}
                      onChange={(event) =>
                        updateField('membershipStatus', event.target.value as MembershipStatus)
                      }
                    >
                      {membershipStatusOptions.map((option) => (
                        <option key={option} value={option}>
                          {formatEnum(option)}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
              )}

              {step === 3 && (
                <div className="grid gap-4">
                  <FormField label={t('parentDrawer.assignStaff', 'Assign Case Worker')} error={errors.assignedStaffId}>
                    <div className="max-h-64 overflow-y-auto rounded-md border border-input">
                      {staffOptions.length === 0 ? (
                        <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                          {t('parentDrawer.noStaffAvailable', 'No case workers available')}
                        </div>
                      ) : (
                        staffOptions.map((worker) => {
                          const workload = (worker.parentCount || 0) + (worker.childCount || 0);
                          const atLimit = workload >= WORKLOAD_LIMIT;
                          const isSelected = form.assignedStaffId === worker.id;
                          return (
                            <button
                              key={worker.id}
                              type="button"
                              disabled={atLimit && !isSelected}
                              onClick={() => !atLimit && updateField('assignedStaffId', worker.id)}
                              className={cn(
                                'flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors border-b border-input last:border-b-0 hover:bg-muted/50',
                                isSelected && 'bg-primary/10 font-medium',
                                atLimit && !isSelected && 'opacity-40 cursor-not-allowed',
                              )}
                            >
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                                {initials(worker.fullName)}
                              </span>
                              <div className="flex-1 min-w-0">
                                <span className="block truncate font-medium">{worker.fullName}</span>
                                <span className="block text-[11px] text-muted-foreground">
                                  {t('parentDrawer.workload', '{count}/{limit} cases', { count: String(workload), limit: String(WORKLOAD_LIMIT) })}
                                </span>
                              </div>
                              {isSelected && (
                                <span className="shrink-0 rounded bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                  {t('parentDrawer.selected', 'Selected')}
                                </span>
                              )}
                              {atLimit && !isSelected && (
                                <span className="shrink-0 text-[10px] font-medium text-amber-600">
                                  {t('parentDrawer.full', 'Full')}
                                </span>
                              )}
                              {workload >= WORKLOAD_LIMIT * 0.8 && workload < WORKLOAD_LIMIT && (
                                <span className="shrink-0 text-[10px] font-medium text-amber-600">
                                  {t('parentDrawer.nearLimit', 'Near limit')}
                                </span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </FormField>
                  <FormField label={t('parentDrawer.internalNotes', 'Internal Notes')}>
                    <textarea
                      className={textareaClassName}
                      value={form.internalNotes}
                      onChange={(event) => updateField('internalNotes', event.target.value)}
                    />
                  </FormField>
                  <FormField label={t('parentDrawer.status', 'Status')} error={errors.status}>
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
            {t('parentDrawer.back', 'Back')}
          </Button>
          {step < steps.length - 1 ? (
            <Button onClick={nextStep} disabled={loading}>
              {t('parentDrawer.next', 'Next')}
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={save} disabled={saving || loading}>
              {saving ? t('parentDrawer.saving', 'Saving...') : parentId ? t('parentDrawer.saveChanges', 'Save Changes') : t('parentDrawer.registerParent', 'Register Parent')}
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

function validateStep(step: number, form: ParentFormData, t: (key: string, fallback?: string) => string) {
  const errors: Record<string, string> = {};

  if (step === 0) {
    if (!form.firstName.trim()) errors.firstName = t('parentDrawer.error.firstNameRequired', 'First name is required');
    if (!form.dateOfBirth) errors.dateOfBirth = t('parentDrawer.error.dobRequired', 'Date of birth is required');
    if (!form.gender) errors.gender = t('parentDrawer.error.genderRequired', 'Gender is required');
    if (!form.nationalId.trim()) errors.nationalId = t('parentDrawer.error.nationalIdRequired', 'National ID is required');
    if (!form.phone.trim()) errors.phone = t('parentDrawer.error.phoneRequired', 'Phone number is required');
  }

  if (step === 1) {
    if (!form.address.trim()) errors.address = t('parentDrawer.error.addressRequired', 'Address is required');
    if (!form.city.trim()) errors.city = t('parentDrawer.error.cityRequired', 'City is required');
    if (!form.subcity.trim()) errors.subcity = t('parentDrawer.error.subcityRequired', 'Subcity is required');
  }

  if (step === 3) {
    if (!form.assignedStaffId) errors.assignedStaffId = t('parentDrawer.error.staffRequired', 'Staff assignment is required');
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
