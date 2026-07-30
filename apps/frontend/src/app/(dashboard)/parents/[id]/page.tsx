'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  CalendarDays,
  ExternalLink,
  FileText,
  FileUp,
  Files,
  Mail,
  MapPin,
  UserRound,
  Phone,
  Fingerprint,
  Users,
  Briefcase,
  Wallet,
  Clock,
  Plus,
  Pencil,
  UserMinus,
  UserPlus,
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
import { useCalendarSettings } from '@/components/providers/calendar-settings-provider';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { ExportButton } from '@/components/dashboard/export-button';
import {
  exportToCSV,
  exportToPDF,
  exportToWordHTML,
  exportProfileToExcel,
  formatEnum,
  escapeHTML,
} from '@/lib/export';
import { ParentDetailResponse, ParentStatus, ParentRow, StaffOption, MembershipStatus } from '@/types/parents';
import { ParentDrawer } from '@/components/dashboard/parent-drawer';
import { ChildDrawer } from '@/components/dashboard/child-drawer';
import { DeactivateConfirmationModal } from '@/components/dashboard/deactivate-confirmation-modal';
import { useToast } from '@/hooks/use-toast';
import {
  CalendarSystem,
  formatCalendarDate,
  parseIsoDate,
  gregorianToEthiopian,
  ethiopianMonths,
  gregorianMonths,
  toIsoDateInputValue,
} from '@/lib/calendar';
import { AssignServiceDrawer } from '@/components/services/AssignServiceDrawer';
import { ReferralDrawer } from '@/components/services/ReferralDrawer';
import { AppointmentDrawer } from '@/components/dashboard/appointments/appointment-drawer';
import { AllocationDrawer } from '@/components/dashboard/funds/allocation-drawer';
import { DocumentUploadDrawer } from '@/components/dashboard/document-upload-drawer';
import { getSession } from '@/lib/auth';

const tabs = [
  'Profile',
  'Children',
  'Services',
  'Appointments',
  'Referrals',
  'Fund & Finance',
  'Documents',
] as const;
type Tab = (typeof tabs)[number];

