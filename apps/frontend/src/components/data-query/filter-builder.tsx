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
import { t } from '@/lib/i18n';
import { COLUMN_GROUPS, SUBCITIES, countSectionFilters } from './constants';

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
    <div className="overflow-hidden rounded-md border bg-white">
      <button
        type="button"
        className="flex w-full items-center justify-between bg-slate-50 px-3 py-2.5 text-left text-sm font-medium hover:bg-slate-100"
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
  const [services, setServices] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const [appointments, setAppointments] = useState<
    Array<{ id: string; title: string }>
  >([]);
  const [staff, setStaff] = useState<Array<{ id: string; fullName: string }>>(
    [],
  );

  useEffect(() => {
    void Promise.all([
      api
        .get('/services')
        .then((r) => setServices(r.data?.data ?? r.data ?? [])),
      api
        .get('/appointments')
        .then((r) => setAppointments(r.data?.data ?? r.data ?? [])),
      api.get('/data-query/staff').then((r) => setStaff(r.data ?? [])),
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
              <Label className="text-xs">Min Age</Label>
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
              <Label className="text-xs">Max Age</Label>
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
            <Label className="text-xs">Gender</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={filters.child?.gender ?? ''}
              onChange={(e) =>
                updateChild({ gender: e.target.value || undefined })
              }
            >
              <option value="">Any</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium">Disability Type</p>
            <MultiCheckbox
              options={[
                { value: 'PHYSICAL', label: 'Physical' },
                { value: 'INTELLECTUAL', label: 'Intellectual' },
                { value: 'MULTIPLE', label: 'Multiple' },
              ]}
              selected={filters.child?.disabilityType ?? []}
              onChange={(values) => updateChild({ disabilityType: values })}
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium">Disability Category</p>
            <MultiCheckbox
              options={[
                { value: 'Autism', label: 'Autism' },
                { value: 'Down Syndrome', label: 'Down Syndrome' },
                { value: 'Mobility Impairment', label: 'Mobility Impairment' },
                { value: 'Visual Impairment', label: 'Visual Impairment' },
                { value: 'Hearing Impairment', label: 'Hearing Impairment' },
                { value: 'Speech Impairment', label: 'Speech Impairment' },
                { value: 'Developmental Delay', label: 'Developmental Delay' },
                { value: 'Other', label: 'Other' },
              ]}
              selected={filters.child?.disabilityCategory ?? []}
              onChange={(values) => updateChild({ disabilityCategory: values })}
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium">Severity Level</p>
            <MultiCheckbox
              options={[
                { value: 'MILD', label: 'Mild' },
                { value: 'MODERATE', label: 'Moderate' },
                { value: 'SEVERE', label: 'Severe' },
              ]}
              selected={filters.child?.severityLevel ?? []}
              onChange={(values) => updateChild({ severityLevel: values })}
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium">Communication Ability</p>
            <MultiCheckbox
              options={[
                { value: 'VERBAL', label: 'Verbal' },
                { value: 'NON_VERBAL', label: 'Non-Verbal' },
                { value: 'ASSISTED', label: 'Assisted' },
              ]}
              selected={filters.child?.communicationAbility ?? []}
              onChange={(values) =>
                updateChild({ communicationAbility: values })
              }
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium">School Enrollment</p>
            <MultiCheckbox
              options={[
                { value: 'ENROLLED', label: 'Enrolled' },
                { value: 'NOT_ENROLLED', label: 'Not Enrolled' },
                { value: 'GRADUATED', label: 'Graduated' },
              ]}
              selected={filters.child?.schoolEnrollmentStatus ?? []}
              onChange={(values) =>
                updateChild({ schoolEnrollmentStatus: values })
              }
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium">Status</p>
            <MultiCheckbox
              options={[
                { value: 'ACTIVE', label: 'Active' },
                { value: 'GRADUATED', label: 'Graduated' },
                { value: 'TRANSFERRED', label: 'Transferred' },
                { value: 'INACTIVE', label: 'Inactive' },
                { value: 'DECEASED', label: 'Deceased' },
              ]}
              selected={filters.child?.status ?? []}
              onChange={(values) => updateChild({ status: values })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Registered After</Label>
              <Input
                type="date"
                value={filters.child?.registeredAfter ?? ''}
                onChange={(e) =>
                  updateChild({ registeredAfter: e.target.value || undefined })
                }
              />
            </div>
            <div>
              <Label className="text-xs">Registered Before</Label>
              <Input
                type="date"
                value={filters.child?.registeredBefore ?? ''}
                onChange={(e) =>
                  updateChild({ registeredBefore: e.target.value || undefined })
                }
              />
            </div>
          </div>
        </Section>

        <Section
          title={t('dataQuery.parentDemo', 'Parent Demographics')}
          badge={countSectionFilters(filters.parent as Record<string, unknown>)}
        >
          <MultiCheckbox
            options={[
              { value: 'LOW', label: 'Low' },
              { value: 'MEDIUM', label: 'Medium' },
              { value: 'HIGH', label: 'High' },
            ]}
            selected={filters.parent?.financialBracket ?? []}
            onChange={(values) => updateParent({ financialBracket: values })}
          />
          <MultiCheckbox
            options={[
              { value: 'ACTIVE', label: 'Active' },
              { value: 'INACTIVE', label: 'Inactive' },
              { value: 'UNDER_REVIEW', label: 'Under Review' },
            ]}
            selected={filters.parent?.status ?? []}
            onChange={(values) => updateParent({ status: values })}
          />
        </Section>

        <Section
          title={t('dataQuery.location', 'Location')}
          badge={countSectionFilters(
            filters.location as Record<string, unknown>,
          )}
        >
          <Input
            placeholder="City"
            value={filters.location?.city ?? ''}
            onChange={(e) =>
              updateLocation({ city: e.target.value || undefined })
            }
          />
          <MultiCheckbox
            options={SUBCITIES.map((s) => ({ value: s, label: s }))}
            selected={filters.location?.subcities ?? []}
            onChange={(values) => updateLocation({ subcities: values })}
          />
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
            Has NO service assigned
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
            Has NEVER attended
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
              <option value="">Any appointment</option>
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
              { value: 'ALLOCATED', label: 'Allocated' },
              { value: 'DISBURSED', label: 'Disbursed' },
              { value: 'PARTIALLY_DISBURSED', label: 'Partially Disbursed' },
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
            <Label className="text-xs">No note in the last N days</Label>
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
            <option value="">Any case worker</option>
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
            Unassigned
          </label>
        </Section>

        <div className="rounded-md border p-3">
          <h3 className="mb-2 text-sm font-semibold">
            {t('dataQuery.outputSettings', 'Output Settings')}
          </h3>
          {Object.entries(COLUMN_GROUPS).map(([group, cols]) => (
            <div key={group} className="mb-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                {group}
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
                    {col.label}
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
                  {c.label}
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
              {sortDir.toUpperCase()}
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

      <div className="sticky bottom-0 space-y-2 border-t bg-white pt-4">
        <Button className="w-full" onClick={onRun} disabled={running}>
          {running ? 'Running...' : t('dataQuery.run', 'Run Query')}
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
