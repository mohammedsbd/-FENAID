'use client';

import type { DataQueryFilters } from '@fikir/types';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import api from '@/lib/api';
import { useLocale } from '@/components/providers/locale-provider';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import { COLUMN_GROUPS, countSectionFilters, getEducationLevelLabel } from './constants';
import { ADDIS_ABABA, SUBCITIES, getWoredaOptions } from '@/lib/location-config';
import { ALL_CATEGORIES, ALL_SEVERITIES, ALL_COMMUNICATIONS, getCategoryOptions } from '@/lib/disability-config';

type DataSubject = 'CHILD' | 'PARENT' | 'PARENT_CHILD_PAIR';

interface FilterBuilderProps {
  dataSubject: DataSubject;
  onDataSubjectChange: (subject: DataSubject) => void;
  filters: DataQueryFilters;
  onFiltersChange: (filters: DataQueryFilters) => void;
  columns: string[];
  onColumnsChange: (columns: string[]) => void;
  sortBy: string;
  onSortByChange: (sortBy: string) => void;
  sortDir: 'asc' | 'desc';
  onSortDirChange: (dir: 'asc' | 'desc') => void;
  anonymize: boolean;
  onAnonymizeChange: (value: boolean) => void;
  onRun: () => void;
  onClear: () => void;
  running?: boolean;
}

function Section({
  title,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string;
  badge: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-md border bg-white dark:bg-neutral-950">
      <button
        type="button"
        className="flex w-full items-center justify-between bg-slate-50 dark:bg-neutral-800/50 px-3 py-2.5 text-left text-sm font-medium hover:bg-slate-100 dark:hover:bg-neutral-800"
        onClick={() => setOpen(!open)}
      >
        <span className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          {title}
          {badge > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
              {badge}
            </Badge>
          )}
        </span>
      </button>
      {open && <div className="space-y-3 border-t px-3 py-3">{children}</div>}
    </div>
  );
}