export default function ParentProfilePage() {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const { t } = useLocale();
  const { calendarSystem } = useCalendarSettings();
  const [parent, setParent] = useState<ParentDetailResponse | null>(null);
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
  const [childDrawerOpen, setChildDrawerOpen] = useState(false);

  const fetchParent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/parents/${params.id}`);
      setParent(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || t('parents.detail.errorLoad', 'Failed to load parent profile'));
    } finally {
      setLoading(false);
    }
  }, [params.id, t]);

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
    void fetchParent();
    void fetchStaff();
  }, [fetchParent, fetchStaff]);

  useEffect(() => {
    const session = getSession();
    setUserRole(session?.role ?? '');
  }, []);

  const handleToggleStatus = async () => {
    if (!parent) return;
    try {
      await api.delete(`/parents/${parent.id}`);
      const isActivating = parent.status === 'INACTIVE';
      toast({
        title: isActivating ? t('parents.detail.toastActivated', 'Profile Activated') : t('parents.detail.toastDeactivated', 'Profile Deactivated'),
        description: t('parents.detail.toastDescription', '{name} has been successfully {action}.', { name: parent.fullName, action: isActivating ? t('parents.detail.activatedAction', 'activated') : t('parents.detail.deactivatedAction', 'deactivated') }),
      });
      setShowDeactivateModal(false);
      await fetchParent();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: t('parents.detail.error', 'Error'),
        description: err.response?.data?.message || t('parents.detail.errorUpdateStatus', 'Failed to update status'),
      });
    }
  };

  const handleExport = (formatType: 'pdf' | 'csv' | 'excel' | 'docx') => {
    if (!parent) return;
    setExporting(true);

    const filename = `parent-${parent.fullName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}`;
    const title = `${t('parents.detail.export.profileTitle', 'Parent Profile')}: ${parent.fullName}`;

    const profileSections = [
      {
        title: t('parents.detail.export.personalInfo', 'Personal Information'),
        fields: [
          [t('parents.detail.export.fullName', 'Full Name'), parent.fullName],
          [t('parents.detail.export.nationalId', 'National ID'), parent.nationalId],
          [t('parents.detail.export.dateOfBirth', 'Date of Birth'), formatDt(parent.dateOfBirth, calendarSystem)],
          [t('parents.detail.export.gender', 'Gender'), parent.gender || t('parents.detail.na', 'N/A')],
          [t('parents.detail.export.phone', 'Phone'), parent.phone],
          [t('parents.detail.export.email', 'Email'), parent.email || t('parents.detail.na', 'N/A')],
        ] as [string, string][],
      },
      {
        title: t('parents.detail.export.locationSocial', 'Location & Social'),
        fields: [
          [t('parents.detail.export.address', 'Address'), parent.address || t('parents.detail.na', 'N/A')],
          [t('parents.detail.export.city', 'City'), parent.city || t('parents.detail.na', 'N/A')],
          [t('parents.detail.export.subcity', 'Subcity'), parent.subcity || t('parents.detail.na', 'N/A')],
          [t('parents.detail.export.woreda', 'Woreda'), parent.woreda || t('parents.detail.na', 'N/A')],
          [t('parents.detail.export.maritalStatus', 'Marital Status'), t('enum.maritalStatus.' + parent.maritalStatus.toLowerCase(), formatEnum(parent.maritalStatus))],
          [t('parents.detail.export.educationLevel', 'Education Level'), parent.educationLevel || t('parents.detail.na', 'N/A')],
          [t('parents.detail.export.employmentStatus', 'Employment Status'), t('enum.employmentStatus.' + (parent.employmentStatus || 'UNEMPLOYED').toLowerCase(), formatEnum(parent.employmentStatus || 'UNEMPLOYED'))],
        ] as [string, string][],
      },
      {
        title: t('parents.detail.export.programDetails', 'Program Details'),
        fields: [
          [t('parents.detail.export.status', 'Status'), t('enum.parentStatus.' + parent.status.toLowerCase(), formatEnum(parent.status))],
          [t('parents.detail.export.financialBracket', 'Financial Bracket'), t('enum.financialBracket.' + parent.financialBracket.toLowerCase(), formatEnum(parent.financialBracket))],
          [t('parents.detail.export.dependents', 'Dependents'), String(parent.numberOfDependents || 0)],
          [t('parents.detail.export.referralSource', 'Referral Source'), parent.referralSource || t('parents.detail.na', 'N/A')],
          [t('parents.detail.export.caseWorker', 'Case Worker'), parent.assignedStaff?.fullName || t('parents.detail.unassigned', 'Unassigned')],
          [t('parents.detail.export.registeredDate', 'Registered Date'), formatDt(parent.createdAt, calendarSystem)],
        ] as [string, string][],
      },
    ];

    if (formatType === 'csv') {
      const headers = [t('parents.detail.export.field', 'Field'), t('parents.detail.export.value', 'Value')];
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
      if (parent.internalNotes) {
        contentHTML += `<h2>${t('parents.detail.export.internalNotes', 'Internal Notes')}</h2><p>${escapeHTML(parent.internalNotes)}</p>`;
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
      if (parent.internalNotes) {
        htmlBody += `<h2>${t('parents.detail.export.internalNotes', 'Internal Notes')}</h2><div class="field" style="white-space: pre-wrap;">${escapeHTML(parent.internalNotes)}</div>`;
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

  if (error || !parent) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm font-medium text-muted-foreground">{error || t('parents.detail.parentNotFound', 'Parent profile not found.')}</p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/parents">{t('parents.detail.backToList', 'Back to Parents')}</Link>
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
              <AvatarImage src={parent.photoUrl || undefined} alt={parent.fullName} />
              <AvatarFallback className="text-2xl">{initials(parent.fullName)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight">{parent.fullName}</h1>
                  <span className="font-mono text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{parent.idTag || t('parents.detail.idTagPlaceholder', '---')}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <UserRound className="h-4 w-4" />
                    {parent.assignedStaff?.fullName || t('parents.detail.unassigned', 'Unassigned')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {t('parents.detail.joined', 'Joined')} {formatDt(parent.createdAt, calendarSystem)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Wallet className="h-4 w-4" />
                    {t('enum.financialBracket.' + parent.financialBracket.toLowerCase(), formatEnum(parent.financialBracket))}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className={statusBadgeClass(parent.status)}>
                  {t('enum.parentStatus.' + parent.status.toLowerCase(), formatEnum(parent.status))}
                </Badge>
                <Badge variant="outline" className="bg-slate-50 dark:bg-neutral-800 dark:text-neutral-400">
                  {t('parents.detail.childrenLabel', 'Children')}: {parent.children.length}
                </Badge>
                <Badge variant="outline" className="bg-slate-50 dark:bg-neutral-800 dark:text-neutral-400">
                  {t('parents.detail.servicesLabel', 'Services')}: {parent.serviceAssignments.length}
                </Badge>
              </div>
            </div>
            <div className="flex flex-row flex-wrap items-center gap-2">
              <ExportButton onExport={handleExport} loading={exporting} />
              <Button variant="outline" size="sm" onClick={() => setDrawerOpen(true)}>
                <Pencil className="h-4 w-4" />
                {t('parents.detail.editProfile', 'Edit Profile')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'gap-2',
                  parent.status === 'INACTIVE'
                    ? 'text-emerald-600 hover:text-emerald-700'
                    : 'text-red-600 hover:text-red-700',
                )}
                onClick={() => setShowDeactivateModal(true)}
              >
                {parent.status === 'INACTIVE' ? <UserPlus className="h-4 w-4" /> : <UserMinus className="h-4 w-4" />}
                {parent.status === 'INACTIVE' ? t('parents.detail.activate', 'Activate') : t('parents.detail.deactivate', 'Deactivate')}
              </Button>
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('parents.detail.membership', 'Membership Fee')}</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {parent.membershipFee != null ? `${Number(parent.membershipFee).toLocaleString()} ${t('common.etb', 'ETB')}` : t('parents.detail.notSet', 'Not set')}
                  </p>
                </div>
                <MembershipStatusBadge status={parent.membershipStatus} />
              </div>
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
            {t(`parents.detail.tab.${tab.toLowerCase().replace(/[\s&]+/g, '_')}`, tab)}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="mt-6">
        {activeTab === 'Profile' && <ProfileTab parent={parent} calendarSystem={calendarSystem} />}
        {activeTab === 'Children' && <ChildrenTab parent={parent} onAddChild={() => setChildDrawerOpen(true)} canWrite={canWrite} />}
        {activeTab === 'Services' && <ServicesTab parent={parent} onAssignService={() => setAssignDrawerOpen(true)} canWrite={canWrite} />}
        {activeTab === 'Appointments' && <AppointmentsTab parent={parent} calendarSystem={calendarSystem} onScheduleNew={() => setAppointmentDrawerOpen(true)} canWrite={canWrite} />}
        {activeTab === 'Referrals' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">{t('parents.detail.referrals', 'Referrals')}</CardTitle>
              </div>
              {canWrite && (
              <Button size="sm" onClick={() => setReferralDrawerOpen(true)}>
                <Plus className="h-4 w-4" />
                {t('parents.detail.newReferral', 'New Referral')}
              </Button>
              )}
            </CardHeader>
            <CardContent>
              {(parent as any).referrals && (parent as any).referrals.length > 0 ? (
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
                    {(parent as any).referrals.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.referredTo}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.referralReason}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDt(r.referralDate, calendarSystem)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{r.followUpDate ? formatDt(r.followUpDate, calendarSystem) : '—'}</TableCell>
                        <TableCell><ReferralStatusBadge status={r.status} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.staff?.fullName || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState message={t('parents.detail.noReferrals', 'No referrals recorded for this parent.')} />
              )}
            </CardContent>
          </Card>
        )}
        {activeTab === 'Fund & Finance' && <FinanceTab parent={parent} calendarSystem={calendarSystem} onNewAllocation={() => setAllocationDrawerOpen(true)} canWrite={canWrite} />}
        {activeTab === 'Documents' && <DocumentsTab parent={parent} calendarSystem={calendarSystem} onUpload={() => setDocumentUploadOpen(true)} canWrite={canWrite} />}
      </div>

      <ParentDrawer
        open={drawerOpen}
        parentId={parent.id}
        fallbackParent={parent}
        staffOptions={staff}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => {
          setDrawerOpen(false);
          void fetchParent();
          toast({
            title: t('parents.detail.profileUpdated', 'Profile Updated'),
            description: t('parents.detail.profileSaved', 'The parent profile has been saved successfully.'),
          });
        }}
      />

      {showDeactivateModal && (
        <DeactivateConfirmationModal
          name={parent.fullName}
          title={parent.status === 'INACTIVE' ? t('parents.detail.deactivateTitleActivate', 'Activate Profile?') : t('parents.detail.deactivateTitleDeactivate', 'Deactivate Profile?')}
          description={parent.status === 'INACTIVE' ? t('parents.detail.deactivateDescActivate', 'Are you sure you want to activate {name}? This will restore their access in the system.', { name: parent.fullName }) : undefined}
          confirmLabel={parent.status === 'INACTIVE' ? t('parents.detail.deactivateConfirmActivate', 'Activate Now') : t('parents.detail.deactivateConfirmDeactivate', 'Deactivate Now')}
          onConfirm={handleToggleStatus}
          onCancel={() => setShowDeactivateModal(false)}
        />
      )}

      <AssignServiceDrawer
        open={assignDrawerOpen}
        onClose={() => setAssignDrawerOpen(false)}
        onSaved={() => { setAssignDrawerOpen(false); fetchParent(); }}
        userRole={userRole}
        defaultTargetType="PARENT"
        defaultTargetId={parent.id}
        defaultTargetName={parent.fullName}
      />
      <AppointmentDrawer
        open={appointmentDrawerOpen}
        onClose={() => setAppointmentDrawerOpen(false)}
        onSuccess={() => { setAppointmentDrawerOpen(false); fetchParent(); }}
        defaultParentId={parent.id}
        defaultParentName={parent.fullName}
      />
      <ReferralDrawer
        open={referralDrawerOpen}
        referral={null}
        onClose={() => setReferralDrawerOpen(false)}
        onSaved={() => { setReferralDrawerOpen(false); fetchParent(); }}
        userRole={userRole}
        defaultTargetType="PARENT"
        defaultTargetId={parent.id}
        defaultTargetName={parent.fullName}
      />
      <AllocationDrawer
        open={allocationDrawerOpen}
        onClose={() => setAllocationDrawerOpen(false)}
        onSuccess={() => { setAllocationDrawerOpen(false); fetchParent(); }}
        defaultTargetType="PARENT"
        defaultTargetId={parent.id}
        defaultTargetName={parent.fullName}
      />
      <DocumentUploadDrawer
        open={documentUploadOpen}
        onClose={() => setDocumentUploadOpen(false)}
        onSuccess={() => { setDocumentUploadOpen(false); fetchParent(); }}
        parentId={parent.id}
      />
      <ChildDrawer
        open={childDrawerOpen}
        childId={undefined}
        fallbackChild={null}
        staffOptions={staff}
        onClose={() => setChildDrawerOpen(false)}
        onSaved={() => { setChildDrawerOpen(false); fetchParent(); }}
      />
    </div>
  );
}

// Tab: Profile
function ProfileTab({
  parent,
  calendarSystem,
}: {
  parent: ParentDetailResponse;
  calendarSystem: CalendarSystem;
}) {
  const { t } = useLocale();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Contact Info */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <UserRound className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">{t('parents.detail.contactInfo', 'Contact Info')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase">{t('parents.detail.phone', 'Phone')}</p>
              <p className="text-sm font-semibold flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> {parent.phone}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase">{t('parents.detail.email', 'Email')}</p>
              <p className="text-sm font-semibold flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> {parent.email || t('parents.detail.noEmail', 'No email')}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase">{t('parents.detail.location', 'Location')}</p>
              <p className="text-sm font-semibold flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /> {parent.city}, {parent.subcity}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase">{t('parents.detail.nationalId', 'National ID')}</p>
              <p className="text-sm font-semibold flex items-center gap-1.5"><Fingerprint className="h-3.5 w-3.5 text-muted-foreground" /> {parent.nationalId}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Background Info */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <Users className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">{t('parents.detail.backgroundInfo', 'Background Information')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase">{t('parents.detail.maritalStatus', 'Marital Status')}</p>
              <p className="text-sm font-semibold">{t('enum.maritalStatus.' + parent.maritalStatus.toLowerCase(), formatEnum(parent.maritalStatus))}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase">{t('parents.detail.education', 'Education')}</p>
              <p className="text-sm font-semibold">{parent.educationLevel || t('parents.detail.notDisclosed', 'N/A')}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase">{t('parents.detail.employment', 'Employment')}</p>
              <p className="text-sm font-semibold">{t('enum.employmentStatus.' + (parent.employmentStatus || 'UNEMPLOYED').toLowerCase(), formatEnum(parent.employmentStatus || 'UNEMPLOYED'))}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase">{t('parents.detail.dependents', 'Dependents')}</p>
              <p className="text-sm font-semibold">{parent.numberOfDependents || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Profile */}
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <Wallet className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">{t('parents.detail.financialProfile', 'Financial Profile')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase">{t('parents.detail.monthlyIncome', 'Monthly Income')}</p>
            <p className="text-sm font-semibold">{parseIncome(parent.internalNotes)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase">{t('parents.detail.financialBracket', 'Financial Bracket')}</p>
            <p className="text-sm font-semibold">{t('enum.financialBracket.' + parent.financialBracket.toLowerCase(), formatEnum(parent.financialBracket))}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase">{t('parents.detail.referralSource', 'Referral Source')}</p>
            <p className="text-sm font-semibold">{parent.referralSource || t('parents.detail.selfReferral', 'Self-referral')}</p>
          </div>
        </CardContent>
      </Card>

      {/* Internal Notes */}
      {parent.internalNotes && (
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <FileUp className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">{t('parents.detail.internalCaseNotes', 'Internal Case Notes')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-neutral-300 bg-slate-50 dark:bg-neutral-800/50 p-4 rounded-md border italic dark:border-neutral-700">
              {parent.internalNotes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Tab: Children
function ChildrenTab({ parent, onAddChild, canWrite }: { parent: ParentDetailResponse; onAddChild: () => void; canWrite: boolean }) {
  const { t } = useLocale();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">{t('parents.detail.registeredChildren', 'Registered Children')}</CardTitle>
        </div>
        {canWrite && (
        <Button size="sm" variant="outline" onClick={onAddChild}>
          <Plus className="h-4 w-4" />
          {t('parents.detail.addChild', 'Add Child')}
        </Button>
        )}
      </CardHeader>
      <CardContent>
        {parent.children.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {parent.children.map((cp: any) => {
              const child = cp.child;
              return (
                <Link
                  key={child.id}
                  href={`/dashboard/children/${child.id}`}
                  className="flex items-center gap-3 rounded-lg border p-3 transition hover:bg-muted/50 dark:border-neutral-700"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={child.photoUrl || undefined} />
                    <AvatarFallback>{initials(child.fullName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{child.fullName}</p>
                    <p className="text-xs text-muted-foreground">{t('enum.disabilityType.' + child.disabilityType.toLowerCase(), formatEnum(child.disabilityType))}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">{t('enum.childStatus.' + child.status.toLowerCase(), formatEnum(child.status))}</Badge>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState message={t('parents.detail.noChildren', 'No children registered under this parent profile.')} />
        )}
      </CardContent>
    </Card>
  );
}

// Tab: Services
function ServicesTab({ parent, onAssignService, canWrite }: { parent: ParentDetailResponse; onAssignService: () => void; canWrite: boolean }) {
  const { t } = useLocale();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">{t('parents.detail.assignedServices', 'Assigned Services')}</CardTitle>
        </div>
        {canWrite && (
        <Button size="sm" onClick={onAssignService}>
          <Plus className="h-4 w-4" />
          {t('parents.detail.assignService', 'Assign Service')}
        </Button>
        )}
      </CardHeader>
      <CardContent>
        {parent.serviceAssignments.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('parents.detail.serviceTable.service', 'Service')}</TableHead>
                <TableHead>{t('parents.detail.serviceTable.frequency', 'Frequency')}</TableHead>
                <TableHead>{t('parents.detail.serviceTable.status', 'Status')}</TableHead>
                <TableHead className="text-right">{t('parents.detail.serviceTable.actions', 'Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parent.serviceAssignments.map((sa: any) => (
                <TableRow key={sa.id}>
                  <TableCell className="font-semibold">{sa.service.name}</TableCell>
                  <TableCell>{formatEnum(sa.frequency)}</TableCell>
                  <TableCell><GenericStatusBadge status={sa.status} /></TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" className="h-8 w-8">
                      <FileUp className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState message={t('parents.detail.noServices', 'No service assignments found.')} />
        )}
      </CardContent>
    </Card>
  );
}

// Tab: Appointments
function AppointmentsTab({
  parent,
  calendarSystem,
  onScheduleNew,
  canWrite,
}: {
  parent: ParentDetailResponse;
  calendarSystem: CalendarSystem;
  onScheduleNew: () => void;
  canWrite: boolean;
}) {
  const { t } = useLocale();
  const appointments = parent.appointments || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">{t('parents.detail.appointments', 'Appointments')}</CardTitle>
        </div>
        {canWrite && (
        <Button size="sm" onClick={onScheduleNew}>{t('parents.detail.scheduleNew', 'Schedule New')}</Button>
        )}
      </CardHeader>
      <CardContent>
        {appointments.length ? (
          <div className="space-y-4">
            {appointments.map((apt: any) => {
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
                        {apt.scheduledAt ? formatDt(apt.scheduledAt, calendarSystem) : ''} / {apt.staff?.fullName}
                      </p>
                    </div>
                  </div>
                  <GenericStatusBadge status={apt.status} />
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState message={t('parents.detail.noAppointments', 'No appointments found.')} />
        )}
      </CardContent>
    </Card>
  );
}

// Tab: Fund & Finance
function FinanceTab({
  parent,
  calendarSystem,
  onNewAllocation,
  canWrite,
}: {
  parent: ParentDetailResponse;
  calendarSystem: CalendarSystem;
  onNewAllocation: () => void;
  canWrite: boolean;
}) {
  const { t } = useLocale();
  const allocations = parent.fundAllocations || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">{t('parents.detail.financialAllocations', 'Financial Allocations')}</CardTitle>
        </div>
        {canWrite && (
        <Button size="sm" variant="outline" onClick={onNewAllocation}>
          <Plus className="h-4 w-4" />
          {t('parents.detail.newAllocation', 'New Allocation')}
        </Button>
        )}
      </CardHeader>
      <CardContent>
        {allocations.length ? (
          <div className="space-y-4">
            {allocations.map((fund: any) => (
              <div key={fund.id} className="p-4 border rounded-lg">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-lg font-bold">{Number(fund.amount).toLocaleString()} {fund.currency}</p>
                    <p className="text-sm text-muted-foreground">{fund.purpose}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <GenericStatusBadge status={fund.status} />
                    {fund.parentAcknowledged ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">{t('parents.detail.acknowledged', 'Acknowledged')}</Badge>
                    ) : (
                      <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800">{t('parents.detail.pending', 'Pending')}</Badge>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{t('parents.detail.allocatedOn', 'Allocated on')} {formatDt(fund.allocationDate, calendarSystem)}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message={t('parents.detail.noFinanceHistory', 'No financial history for this profile.')} />
        )}
      </CardContent>
    </Card>
  );
}

// Tab: Documents
function DocumentsTab({
  parent,
  calendarSystem,
  onUpload,
  canWrite,
}: {
  parent: ParentDetailResponse;
  calendarSystem: CalendarSystem;
  onUpload: () => void;
  canWrite: boolean;
}) {
  const { t } = useLocale();
  const documents = parent.documents || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Files className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">{t('parents.detail.uploadedDocuments', 'Uploaded Documents')}</CardTitle>
        </div>
        {canWrite && (
        <Button size="sm" onClick={onUpload}><FileUp className="h-4 w-4" /> {t('parents.detail.upload', 'Upload')}</Button>
        )}
      </CardHeader>
      <CardContent>
        {documents.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc: any) => (
              <div key={doc.id} className="p-4 border rounded-lg bg-slate-50/50 dark:bg-neutral-800/50 dark:border-neutral-700 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="p-2 bg-white dark:bg-neutral-900 rounded border dark:border-neutral-700"><Files className="h-5 w-5 text-slate-400" /></div>
                  <Badge variant="outline">{doc.category || doc.type}</Badge>
                </div>
                <div>
                  <h4 className="text-sm font-bold truncate">{doc.title || doc.name}</h4>
                  <p className="text-xs text-muted-foreground">{t('parents.detail.uploaded', 'Uploaded')} {formatDt(doc.createdAt, calendarSystem)}</p>
                </div>
                <Button size="sm" variant="outline" className="w-full" asChild>
                  <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                    {t('parents.detail.openDocument', 'Open Document')} <ExternalLink className="h-3 w-3 ml-2" />
                  </a>
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message={t('parents.detail.noDocuments', 'No documents uploaded yet.')} />
        )}
      </CardContent>
    </Card>
  );
}

// Helpers
function GenericStatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const className = ['ACTIVE', 'COMPLETED', 'DISBURSED', 'ACHIEVED'].includes(normalized)
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
    : ['PENDING', 'ALLOCATED', 'IN_PROGRESS', 'SCHEDULED'].includes(normalized)
      ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
      : 'border-slate-200 dark:border-neutral-700 bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400';
  return <Badge className={className}>{formatEnum(status)}</Badge>;
}

function statusBadgeClass(status: string) {
  if (status === 'ACTIVE') return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300';
  if (status === 'UNDER_REVIEW') return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300';
  return 'border-slate-200 bg-slate-100 text-slate-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400';
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="rounded-full bg-slate-50 p-3 text-slate-300">
        <FileText className="h-6 w-6" />
      </div>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
    </div>
  );
}

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

function StatusBadge({ status }: { status: ParentStatus }) {
  const { t } = useLocale();
  const className =
    status === 'ACTIVE'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : status === 'UNDER_REVIEW'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-slate-200 bg-slate-100 text-slate-600';

  return <Badge className={className}>{t('enum.parentStatus.' + status.toLowerCase(), formatEnum(status))}</Badge>;
}

function MembershipStatusBadge({ status }: { status: MembershipStatus }) {
  const { t } = useLocale();
  const isPaid = status === 'PAID';
  const className = isPaid
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-amber-200 bg-amber-50 text-amber-700';

  return <Badge className={className}>{isPaid ? t('parents.membership.paid', 'Paid') : t('parents.membership.unpaid', 'Unpaid')}</Badge>;
}

function parseIncome(notes?: string | null) {
  if (!notes) return tI18n('parents.detail.notDisclosed', 'Not disclosed');
  const match = notes.match(/Monthly income range:\s*(.*)/);
  return match ? match[1] : tI18n('parents.detail.notDisclosed', 'Not disclosed');
}

function formatDt(value: string | undefined, calendarSystem: CalendarSystem) {
  if (!value) return tI18n('parents.detail.na', 'N/A');
  return formatCalendarDate(value, calendarSystem) || tI18n('parents.detail.na', 'N/A');
}

function appointmentDateChip(value: string | undefined, calendarSystem: CalendarSystem) {
  const placeholder = { month: tI18n('parents.detail.datePlaceholder', '--'), day: tI18n('parents.detail.datePlaceholder', '--') };
  if (!value) return placeholder;

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

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}
