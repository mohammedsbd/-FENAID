'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import {
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileUp,
  Files,
  UserRound,
  Stethoscope,
  Accessibility,
  Brain,
  History,
  TrendingUp,
  Target,
  ClipboardList,
  Wallet,
  Clock,
  Pencil,
  UserMinus,
  UserPlus,
  Briefcase,
  Plus,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLocale } from '@/components/providers/locale-provider';
import { t as tI18n } from '@/lib/i18n';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { ExportButton } from '@/components/dashboard/export-button';
import { ChildDrawer } from '@/components/dashboard/child-drawer';
import { DeactivateConfirmationModal } from '@/components/dashboard/deactivate-confirmation-modal';
import {
  exportToCSV,
  exportToPDF,
  exportToWordHTML,
  exportProfileToExcel,
  formatEnum,
  escapeHTML,
} from '@/lib/export';
import { useToast } from '@/hooks/use-toast';
import { ChildRow, StaffOption } from '@/types/children';
import { useCalendarSettings } from '@/components/providers/calendar-settings-provider';
import {
  CalendarSystem,
  ethiopianMonths,
  formatCalendarDate,
  gregorianMonths,
  gregorianToEthiopian,
  parseIsoDate,
  toIsoDateInputValue,
} from '@/lib/calendar';
import { AssignServiceDrawer } from '@/components/services/AssignServiceDrawer';
import { ReferralDrawer } from '@/components/services/ReferralDrawer';
import { AppointmentDrawer } from '@/components/dashboard/appointments/appointment-drawer';
import { AllocationDrawer } from '@/components/dashboard/funds/allocation-drawer';
import { DocumentUploadDrawer } from '@/components/dashboard/document-upload-drawer';
import { getSession } from '@/lib/auth';

// Types
type ChildProfile = {
  id: string;
  idTag?: string | null;
  fullName: string;
  photoUrl?: string | null;
  dateOfBirth: string;
  gender: string;
  disabilityType: string;
  disabilityCategory: string;
  severityLevel: string;
  medicalHistory?: string | null;
  medications?: string | null;
  schoolEnrollmentStatus: string;
  communicationAbility: string;
  status: string;
  internalNotes?: string | null;
  createdAt: string;
  parents: Array<{
    parent: {
      id: string;
      fullName: string;
      photoUrl?: string | null;
      phone: string;
      financialBracket: string;
      fundAllocations: any[];
    };
  }>;
  assignedStaff?: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  } | null;
  serviceAssignments: any[];
  progressNotes: any[];
  milestones: any[];
  goals: any[];
  appointments: any[];
  documents: any[];
  fundAllocations?: any[];
};

const tabs = [
  'Profile',
  'Progress',
  'Services',
  'Appointments',
  'Referrals',
  'Fund & Finance',
  'Documents',
] as const;
type Tab = (typeof tabs)[number];