function MultiCheckbox({
  options,
  selected,
  onChange,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {options.map((opt) => (
        <label key={opt.value} className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={selected.includes(opt.value)}
            onCheckedChange={(checked) => {
              onChange(
                checked
                  ? [...selected, opt.value]
                  : selected.filter((v) => v !== opt.value),
              );
            }}
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}

function expandDisabilityTypes(types: string[]): string[] {
  return Array.from(
    new Set(
      types.flatMap((type) =>
        type === 'MULTIPLE' ? ['PHYSICAL', 'INTELLECTUAL'] : [type],
      ),
    ),
  );
}

export function FilterBuilder({
  dataSubject,
  onDataSubjectChange,
  filters,
  onFiltersChange,
  columns,
  onColumnsChange,
  sortBy,
  onSortByChange,
  sortDir,
  onSortDirChange,
  anonymize,
  onAnonymizeChange,
  onRun,
  onClear,
  running,
}: FilterBuilderProps) {
  const { t } = useLocale();
  const [services, setServices] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const [appointments, setAppointments] = useState<
    Array<{ id: string; title: string }>
  >([]);
  const [staff, setStaff] = useState<Array<{ id: string; fullName: string }>>(
    [],
  );
  const [educationLevels, setEducationLevels] = useState<
    Array<{ value: string; count: number }>
  >([]);
  const [childEducationLevels, setChildEducationLevels] = useState<
    Array<{ value: string; count: number }>
  >([]);

  useEffect(() => {
    void Promise.all([
      api
        .get('/services')
        .then((r) => setServices(r.data?.data ?? r.data ?? [])),
      api
        .get('/appointments')
        .then((r) => setAppointments(r.data?.data ?? r.data ?? [])),
      api.get('/data-query/staff').then((r) => setStaff(r.data ?? [])),
      api
        .get('/data-query/education-levels')
        .then((r) => setEducationLevels(r.data ?? [])),
      api
        .get('/data-query/education-levels', { params: { subject: 'CHILD' } })
        .then((r) => setChildEducationLevels(r.data ?? [])),
    ]).catch(() => undefined);
  }, []);

  const updateChild = (
    patch: Partial<NonNullable<DataQueryFilters['child']>>,
  ) => {
    onFiltersChange({
      ...filters,
      child: { ...filters.child, ...patch },
    });
  };

  const updateParent = (
    patch: Partial<NonNullable<DataQueryFilters['parent']>>,
  ) => {
    onFiltersChange({
      ...filters,
      parent: { ...filters.parent, ...patch },
    });
  };

  const updateLocation = (
    patch: Partial<NonNullable<DataQueryFilters['location']>>,
  ) => {
    onFiltersChange({
      ...filters,
      location: { ...filters.location, ...patch },
    });
  };

  const updateServices = (
    patch: Partial<NonNullable<DataQueryFilters['services']>>,
  ) => {
    onFiltersChange({
      ...filters,
      services: { ...filters.services, ...patch },
    });
  };

  const updateTraining = (
    patch: Partial<NonNullable<DataQueryFilters['training']>>,
  ) => {
    onFiltersChange({
      ...filters,
      training: { ...filters.training, ...patch },
    });
  };

  const updateFinancial = (
    patch: Partial<NonNullable<DataQueryFilters['financial']>>,
  ) => {
    onFiltersChange({
      ...filters,
      financial: { ...filters.financial, ...patch },
    });
  };

  const updateProgress = (
    patch: Partial<NonNullable<DataQueryFilters['progress']>>,
  ) => {
    onFiltersChange({
      ...filters,
      progress: { ...filters.progress, ...patch },
    });
  };

  const updateCaseWorker = (
    patch: Partial<NonNullable<DataQueryFilters['caseWorker']>>,
  ) => {
    onFiltersChange({
      ...filters,
      caseWorker: { ...filters.caseWorker, ...patch },
    });
  };

  const subjects: { value: DataSubject; label: string }[] = [
    { value: 'CHILD', label: t('dataQuery.children', 'Children') },
    { value: 'PARENT', label: t('dataQuery.parents', 'Parents') },
    { value: 'PARENT_CHILD_PAIR', label: t('dataQuery.pairs', 'Pairs') },
  ];

  const allColumnOptions = Object.values(COLUMN_GROUPS).flat();

  const selectedDisabilityTypes = filters.child?.disabilityType ?? [];
  const effectiveDisabilityTypes = selectedDisabilityTypes.length
    ? expandDisabilityTypes(selectedDisabilityTypes)
    : [];
  const disabilityCategoryGroups = effectiveDisabilityTypes.length
    ? effectiveDisabilityTypes.map((type) => ({
        label: t(`enum.disabilityType.${type.toLowerCase()}`, type),
        values: getCategoryOptions(type),
      }))
    : [{ label: '', values: ALL_CATEGORIES }];

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <div>
          <Label className="mb-2 block">
            {t('dataQuery.showResultsFor', 'Show results for')}
          </Label>
          <div className="flex flex-wrap gap-2">
            {subjects.map((s) => (
              <Button
                key={s.value}
                type="button"
                size="sm"
                variant={dataSubject === s.value ? 'default' : 'outline'}
                onClick={() => onDataSubjectChange(s.value)}
              >
                {s.label}
              </Button>
            ))}
          </div>
        </div>

        <Section
          title={t('dataQuery.childDemo', 'Child Demographics')}
          badge={countSectionFilters(filters.child as Record<string, unknown>)}
          defaultOpen={dataSubject !== 'PARENT'}
        >
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">{t('filterBuilder.minAge', 'Min Age')}</Label>
              <Input
                type="number"
                value={filters.child?.ageMin ?? ''}
                onChange={(e) =>
                  updateChild({
                    ageMin: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </div>
            <div>
              <Label className="text-xs">{t('filterBuilder.maxAge', 'Max Age')}</Label>
              <Input
                type="number"
                value={filters.child?.ageMax ?? ''}
                onChange={(e) =>
                  updateChild({
                    ageMax: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">{t('filterBuilder.gender', 'Gender')}</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={filters.child?.gender ?? ''}
              onChange={(e) =>
                updateChild({ gender: e.target.value || undefined })
              }
            >
              <option value="">{t('filterBuilder.any', 'Any')}</option>
              <option value="Male">{t('enum.gender.male', 'Male')}</option>
              <option value="Female">{t('enum.gender.female', 'Female')}</option>
            </select>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium">{t('filterBuilder.disabilityType', 'Disability Type')}</p>
            <MultiCheckbox
              options={[
                { value: 'PHYSICAL', label: t('enum.disabilityType.physical', 'Physical') },
                { value: 'INTELLECTUAL', label: t('enum.disabilityType.intellectual', 'Intellectual') },
                { value: 'MULTIPLE', label: t('enum.disabilityType.multiple', 'Multiple') },
              ]}
              selected={filters.child?.disabilityType ?? []}
              onChange={(values) => {
                const effective = expandDisabilityTypes(values);
                const allowed = effective.length
                  ? new Set(effective.flatMap((type) => getCategoryOptions(type)))
                  : new Set(ALL_CATEGORIES);
                updateChild({
                  disabilityType: values,
                  disabilityCategory: (filters.child?.disabilityCategory ?? []).filter(
                    (c) => allowed.has(c),
                  ),
                });
              }}
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium">{t('filterBuilder.disabilityCategory', 'Disability Category')}</p>
            <div className="space-y-3">
              {disabilityCategoryGroups.map((group) => (
                <div key={group.label}>
                  {group.label && (
                    <p className="mb-1 text-xs font-semibold text-muted-foreground">{group.label}</p>
                  )}
                  <MultiCheckbox
                    options={group.values.map((c) => ({ value: c, label: t(`enum.disabilityCategory.${c.toLowerCase().replace(/\s+/g, '')}`, c) }))}
                    selected={filters.child?.disabilityCategory ?? []}
                    onChange={(values) => updateChild({ disabilityCategory: values })}
                  />
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium">{t('filterBuilder.severityLevel', 'Severity Level')}</p>
            <MultiCheckbox
              options={ALL_SEVERITIES.map(s => ({ value: s, label: t(`enum.severity.${s.toLowerCase()}`, s) }))}
              selected={filters.child?.severityLevel ?? []}
              onChange={(values) => updateChild({ severityLevel: values })}
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium">{t('filterBuilder.communicationAbility', 'Communication Ability')}</p>
            <MultiCheckbox
              options={ALL_COMMUNICATIONS.map(c => ({ value: c, label: t(`enum.communication.${c.toLowerCase()}`, c) }))}
              selected={filters.child?.communicationAbility ?? []}
              onChange={(values) =>
                updateChild({ communicationAbility: values })
              }
            />
          </div>
          {dataSubject !== 'PARENT' && (
            <div>
              <p className="mb-1 text-xs font-medium">{t('filterBuilder.schoolEnrollment', 'School Enrollment')}</p>
              <MultiCheckbox
                options={[
                  { value: 'ENROLLED', label: t('enum.schoolStatus.enrolled', 'Enrolled') },
                  { value: 'NOT_ENROLLED', label: t('enum.schoolStatus.not_enrolled', 'Not Enrolled') },
                  { value: 'GRADUATED', label: t('enum.schoolStatus.graduated', 'Graduated') },
                ]}
                selected={filters.child?.schoolEnrollmentStatus ?? []}
                onChange={(values) =>
                  updateChild({ schoolEnrollmentStatus: values })
                }
              />
            </div>
          )}
          {dataSubject !== 'PARENT' && (
            <div>
              <p className="mb-1 text-xs font-medium">{t('filterBuilder.educationLevel', 'Education Level')}</p>
              {childEducationLevels.length ? (
                <MultiCheckbox
                  options={childEducationLevels.map((el) => ({
                    value: el.value,
                    label: `${getEducationLevelLabel(el.value)} (${el.count})`,
                  }))}
                  selected={filters.child?.educationLevel ?? []}
                  onChange={(values) => updateChild({ educationLevel: values })}
                />
              ) : (
                <p className="text-xs text-muted-foreground">{t('filterBuilder.noEducationLevels', 'No education levels found')}</p>
              )}
            </div>
          )}
          <div>
            <p className="mb-1 text-xs font-medium">{t('filterBuilder.status', 'Status')}</p>
            <MultiCheckbox
              options={[
                { value: 'ACTIVE', label: t('enum.childStatus.active', 'Active') },
                { value: 'GRADUATED', label: t('enum.childStatus.graduated', 'Graduated') },
                { value: 'TRANSFERRED', label: t('enum.childStatus.transferred', 'Transferred') },
                { value: 'INACTIVE', label: t('enum.childStatus.inactive', 'Inactive') },
                { value: 'DECEASED', label: t('enum.childStatus.deceased', 'Deceased') },
              ]}
              selected={filters.child?.status ?? []}
              onChange={(values) => updateChild({ status: values })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label className="text-xs">{t('filterBuilder.registeredAfter', 'Registered After')}</Label>
              <CalendarDatePicker
                value={filters.child?.registeredAfter ?? ''}
                onChange={(value) => updateChild({ registeredAfter: value || undefined })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">{t('filterBuilder.registeredBefore', 'Registered Before')}</Label>
              <CalendarDatePicker
                value={filters.child?.registeredBefore ?? ''}
                onChange={(value) => updateChild({ registeredBefore: value || undefined })}
              />
            </div>
          </div>
        </Section>

        <Section
          title={t('dataQuery.parentDemo', 'Parent Demographics')}
          badge={countSectionFilters(filters.parent as Record<string, unknown>)}
        >
          <div>
            <p className="mb-1 text-xs font-medium">{t('filterBuilder.financialBracket', 'Financial Bracket')}</p>
            <MultiCheckbox
              options={[
                { value: 'LOW', label: t('enum.financialBracket.low', 'Low') },
                { value: 'MEDIUM', label: t('enum.financialBracket.medium', 'Medium') },
                { value: 'HIGH', label: t('enum.financialBracket.high', 'High') },
              ]}
              selected={filters.parent?.financialBracket ?? []}
              onChange={(values) => updateParent({ financialBracket: values })}
            />
          </div>
          {dataSubject !== 'CHILD' && (
            <div>
              <p className="mb-1 text-xs font-medium">{t('filterBuilder.schoolEnrollment', 'School Enrollment')}</p>
              {educationLevels.length ? (
                <MultiCheckbox
                  options={educationLevels.map((el) => ({
                    value: el.value,
                    label: `${getEducationLevelLabel(el.value)} (${el.count})`,
                  }))}
                  selected={filters.parent?.educationLevel ?? []}
                  onChange={(values) => updateParent({ educationLevel: values })}
                />
              ) : (
                <p className="text-xs text-muted-foreground">{t('filterBuilder.noEducationLevels', 'No education levels found')}</p>
              )}
            </div>
          )}
          <div>
            <p className="mb-1 text-xs font-medium">{t('filterBuilder.parentStatus', 'Parent Status')}</p>
            <MultiCheckbox
              options={[
                { value: 'ACTIVE', label: t('enum.parentStatus.active', 'Active') },
                { value: 'INACTIVE', label: t('enum.parentStatus.inactive', 'Inactive') },
                { value: 'UNDER_REVIEW', label: t('enum.parentStatus.underReview', 'Under Review') },
              ]}
              selected={filters.parent?.status ?? []}
              onChange={(values) => updateParent({ status: values })}
            />
          </div>
        </Section>

        <Section
          title={t('dataQuery.location', 'Location')}
          badge={countSectionFilters(
            filters.location as Record<string, unknown>,
          )}
        >
          <div>
            <Label className="text-xs">{t('filterBuilder.city', 'City')}</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={filters.location?.city ?? ''}
              onChange={(e) => {
                const city = e.target.value;
                updateLocation({
                  city: city || undefined,
                  subcities: city === ADDIS_ABABA ? filters.location?.subcities : undefined,
                  woreda: city === ADDIS_ABABA ? filters.location?.woreda : undefined,
                });
              }}
            >
              <option value="">{t('filterBuilder.any', 'Any')}</option>
              <option value={ADDIS_ABABA}>{ADDIS_ABABA}</option>
            </select>
          </div>
          {filters.location?.city === ADDIS_ABABA && (
            <>
              <div>
                <p className="mb-1 text-xs font-medium">{t('filterBuilder.subcity', 'Subcity')}</p>
                <MultiCheckbox
                  options={SUBCITIES.map((s) => ({ value: s, label: s }))}
                  selected={filters.location?.subcities ?? []}
                  onChange={(values) =>
                    updateLocation({
                      subcities: values,
                      woreda: values.length ? filters.location?.woreda : undefined,
                    })
                  }
                />
              </div>
              {(filters.location?.subcities?.length ?? 0) > 0 && (
                <div>
                  <Label className="text-xs">{t('filterBuilder.woreda', 'Woreda')}</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={filters.location?.woreda ?? ''}
                    onChange={(e) =>
                      updateLocation({ woreda: e.target.value || undefined })
                    }
                  >
                    <option value="">{t('filterBuilder.any', 'Any')}</option>
                    {getWoredaOptions(filters.location?.subcities ?? []).map((w) => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}
        </Section>

        <Section
          title={t('dataQuery.services', 'Services')}
          badge={countSectionFilters(
            filters.services as Record<string, unknown>,
          )}
        >
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={filters.services?.hasNoService ?? false}
              onCheckedChange={(checked) =>
                updateServices({ hasNoService: Boolean(checked) })
              }
            />
            {t('filterBuilder.hasNoService', 'Has NO service assigned')}
          </label>
          {!filters.services?.hasNoService && (
            <MultiCheckbox
              options={services.map((s) => ({ value: s.id, label: s.name }))}
              selected={filters.services?.serviceIds ?? []}
              onChange={(values) => updateServices({ serviceIds: values })}
            />
          )}
        </Section>

        <Section
          title={t('dataQuery.training', 'Training & Workshops')}
          badge={countSectionFilters(
            filters.training as Record<string, unknown>,
          )}
        >
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={filters.training?.hasNeverAttended ?? false}
              onCheckedChange={(checked) =>
                updateTraining({ hasNeverAttended: Boolean(checked) })
              }
            />
            {t('filterBuilder.hasNeverAttended', 'Has NEVER attended')}
          </label>
          {!filters.training?.hasNeverAttended && (
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={filters.training?.appointmentIds?.[0] ?? ''}
              onChange={(e) =>
                updateTraining({
                  appointmentIds: e.target.value ? [e.target.value] : undefined,
                })
              }
            >
              <option value="">{t('filterBuilder.anyAppointment', 'Any appointment')}</option>
              {appointments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          )}
        </Section>

        <Section
          title={t('dataQuery.financial', 'Financial Support')}
          badge={countSectionFilters(
            filters.financial as Record<string, unknown>,
          )}
        >
          <MultiCheckbox
            options={[
              { value: 'ALLOCATED', label: t('enum.allocationStatus.allocated', 'Allocated') },
              { value: 'DISBURSED', label: t('enum.allocationStatus.disbursed', 'Disbursed') },
              { value: 'PARTIALLY_DISBURSED', label: t('enum.allocationStatus.partiallyDisbursed', 'Partially Disbursed') },
            ]}
            selected={filters.financial?.allocationStatus ?? []}
            onChange={(values) => updateFinancial({ allocationStatus: values })}
          />
        </Section>

        <Section
          title={t('dataQuery.progress', 'Progress & Milestones')}
          badge={countSectionFilters(
            filters.progress as Record<string, unknown>,
          )}
        >
          <div>
            <Label className="text-xs">{t('filterBuilder.noNoteInLastNDays', 'No note in the last N days')}</Label>
            <Input
              type="number"
              value={filters.progress?.noNoteInLastDays ?? ''}
              onChange={(e) =>
                updateProgress({
                  noNoteInLastDays: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                })
              }
            />
          </div>
        </Section>

        <Section
          title={t('dataQuery.caseWorker', 'Case Worker')}
          badge={countSectionFilters(
            filters.caseWorker as Record<string, unknown>,
          )}
        >
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
            disabled={filters.caseWorker?.unassigned}
            value={filters.caseWorker?.staffId ?? ''}
            onChange={(e) =>
              updateCaseWorker({ staffId: e.target.value || undefined })
            }
          >
            <option value="">{t('filterBuilder.anyCaseWorker', 'Any case worker')}</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={filters.caseWorker?.unassigned ?? false}
              onCheckedChange={(checked) =>
                updateCaseWorker({
                  unassigned: Boolean(checked),
                  staffId: checked ? undefined : filters.caseWorker?.staffId,
                })
              }
            />
            {t('filterBuilder.unassigned', 'Unassigned')}
          </label>
        </Section>

        <div className="rounded-md border p-3">
          <h3 className="mb-2 text-sm font-semibold">
            {t('dataQuery.outputSettings', 'Output Settings')}
          </h3>
          {Object.entries(COLUMN_GROUPS).map(([group, cols]) => (
            <div key={group} className="mb-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                {t('columnGroup.' + group.toLowerCase(), group)}
              </p>
              <div className="grid grid-cols-1 gap-1">
                {cols.map((col) => (
                  <label
                    key={col.key}
                    className="flex items-center gap-2 text-xs"
                  >
                    <Checkbox
                      checked={columns.includes(col.key)}
                      onCheckedChange={(checked) => {
                        onColumnsChange(
                          checked
                            ? [...columns, col.key]
                            : columns.filter((c) => c !== col.key),
                        );
                      }}
                    />
                    {t('column.' + group.toLowerCase() + '.' + col.key, col.label)}
                  </label>
                ))}
              </div>
            </div>
          ))}
          <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value)}
            >
                  {allColumnOptions.map((c) => (
                    <option key={c.key} value={c.key}>
                      {t('column.' + c.key, c.label)}
                    </option>
                  ))}
            </select>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                onSortDirChange(sortDir === 'asc' ? 'desc' : 'asc')
              }
            >
              {t('dataQuery.' + sortDir, sortDir.toUpperCase())}
            </Button>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <Checkbox
              checked={anonymize}
              onCheckedChange={(c) => onAnonymizeChange(Boolean(c))}
            />
            {t('dataQuery.anonymize', 'Anonymize data')}
          </label>
        </div>
      </div>

      <div className="sticky bottom-0 space-y-2 border-t bg-white dark:bg-neutral-950 pt-4">
        <Button className="w-full" onClick={onRun} disabled={running}>
          {running ? t('dataQuery.running', 'Running...') : t('dataQuery.run', 'Run Query')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={onClear}
        >
          {t('dataQuery.clear', 'Clear All Filters')}
        </Button>
      </div>
    </div>
  );
}