export default function ChildProfilePage() {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const { t } = useLocale();
  const { calendarSystem } = useCalendarSettings();
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('Profile');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [userRole, setUserRole] = useState('');
  const [assignDrawerOpen, setAssignDrawerOpen] = useState(false);
  const [appointmentDrawerOpen, setAppointmentDrawerOpen] = useState(false);
  const [referralDrawerOpen, setReferralDrawerOpen] = useState(false);
  const [allocationDrawerOpen, setAllocationDrawerOpen] = useState(false);
  const [documentUploadOpen, setDocumentUploadOpen] = useState(false);

  const fetchChild = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/children/${params.id}`);
      setChild(res.data);
    } catch (err: unknown) {
      setError(getErrorMessage(err, t('children.detail.errorLoad', 'Failed to load child profile.')));
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  const fetchStaff = useCallback(async () => {
    try {
      const res = await api.get('/dashboard/admin');
      const options = (res.data.caseWorkerWorkload || []).map(
        (worker: { staffId: string; staffName: string; parentCount: number; childCount: number }) => ({
          id: worker.staffId,
          fullName: worker.staffName,
          parentCount: worker.parentCount,
          childCount: worker.childCount,
        }),
      );
      setStaff(options);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    void fetchChild();
    void fetchStaff();
  }, [fetchChild, fetchStaff]);

  useEffect(() => {
    const session = getSession();
    setUserRole(session?.role ?? '');
  }, []);

  const handleToggleStatus = async () => {
    if (!child) return;
    try {
      await api.delete(`/children/${child.id}`);
      const isActivating = child.status === 'INACTIVE';
      toast({
        title: isActivating ? t('children.detail.toastActivated', 'Profile Activated') : t('children.detail.toastDeactivated', 'Profile Deactivated'),
        description: t('children.detail.toastDescription', '{name} has been successfully {action}.', { name: child.fullName, action: isActivating ? t('children.detail.activatedAction', 'activated') : t('children.detail.deactivatedAction', 'deactivated') }),
      });
      setShowDeactivateModal(false);
      await fetchChild();
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: t('children.detail.error', 'Error'),
        description: getErrorMessage(err, t('children.detail.errorUpdateStatus', 'Failed to update child status.')),
      });
    }
  };

  const handleExport = (formatType: 'pdf' | 'csv' | 'excel' | 'docx') => {
    if (!child) return;
    setExporting(true);

    const filename = `child-${child.fullName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}`;
    const title = `${t('children.detail.export.profileTitle', 'Child Profile')}: ${child.fullName}`;

    const profileSections = [
      {
        title: t('children.detail.export.personalInfo', 'Personal Information'),
        fields: [
          [t('children.detail.export.fullName', 'Full Name'), child.fullName],
          [t('children.detail.export.gender', 'Gender'), t('enum.gender.' + (child.gender || '').toLowerCase(), child.gender)],
          [t('children.detail.export.dateOfBirth', 'Date of Birth'), formatDate(child.dateOfBirth, calendarSystem)],
          [t('children.detail.export.age', 'Age'), `${calculateAge(child.dateOfBirth)} ${t('children.detail.export.years', 'years')}`],
          [t('children.detail.export.communication', 'Communication'), t('enum.communication.' + (child.communicationAbility || '').toLowerCase(), formatEnum(child.communicationAbility))],
          [t('children.detail.export.status', 'Status'), t('enum.childStatus.' + (child.status || '').toLowerCase(), formatEnum(child.status))],
        ] as [string, string][],
      },
      {
        title: t('children.detail.export.disabilityEducation', 'Disability & Education'),
        fields: [
          [t('children.detail.export.type', 'Type'), t('enum.disabilityType.' + (child.disabilityType || '').toLowerCase(), formatEnum(child.disabilityType))],
          [t('children.detail.export.category', 'Category'), child.disabilityCategory],
          [t('children.detail.export.severity', 'Severity'), t('enum.severity.' + (child.severityLevel || '').toLowerCase(), formatEnum(child.severityLevel))],
          [t('children.detail.export.schoolStatus', 'School Status'), t('enum.schoolStatus.' + (child.schoolEnrollmentStatus || '').toLowerCase(), formatEnum(child.schoolEnrollmentStatus))],
        ] as [string, string][],
      },
      {
        title: t('children.detail.export.medicalAssignment', 'Medical & Assignment'),
        fields: [
          [t('children.detail.export.parent', 'Parent'), (child.parents || []).map((cp: any) => cp.parent?.fullName).filter(Boolean).join(', ')],
          [t('children.detail.export.caseWorker', 'Case Worker'), child.assignedStaff?.fullName || t('children.detail.export.unassigned', 'Unassigned')],
          [t('children.detail.export.registeredDate', 'Registered Date'), formatDate(child.createdAt, calendarSystem)],
        ] as [string, string][],
      },
    ];

    if (formatType === 'csv') {
      const headers = [t('children.detail.export.field', 'Field'), t('children.detail.export.value', 'Value')];
      const rows = profileSections.flatMap((s) => [[s.title, ''], ...s.fields]);
      exportToCSV(headers, rows, `${filename}.csv`);
    } else if (formatType === 'excel') {
      exportProfileToExcel(title, profileSections, `${filename}.xls`);
    } else if (formatType === 'docx') {
      let contentHTML = '';
      profileSections.forEach((section) => {
        contentHTML += `<h2>${escapeHTML(section.title)}</h2>`;
        contentHTML += `<table><tbody>`;
        section.fields.forEach(([label, value]) => {
          contentHTML += `<tr><td class="label">${escapeHTML(label)}</td><td>${escapeHTML(value)}</td></tr>`;
        });
        contentHTML += `</tbody></table>`;
      });
      if (child.medicalHistory || child.medications) {
        contentHTML += `<h2>${t('children.detail.export.medicalBackground', 'Medical Background')}</h2>`;
        if (child.medicalHistory) contentHTML += `<p><b>${t('children.detail.export.history', 'History')}:</b> ${escapeHTML(child.medicalHistory)}</p>`;
        if (child.medications) contentHTML += `<p><b>${t('children.detail.export.medications', 'Medications')}:</b> ${escapeHTML(child.medications)}</p>`;
      }
      exportToWordHTML(title, contentHTML, `${filename}.doc`);
    } else if (formatType === 'pdf') {
      let htmlBody = `<div class="grid">`;
      profileSections.forEach((section) => {
        htmlBody += `<div class="field" style="grid-column: span 2; background: #f1f5f9; font-weight: bold; margin-top: 10px;">${escapeHTML(section.title)}</div>`;
        section.fields.forEach(([label, value]) => {
          htmlBody += `
            <div class="field">
              <div class="label">${escapeHTML(label)}</div>
              <div class="value">${escapeHTML(value)}</div>
            </div>
          `;
        });
      });
      htmlBody += `</div>`;
      if (child.medicalHistory || child.medications) {
        htmlBody += `<h2>${t('children.detail.export.medicalBackground', 'Medical Background')}</h2>`;
        if (child.medicalHistory) htmlBody += `<div class="field"><strong>${t('children.detail.export.history', 'History')}:</strong><br/>${escapeHTML(child.medicalHistory)}</div>`;
        if (child.medications) htmlBody += `<div class="field"><strong>${t('children.detail.export.medications', 'Medications')}:</strong><br/>${escapeHTML(child.medications)}</div>`;
      }
      exportToPDF(title, htmlBody);
    }

    setExporting(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-40 animate-pulse rounded-lg bg-slate-100 dark:bg-neutral-800" />
        <div className="h-96 animate-pulse rounded-lg bg-slate-100 dark:bg-neutral-800" />
      </div>
    );
  }

  if (error || !child) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm font-medium text-muted-foreground">{error || t('children.detail.notFound', 'Child profile not found.')}</p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/children">{t('children.detail.backToList', 'Back to Children')}</Link>
        </Button>
      </div>
    );
  }

  const canWrite = userRole === 'SUPER_ADMIN' || userRole === 'CASE_WORKER';

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <Avatar className="h-24 w-24 border shadow-sm">
              <AvatarImage src={child.photoUrl || undefined} alt={child.fullName} />
              <AvatarFallback className="text-2xl">{initials(child.fullName)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight">{child.fullName}</h1>
                  <span className="font-mono text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{child.idTag || t('children.detail.idTagPlaceholder', '---')}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {t('children.detail.yearsOld', '{age} years old', { age: String(calculateAge(child.dateOfBirth)) })}
                  </span>
                  <span className="flex items-center gap-1">
                    <DisabilityIcon type={child.disabilityType as any} />
                    {t('enum.disabilityType.' + (child.disabilityType || '').toLowerCase(), formatEnum(child.disabilityType))}
                  </span>
                  <span className="flex items-center gap-1">
                    <UserRound className="h-4 w-4" />
                    {t('children.detail.parentLabel', 'Parent(s)')}: {(child.parents || []).map((cp: any, i: number) => (
                      <span key={cp.parent?.id}>
                        {i > 0 && <span className="mx-1 text-muted-foreground">&</span>}
                        <Link href={`/dashboard/parents/${cp.parent?.id}`} className="text-primary hover:underline font-medium">{cp.parent?.fullName}</Link>
                      </span>
                    ))}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={child.status as any} />
                <SeverityBadge level={child.severityLevel as any} />
                <Badge variant="outline" className="bg-slate-50 dark:bg-neutral-800 dark:text-neutral-400">{child.disabilityCategory}</Badge>
              </div>
            </div>
                        <div className="flex flex-row flex-wrap items-center gap-2">
              <ExportButton onExport={handleExport} loading={exporting} />
              <Button variant="outline" size="sm" onClick={() => setDrawerOpen(true)}>
                  <Pencil className="h-4 w-4" />
                  {t('children.detail.editProfile', 'Edit Profile')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'gap-2',
                  child.status === 'INACTIVE'
                    ? 'text-emerald-600 hover:text-emerald-700'
                    : 'text-red-600 hover:text-red-700',
                )}
                onClick={() => setShowDeactivateModal(true)}
              >
                {child.status === 'INACTIVE' ? <UserPlus className="h-4 w-4" /> : <UserMinus className="h-4 w-4" />}
                {child.status === 'INACTIVE' ? t('children.detail.activate', 'Activate') : t('children.detail.deactivate', 'Deactivate')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Navigation */}
      <div className="flex gap-2 overflow-x-auto border-b">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              'whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors',
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t(`children.detail.tab.${tab.toLowerCase().replace(/[\s&]+/g, '_')}`, tab)}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="mt-6">
        {activeTab === 'Profile' && <ProfileTab child={child} calendarSystem={calendarSystem} />}
        {activeTab === 'Progress' && <ProgressTab child={child} calendarSystem={calendarSystem} />}
        {activeTab === 'Services' && <ServicesTab child={child} calendarSystem={calendarSystem} onAssignService={() => setAssignDrawerOpen(true)} canWrite={canWrite} />}
        {activeTab === 'Appointments' && <AppointmentsTab child={child} calendarSystem={calendarSystem} onScheduleNew={() => setAppointmentDrawerOpen(true)} canWrite={canWrite} />}
        {activeTab === 'Referrals' && <ReferralsTab child={child} calendarSystem={calendarSystem} onNewReferral={() => setReferralDrawerOpen(true)} canWrite={canWrite} />}
        {activeTab === 'Fund & Finance' && <FinanceTab child={child} calendarSystem={calendarSystem} onNewAllocation={() => setAllocationDrawerOpen(true)} canWrite={canWrite} />}
        {activeTab === 'Documents' && <DocumentsTab child={child} calendarSystem={calendarSystem} onUpload={() => setDocumentUploadOpen(true)} canWrite={canWrite} />}
      </div>

      <ChildDrawer
        open={drawerOpen}
        childId={child.id}
        fallbackChild={profileToChildRow(child)}
        staffOptions={staff}
        onClose={() => setDrawerOpen(false)}
        onSaved={async () => {
          setDrawerOpen(false);
          await fetchChild();
          toast({
            title: t('children.detail.profileUpdated', 'Profile Updated'),
            description: t('children.detail.profileSaved', 'The child profile has been saved successfully.'),
          });
        }}
      />

      {showDeactivateModal && (
        <DeactivateConfirmationModal
          name={child.fullName}
          title={child.status === 'INACTIVE' ? t('children.detail.deactivateTitleActivate', 'Activate Profile?') : t('children.detail.deactivateTitleDeactivate', 'Deactivate Profile?')}
          description={
            child.status === 'INACTIVE'
              ? t('children.detail.deactivateDescActivate', 'Are you sure you want to activate {name}? This will restore their access in the system.', { name: child.fullName })
              : undefined
          }
          confirmLabel={child.status === 'INACTIVE' ? t('children.detail.deactivateConfirmActivate', 'Activate Now') : t('children.detail.deactivateConfirmDeactivate', 'Deactivate Now')}
          onConfirm={handleToggleStatus}
          onCancel={() => setShowDeactivateModal(false)}
        />
      )}

      <AssignServiceDrawer
        open={assignDrawerOpen}
        onClose={() => setAssignDrawerOpen(false)}
        onSaved={() => { setAssignDrawerOpen(false); fetchChild(); }}
        userRole={userRole}
        defaultTargetType="CHILD"
        defaultTargetId={child.id}
        defaultTargetName={child.fullName}
      />
      <AppointmentDrawer
        open={appointmentDrawerOpen}
        onClose={() => setAppointmentDrawerOpen(false)}
        onSuccess={() => { setAppointmentDrawerOpen(false); fetchChild(); }}
        defaultChildId={child.id}
        defaultChildName={child.fullName}
      />
      <ReferralDrawer
        open={referralDrawerOpen}
        referral={null}
        onClose={() => setReferralDrawerOpen(false)}
        onSaved={() => { setReferralDrawerOpen(false); fetchChild(); }}
        userRole={userRole}
        defaultTargetType="CHILD"
        defaultTargetId={child.id}
        defaultTargetName={child.fullName}
      />
      <AllocationDrawer
        open={allocationDrawerOpen}
        onClose={() => setAllocationDrawerOpen(false)}
        onSuccess={() => { setAllocationDrawerOpen(false); fetchChild(); }}
        defaultTargetType="CHILD"
        defaultTargetId={child.id}
        defaultTargetName={child.fullName}
      />
      <DocumentUploadDrawer
        open={documentUploadOpen}
        onClose={() => setDocumentUploadOpen(false)}
        onSuccess={() => { setDocumentUploadOpen(false); fetchChild(); }}
        childId={child.id}
      />
    </div>
  );
}

// Sub-components for Tabs
function ProfileTab({
  child,
  calendarSystem,
}: {
  child: ChildProfile;
  calendarSystem: CalendarSystem;
}) {
  const { t } = useLocale();
  const groups = [
    {
      title: t('children.detail.profileTab.personalInfo', 'Personal Information'),
      icon: UserRound,
      fields: [
        [t('children.detail.profileTab.fullName', 'Full Name'), child.fullName],
        [t('children.detail.profileTab.gender', 'Gender'), t('enum.gender.' + (child.gender || '').toLowerCase(), child.gender)],
        [t('children.detail.profileTab.dob', 'Date of Birth'), formatDate(child.dateOfBirth, calendarSystem)],
        [t('children.detail.profileTab.age', 'Age'), `${calculateAge(child.dateOfBirth)} ${t('children.detail.profileTab.years', 'years')}`],
        [t('children.detail.profileTab.communication', 'Communication'), t('enum.communication.' + (child.communicationAbility || '').toLowerCase(), formatEnum(child.communicationAbility))],
        [t('children.detail.profileTab.status', 'Status'), t('enum.childStatus.' + (child.status || '').toLowerCase(), formatEnum(child.status))],
      ],
    },
    {
      title: t('children.detail.profileTab.disabilityEducation', 'Disability & Education'),
      icon: Accessibility,
      fields: [
        [t('children.detail.profileTab.type', 'Type'), t('enum.disabilityType.' + (child.disabilityType || '').toLowerCase(), formatEnum(child.disabilityType))],
        [t('children.detail.profileTab.category', 'Category'), child.disabilityCategory],
        [t('children.detail.profileTab.severity', 'Severity'), t('enum.severity.' + (child.severityLevel || '').toLowerCase(), formatEnum(child.severityLevel))],
        [t('children.detail.profileTab.schoolStatus', 'School Status'), t('enum.schoolStatus.' + (child.schoolEnrollmentStatus || '').toLowerCase(), formatEnum(child.schoolEnrollmentStatus))],
      ],
    },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {groups.map((group) => (
        <Card key={group.title}>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <group.icon className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">{group.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {group.fields.map(([label, value]) => (
                <div key={label} className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">{label}</p>
                  <p className="text-sm font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <Stethoscope className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">{t('children.detail.profileTab.medicalBackground', 'Medical Background')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase">{t('children.detail.profileTab.medicalHistory', 'Medical History')}</p>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-neutral-300 bg-slate-50 dark:bg-neutral-800/50 p-4 rounded-md border italic dark:border-neutral-700">
              {child.medicalHistory || t('children.detail.profileTab.noMedicalHistory', 'No medical history recorded.')}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase">{t('children.detail.profileTab.currentMedications', 'Current Medications')}</p>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-neutral-300 bg-slate-50 dark:bg-neutral-800/50 p-4 rounded-md border italic dark:border-neutral-700">
              {child.medications || t('children.detail.profileTab.noMedications', 'No medications recorded.')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProgressTab({
  child,
  calendarSystem,
}: {
  child: ChildProfile;
  calendarSystem: CalendarSystem;
}) {
  const { t } = useLocale();
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Timeline of Notes */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">{t('children.detail.progressTab.timeline', 'Progress Timeline')}</CardTitle>
            </div>
            <Button size="sm" variant="outline">{t('children.detail.progressTab.viewAll', 'View All')}</Button>
          </CardHeader>
          <CardContent>
            {child.progressNotes.length ? (
              <div className="space-y-6">
                {child.progressNotes.map((note, idx) => (
                  <div key={note.id} className="relative pl-6 pb-6 last:pb-0">
                    {idx !== child.progressNotes.length - 1 && (
                      <div className="absolute left-[7px] top-6 bottom-0 w-px bg-slate-200 dark:bg-neutral-700" />
                    )}
                    <div className="absolute left-0 top-1.5 h-4 w-4 rounded-full border-2 border-primary bg-white dark:bg-neutral-900" />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase">{formatDate(note.createdAt, calendarSystem)}</span>
                        <span className="text-xs font-medium px-2 py-0.5 bg-slate-100 dark:bg-neutral-800 rounded text-slate-600">{note.staff?.fullName}</span>
                      </div>
                      <p className="text-sm leading-relaxed bg-slate-50/50 dark:bg-neutral-800/30 p-3 rounded-md border dark:border-neutral-700">{note.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message={t('children.detail.progressTab.noNotes', 'No progress notes recorded yet.')} />
            )}
          </CardContent>
        </Card>

        {/* Milestone Checklist */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">{t('children.detail.progressTab.milestones', 'Milestones')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {child.milestones.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {child.milestones.map((ms) => (
                  <div key={ms.id} className="flex items-center justify-between p-3 border rounded-md bg-slate-50/30 dark:bg-neutral-800/30">
                    <div className="flex items-center gap-3">
                      {ms.status === 'ACHIEVED' ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <TrendingUp className="h-5 w-5 text-slate-300 dark:text-neutral-500" />
                      )}
                      <span className="text-sm font-medium">{ms.title}</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">{t('enum.milestoneStatus.' + (ms.status || '').toLowerCase(), formatEnum(ms.status))}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message={t('children.detail.progressTab.noMilestones', 'No milestones defined.')} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Goals Section */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">{t('children.detail.progressTab.activeGoals', 'Active Goals')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {child.goals.length ? (
              child.goals.map((goal) => (
                <div key={goal.id} className="p-4 border rounded-lg space-y-3 relative overflow-hidden">
                   <div className={cn(
                     "absolute top-0 left-0 w-1 h-full",
                     goal.type === 'SHORT_TERM' ? "bg-blue-500" : "bg-purple-500"
                   )} />
                   <div className="flex items-center justify-between">
<Badge className={goal.type === 'SHORT_TERM' ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300" : "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300"}>
                        {t('enum.goalType.' + (goal.type || '').toLowerCase(), formatEnum(goal.type))}
                      </Badge>
                     <span className="text-[10px] text-muted-foreground">{formatDate(goal.createdAt, calendarSystem)}</span>
                   </div>
                   <h4 className="text-sm font-bold">{goal.title}</h4>
                   <p className="text-xs text-muted-foreground line-clamp-2">{goal.description}</p>
                </div>
              ))
            ) : (
              <EmptyState message={t('children.detail.progressTab.noGoals', 'No goals set.')} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ServicesTab({
  child,
  calendarSystem,
  onAssignService,
  canWrite,
}: {
  child: ChildProfile;
  calendarSystem: CalendarSystem;
  onAssignService: () => void;
  canWrite: boolean;
}) {
  const { t } = useLocale();
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">{t('children.detail.servicesTab.title', 'Assigned Services')}</CardTitle>
        </div>
        {canWrite && (
        <Button size="sm" onClick={onAssignService}>
          <Plus className="h-4 w-4" />
          {t('children.detail.servicesTab.assignService', 'Assign Service')}
        </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('children.detail.servicesTab.service', 'Service')}</TableHead>
              <TableHead>{t('children.detail.servicesTab.staff', 'Staff')}</TableHead>
              <TableHead>{t('children.detail.servicesTab.frequency', 'Frequency')}</TableHead>
              <TableHead>{t('children.detail.servicesTab.startDate', 'Start Date')}</TableHead>
              <TableHead>{t('children.detail.servicesTab.endDate', 'End Date')}</TableHead>
              <TableHead>{t('children.detail.servicesTab.status', 'Status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {child.serviceAssignments.length ? (
              child.serviceAssignments.map((sa) => (
                <TableRow key={sa.id}>
                  <TableCell className="font-semibold">{sa.service.name}</TableCell>
                  <TableCell>{sa.assignedStaff?.fullName || t('children.detail.servicesTab.na', 'N/A')}</TableCell>
                  <TableCell>{t('enum.frequency.' + (sa.frequency || '').toLowerCase(), formatEnum(sa.frequency))}</TableCell>
                  <TableCell>{formatDate(sa.startDate, calendarSystem)}</TableCell>
                  <TableCell>{sa.endDate ? formatDate(sa.endDate, calendarSystem) : t('children.detail.servicesTab.ongoing', 'Ongoing')}</TableCell>
                  <TableCell><GenericStatusBadge status={sa.status} /></TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">{t('children.detail.servicesTab.noServices', 'No assigned services.')}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function AppointmentsTab({
  child,
  calendarSystem,
  onScheduleNew,
  canWrite,
}: {
  child: ChildProfile;
  calendarSystem: CalendarSystem;
  onScheduleNew: () => void;
  canWrite: boolean;
}) {
  const { t } = useLocale();
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
         <div className="flex items-center gap-2">
           <CalendarDays className="h-5 w-5 text-primary" />
           <CardTitle className="text-base">{t('children.detail.appointmentsTab.upcoming', 'Upcoming Appointments')}</CardTitle>
         </div>
         {canWrite && (
         <Button size="sm" onClick={onScheduleNew}>{t('children.detail.appointmentsTab.scheduleNew', 'Schedule New')}</Button>
         )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {child.appointments.length ? (
            child.appointments.map((apt) => {
              const dateChip = appointmentDateChip(apt.scheduledAt, calendarSystem);

              return (
              <div key={apt.id} className="flex items-center justify-between p-4 border rounded-lg bg-slate-50/50 dark:bg-neutral-800/50 dark:border-neutral-700">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 flex flex-col items-center justify-center bg-white dark:bg-neutral-900 border dark:border-neutral-700 rounded text-center">
                    <span className="text-[10px] font-bold text-primary uppercase">{dateChip.month}</span>
                    <span className="text-lg font-bold leading-none">{dateChip.day}</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">{apt.title}</h4>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(apt.scheduledAt, calendarSystem)} {t('appointments.at', 'at')} {format(new Date(apt.scheduledAt), 'hh:mm a')} / {apt.staff?.fullName}
                    </p>
                  </div>
                </div>
                <GenericStatusBadge status={apt.status} />
              </div>
              );
            })
          ) : (
            <EmptyState message={t('children.detail.appointmentsTab.noAppointments', 'No upcoming appointments.')} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FinanceTab({
  child,
  calendarSystem,
  onNewAllocation,
  canWrite,
}: {
  child: ChildProfile;
  calendarSystem: CalendarSystem;
  onNewAllocation: () => void;
  canWrite: boolean;
}) {
  const { t } = useLocale();
  const childAllocations = child.fundAllocations || [];
  const parentAllocations = (child.parents || []).flatMap((cp: any) => cp.parent?.fundAllocations || []);
  const allocations = [...childAllocations, ...parentAllocations];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">{t('children.detail.financeTab.fundAllocations', 'Fund Allocations')}</CardTitle>
        </div>
        {canWrite && (
        <Button size="sm" variant="outline" onClick={onNewAllocation}>
          <Plus className="h-4 w-4" />
          {t('children.detail.financeTab.newAllocation', 'New Allocation')}
        </Button>
        )}
      </CardHeader>
      <CardContent>
        {allocations.length ? (
          <div className="space-y-4">
            {allocations.map((fund) => (
              <div key={fund.id} className="p-4 border rounded-lg">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-lg font-bold">{Number(fund.amount).toLocaleString()} {fund.currency}</p>
                    <p className="text-sm text-muted-foreground">{fund.purpose}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <GenericStatusBadge status={fund.status} />
                    {fund.parentAcknowledged ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">{t('children.detail.financeTab.acknowledged', 'Acknowledged')}</Badge>
                    ) : (
                      <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800">{t('children.detail.financeTab.pending', 'Pending')}</Badge>
                    )}
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {fund.parentId ? t('children.detail.financeTab.allocatedOn', 'Allocated on') : t('children.detail.financeTab.directAllocation', 'Direct allocation on')} {formatDate(fund.allocationDate, calendarSystem)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message={t('children.detail.financeTab.noAllocations', 'No fund allocations found for this child.')} />
        )}
      </CardContent>
    </Card>
  );
}

function ReferralsTab({
  child,
  calendarSystem,
  onNewReferral,
  canWrite,
}: {
  child: ChildProfile;
  calendarSystem: CalendarSystem;
  onNewReferral: () => void;
  canWrite: boolean;
}) {
  const { t } = useLocale();
  const referrals = (child as any).referrals || [];
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <ExternalLink className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">{t('children.detail.referralsTab.title', 'Referrals')}</CardTitle>
        </div>
        {canWrite && (
        <Button size="sm" onClick={onNewReferral}>
          <Plus className="h-4 w-4" />
          {t('children.detail.referralsTab.newReferral', 'New Referral')}
        </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('services.referrals.table.organization', 'Organization')}</TableHead>
              <TableHead>{t('services.referrals.table.reason', 'Reason')}</TableHead>
              <TableHead>{t('services.referrals.table.date', 'Date')}</TableHead>
              <TableHead>{t('services.referrals.table.followUp', 'Follow-up')}</TableHead>
              <TableHead>{t('services.referrals.table.status', 'Status')}</TableHead>
              <TableHead>{t('services.referrals.table.referredBy', 'Referred By')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {referrals.length > 0 ? (
              referrals.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.referredTo}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.referralReason}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(r.referralDate, calendarSystem)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {r.followUpDate ? formatDate(r.followUpDate, calendarSystem) : '—'}
                  </TableCell>
                  <TableCell>
                    <ReferralStatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.staff?.fullName || '—'}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">{t('children.detail.noReferrals', 'No referrals recorded for this child.')}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function DocumentsTab({
  child,
  calendarSystem,
  onUpload,
  canWrite,
}: {
  child: ChildProfile;
  calendarSystem: CalendarSystem;
  onUpload: () => void;
  canWrite: boolean;
}) {
  const { t } = useLocale();
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Files className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">{t('children.detail.documentsTab.documents', 'Documents')}</CardTitle>
        </div>
        {canWrite && (
        <Button size="sm" onClick={onUpload}><FileUp className="h-4 w-4" /> {t('children.detail.documentsTab.upload', 'Upload')}</Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {child.documents.length ? (
            child.documents.map((doc) => (
              <div key={doc.id} className="p-4 border rounded-lg bg-slate-50/50 dark:bg-neutral-800/50 dark:border-neutral-700 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="p-2 bg-white dark:bg-neutral-900 rounded border dark:border-neutral-700"><Files className="h-5 w-5 text-slate-400" /></div>
                  <Badge variant="outline">{doc.category}</Badge>
                </div>
                <div>
                  <h4 className="text-sm font-bold truncate">{doc.name}</h4>
                  <p className="text-xs text-muted-foreground">{t('children.detail.documentsTab.added', 'Added')} {formatDate(doc.createdAt, calendarSystem)}</p>
                </div>
                <Button size="sm" variant="outline" className="w-full" asChild>
                  <Link href={doc.fileUrl} target="_blank">{t('children.detail.documentsTab.openDocument', 'Open Document')} <ExternalLink className="h-3 w-3 ml-2" /></Link>
                </Button>
              </div>
            ))
          ) : (
            <div className="col-span-full"><EmptyState message={t('children.detail.documentsTab.noDocuments', 'No documents uploaded.')} /></div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Helpers
function ReferralStatusBadge({ status }: { status: string }) {
  const { t } = useLocale();
  const config: Record<string, { className: string; label: string }> = {
    PENDING: {
      className: 'border-amber-200 bg-amber-50 text-amber-700',
      label: t('services.referrals.status.pending', 'Pending'),
    },
    CONTACTED: {
      className: 'border-blue-200 bg-blue-50 text-blue-700',
      label: t('services.referrals.status.contacted', 'Contacted'),
    },
    COMPLETED: {
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      label: t('services.referrals.status.completed', 'Completed'),
    },
    CANCELLED: {
      className: 'border-red-200 bg-red-50 text-red-700',
      label: t('services.referrals.status.cancelled', 'Cancelled'),
    },
  };
  const c = config[status] || config.PENDING;
  return (
    <Badge className={c.className}>
      {c.label}
    </Badge>
  );
}

function DisabilityIcon({ type }: { type: 'PHYSICAL' | 'INTELLECTUAL' | 'MULTIPLE' }) {
  if (type === 'PHYSICAL') return <Accessibility className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
  if (type === 'INTELLECTUAL') return <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
  return <div className="flex -space-x-1"><Accessibility className="h-4 w-4 text-blue-600 dark:text-blue-400" /><Brain className="h-4 w-4 text-purple-600 dark:text-purple-400" /></div>;
}

function SeverityBadge({ level }: { level: 'MILD' | 'MODERATE' | 'SEVERE' }) {
  const classes = {
    MILD: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
    MODERATE: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
    SEVERE: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800',
  };
  return <Badge className={classes[level]}>{tI18n('enum.severity.' + level.toLowerCase(), formatEnum(level))}</Badge>;
}

function StatusBadge({ status }: { status: 'ACTIVE' | 'GRADUATED' | 'TRANSFERRED' | 'INACTIVE' | 'DECEASED' }) {
  const classes = {
    ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
    GRADUATED: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
    TRANSFERRED: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
    INACTIVE: 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 border-slate-200 dark:border-neutral-700',
    DECEASED: 'bg-red-950 text-white border-red-900',
  };
  return <Badge className={classes[status]}>{tI18n('enum.childStatus.' + status.toLowerCase(), formatEnum(status))}</Badge>;
}

function GenericStatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const className = ['ACTIVE', 'COMPLETED', 'DISBURSED', 'ACHIEVED'].includes(normalized)
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
    : ['PENDING', 'ALLOCATED', 'IN_PROGRESS', 'SCHEDULED'].includes(normalized)
      ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
      : 'border-slate-200 dark:border-neutral-700 bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400';
  return <Badge className={className}>{tI18n('enum.serviceAssignmentStatus.' + status.toLowerCase(), formatEnum(status))}</Badge>;
}

function EmptyState({ message }: { message: string }) {
  return <div className="flex min-h-[100px] items-center justify-center rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{message}</div>;
}

function profileToChildRow(child: ChildProfile): ChildRow {
  const firstParent = child.parents?.[0]?.parent;
  return {
    id: child.id,
    idTag: child.idTag,
    fullName: child.fullName,
    photoUrl: child.photoUrl,
    dateOfBirth: toIsoDateInputValue(child.dateOfBirth),
    disabilityType: child.disabilityType as ChildRow['disabilityType'],
    disabilityCategory: child.disabilityCategory,
    severityLevel: child.severityLevel as ChildRow['severityLevel'],
    status: child.status as ChildRow['status'],
    assignedStaffId: child.assignedStaff?.id || '',
    createdAt: child.createdAt,
    parents: (child.parents || []).map((cp: any) => ({
      parent: { id: cp.parent?.id || '', fullName: cp.parent?.fullName || '' },
    })),
    assignedStaff: child.assignedStaff
      ? {
          id: child.assignedStaff.id,
          fullName: child.assignedStaff.fullName,
          role: child.assignedStaff.role,
        }
      : null,
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

function formatDate(value: string, calendarSystem: CalendarSystem) {
  return formatCalendarDate(value, calendarSystem) || tI18n('children.detail.na', 'N/A');
}

function appointmentDateChip(value: string, calendarSystem: CalendarSystem) {
  const placeholder = { month: tI18n('children.detail.datePlaceholder', '--'), day: tI18n('children.detail.datePlaceholder', '--') };
  if (calendarSystem === 'ETHIOPIAN') {
    const iso = toIsoDateInputValue(value);
    if (!iso) return placeholder;

    const date = gregorianToEthiopian(parseIsoDate(iso));
    return {
      month: ethiopianMonths[date.month - 1].slice(0, 3),
      day: String(date.day).padStart(2, '0'),
    };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return placeholder;

  return {
    month: gregorianMonths[date.getUTCMonth()].slice(0, 3),
    day: String(date.getUTCDate()).padStart(2, '0'),
  };
}

function initials(name: string) { return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2); }
function getErrorMessage(err: any, fallback: string) { return err.response?.data?.message || fallback; }
