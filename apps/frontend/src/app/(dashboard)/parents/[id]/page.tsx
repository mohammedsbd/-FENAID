'use client';

import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Mail,
  MapPin,
  Pencil,
  Phone,
  UserRound,
  Fingerprint,
  Users,
  Briefcase,
  GraduationCap,
  Heart,
  Wallet,
  FileText,
  Trash2,
  UserPlus,
  UserMinus,
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
import {
  exportToCSV,
  exportToPDF,
  exportToWordHTML,
  exportProfileToExcel,
  formatEnum,
  escapeHTML,
  formatDate,
} from '@/lib/export';
import { ParentDetailResponse, ParentStatus, ParentRow, StaffOption } from '@/types/parents';
import { ParentDrawer } from '@/components/dashboard/parent-drawer';
import { DeactivateConfirmationModal } from '@/components/dashboard/deactivate-confirmation-modal';
import { useToast } from '@/hooks/use-toast';

const tabs = [
  'Profile',
  'Children',
  'Services',
  'Appointments',
  'Fund & Finance',
  'Documents',
] as const;
type Tab = (typeof tabs)[number];

export default function ParentProfilePage() {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const { t } = useLocale();
  const [parent, setParent] = useState<ParentDetailResponse | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('Profile');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [staff, setStaff] = useState<StaffOption[]>([]);

  useEffect(() => {
    fetchParent();
    fetchStaff();
  }, [params.id]);

  const fetchParent = async () => {
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
  };

  const fetchStaff = async () => {
    try {
      const res = await api.get('/dashboard/admin');
      const options = (res.data.caseWorkerWorkload || []).map(
        (worker: { staffId: string; staffName: string }) => ({
          id: worker.staffId,
          fullName: worker.staffName,
        }),
      );
      setStaff(options);
    } catch {
      // Ignore
    }
  };

  const handleToggleStatus = async () => {
    if (!parent) return;
    try {
      await api.delete(`/parents/${parent.id}`);
      const isActivating = parent.status === 'INACTIVE';
      toast({
        title: isActivating ? t('parents.detail.toastActivated', 'Profile Activated') : t('parents.detail.toastDeactivated', 'Profile Deactivated'),
        description: t('parents.detail.toastDescription', '{name} has been successfully {action}.', { name: parent.fullName, action: isActivating ? t('parents.detail.activatedAction', 'activated') : t('parents.detail.deactivatedAction', 'deactivated') }),
      });
      fetchParent();
      setShowDeactivateModal(false);
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
          [t('parents.detail.export.dateOfBirth', 'Date of Birth'), formatDate(parent.dateOfBirth)],
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
          [t('parents.detail.export.registeredDate', 'Registered Date'), formatDate(parent.createdAt)],
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
      <div className="flex h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !parent) {
    return (
      <Card className="border-red-100 bg-red-50">
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <div className="rounded-full bg-red-100 p-3 text-red-600">
            <UserMinus className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-red-900">{t('parents.detail.errorTitle', 'Error Loading Profile')}</h2>
          <p className="mt-1 text-sm text-red-700">{error || t('parents.detail.parentNotFound', 'Parent not found')}</p>
          <Button variant="outline" className="mt-6 border-red-200" asChild>
            <Link href="/dashboard/parents">{t('parents.detail.backToList', 'Back to Parents')}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Profile Section */}
      <Card className="overflow-hidden border-none shadow-sm ring-1 ring-slate-200">
        <CardContent className="p-0">
          <div className="h-32 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />
          <div className="px-8 pb-8">
            <div className="relative -mt-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
                <Avatar className="h-32 w-32 border-4 border-white shadow-md">
                  <AvatarImage src={parent.photoUrl || undefined} alt={parent.fullName} />
                  <AvatarFallback className="text-3xl font-bold">{initials(parent.fullName)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold tracking-tight">{parent.fullName}</h1>
                    <span className="font-mono text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{parent.idTag || t('parents.detail.idTagPlaceholder', '---')}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <UserRound className="h-4 w-4" />
                      {parent.assignedStaff?.fullName || t('parents.detail.unassigned', 'Unassigned')}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-4 w-4" />
                      {t('parents.detail.joined', 'Joined')} {formatDate(parent.createdAt)}
                    </span>
                    <StatusBadge status={parent.status} />
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <ExportButton onExport={handleExport} loading={exporting} />
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setDrawerOpen(true)}>
                  <Pencil className="h-4 w-4" />
                  {t('parents.detail.editProfile', 'Edit Profile')}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={cn("gap-2", parent.status === 'INACTIVE' ? "text-emerald-600 hover:text-emerald-700" : "text-red-600 hover:text-red-700")}
                  onClick={() => setShowDeactivateModal(true)}
                >
                  {parent.status === 'INACTIVE' ? <UserPlus className="h-4 w-4" /> : <UserMinus className="h-4 w-4" />}
                  {parent.status === 'INACTIVE' ? t('parents.detail.activate', 'Activate') : t('parents.detail.deactivate', 'Deactivate')}
                </Button>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4 border-t pt-8 sm:grid-cols-4">
              <HeroMetric label={t('parents.detail.statusLabel', 'Status')} value={t('enum.parentStatus.' + parent.status.toLowerCase(), formatEnum(parent.status))} />
              <HeroMetric label={t('parents.detail.bracketLabel', 'Bracket')} value={t('enum.financialBracket.' + parent.financialBracket.toLowerCase(), formatEnum(parent.financialBracket))} />
              <HeroMetric label={t('parents.detail.childrenLabel', 'Children')} value={parent.children.length} />
              <HeroMetric label={t('parents.detail.servicesLabel', 'Services')} value={parent.serviceAssignments.length} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs and Main Content */}
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="w-full space-y-6 lg:w-80">
          <Card>
            <CardContent className="p-2">
              <nav className="flex flex-col gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      activeTab === tab
                        ? 'bg-primary text-primary-foreground'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                    )}
                  >
                    {t(`parents.detail.tab.${tab.toLowerCase().replace(/[\s&]+/g, '_')}`, tab)}
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                {t('parents.detail.contactInfo', 'Contact Info')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ContactItem icon={Phone} label={t('parents.detail.phone', 'Phone')} value={parent.phone} />
              <ContactItem icon={Mail} label={t('parents.detail.email', 'Email')} value={parent.email || t('parents.detail.noEmail', 'No email provided')} />
              <ContactItem icon={MapPin} label={t('parents.detail.location', 'Location')} value={`${parent.city}, ${parent.subcity}`} />
              <ContactItem icon={Fingerprint} label={t('parents.detail.nationalId', 'National ID')} value={parent.nationalId} />
            </CardContent>
          </Card>
        </div>

        <div className="flex-1 space-y-6">
          {activeTab === 'Profile' && (
            <>
              <div className="grid gap-6 md:grid-cols-2">
                <DetailCard title={t('parents.detail.backgroundInfo', 'Background Information')}>
                  <DetailItem icon={Heart} label={t('parents.detail.maritalStatus', 'Marital Status')} value={t('enum.maritalStatus.' + parent.maritalStatus.toLowerCase(), formatEnum(parent.maritalStatus))} />
                  <DetailItem icon={GraduationCap} label={t('parents.detail.education', 'Education')} value={parent.educationLevel} />
                  <DetailItem icon={Briefcase} label={t('parents.detail.employment', 'Employment')} value={t('enum.employmentStatus.' + (parent.employmentStatus || 'UNEMPLOYED').toLowerCase(), formatEnum(parent.employmentStatus || 'UNEMPLOYED'))} />
                  <DetailItem icon={Users} label={t('parents.detail.dependents', 'Dependents')} value={t('parents.detail.dependentsValue', '{count} family members', { count: String(parent.numberOfDependents) })} />
                </DetailCard>

                <DetailCard title={t('parents.detail.financialProfile', 'Financial Profile')}>
                  <DetailItem icon={Wallet} label={t('parents.detail.monthlyIncome', 'Monthly Income')} value={parseIncome(parent.internalNotes)} />
                  <DetailItem icon={CheckCircle2} label={t('parents.detail.financialBracket', 'Financial Bracket')} value={t('enum.financialBracket.' + parent.financialBracket.toLowerCase(), formatEnum(parent.financialBracket))} />
                  <DetailItem icon={ExternalLink} label={t('parents.detail.referralSource', 'Referral Source')} value={parent.referralSource || t('parents.detail.selfReferral', 'Self-referral')} />
                </DetailCard>
              </div>

              {parent.internalNotes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">{t('parents.detail.internalCaseNotes', 'Internal Case Notes')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
                      {parent.internalNotes}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {activeTab === 'Children' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold">{t('parents.detail.registeredChildren', 'Registered Children')}</CardTitle>
                <Button size="sm" variant="outline" className="gap-2" asChild>
                  <Link href={`/dashboard/children?parent=${parent.id}`}>
                    <Plus className="h-4 w-4" />
                    {t('parents.detail.addChild', 'Add Child')}
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {parent.children.length ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {parent.children.map((child: any) => (
                      <Link 
                        key={child.id} 
                        href={`/dashboard/children/${child.id}`}
                        className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-slate-50"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={child.photoUrl || undefined} />
                          <AvatarFallback>{initials(child.fullName)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 overflow-hidden">
                          <p className="truncate font-medium text-slate-900">{child.fullName}</p>
                          <p className="text-xs text-muted-foreground">{t('enum.disabilityType.' + child.disabilityType.toLowerCase(), formatEnum(child.disabilityType))}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px]">{t('enum.childStatus.' + child.status.toLowerCase(), formatEnum(child.status))}</Badge>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <EmptyState message={t('parents.detail.noChildren', 'No children registered under this parent profile.')} />
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'Services' && (
             <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold">{t('parents.detail.assignedServices', 'Assigned Services')}</CardTitle>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t('parents.detail.assignService', 'Assign Service')}
                </Button>
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
                          <TableCell>
                            <div className="font-medium">{sa.service.name}</div>
                            <div className="text-xs text-muted-foreground">{sa.service.category}</div>
                          </TableCell>
                          <TableCell className="text-sm">{sa.frequency}</TableCell>
                          <TableCell><Badge variant="secondary" className="text-[10px]">{sa.status}</Badge></TableCell>
                          <TableCell className="text-right">
                             <Button size="icon" variant="ghost" className="h-8 w-8">
                               <FileText className="h-4 w-4" />
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
          )}

          {activeTab === 'Fund & Finance' && (
            <Card>
               <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold">{t('parents.detail.financialAllocations', 'Financial Allocations')}</CardTitle>
                <Button size="sm" variant="outline" className="gap-2 text-primary border-primary hover:bg-primary/5">
                  <Plus className="h-4 w-4" />
                  {t('parents.detail.newAllocation', 'New Allocation')}
                </Button>
              </CardHeader>
              <CardContent>
                {parent.fundAllocations.length ? (
                   <div className="space-y-4">
                      {parent.fundAllocations.map((fund: any) => (
                        <div key={fund.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                          <div>
                            <p className="font-bold text-slate-900">{fund.amount} ETB</p>
                            <p className="text-xs text-muted-foreground">{formatDate(fund.allocationDate)} &middot; {fund.purpose}</p>
                          </div>
                          <Badge variant="outline" className={cn(
                            fund.status === 'APPROVED' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50"
                          )}>{fund.status}</Badge>
                        </div>
                      ))}
                   </div>
                ) : (
                  <EmptyState message={t('parents.detail.noFinanceHistory', 'No financial history for this profile.')} />
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'Documents' && (
             <Card>
               <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold">{t('parents.detail.uploadedDocuments', 'Uploaded Documents')}</CardTitle>
                <Button size="sm" variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t('parents.detail.upload', 'Upload')}
                </Button>
              </CardHeader>
              <CardContent>
                {parent.documents.length ? (
                   <div className="grid gap-4 sm:grid-cols-2">
                     {parent.documents.map((doc: any) => (
                       <div key={doc.id} className="flex items-center gap-3 rounded-lg border p-3">
                         <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                           <FileText className="h-5 w-5" />
                         </div>
                         <div className="flex-1 overflow-hidden">
                           <p className="truncate text-sm font-medium">{doc.title}</p>
                           <p className="text-xs text-muted-foreground">{doc.type}</p>
                         </div>
                         <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                           <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
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
          )}
        </div>
      </div>

      <ParentDrawer
        open={drawerOpen}
        parentId={parent.id}
        fallbackParent={parent}
        staffOptions={staff}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => {
          setDrawerOpen(false);
          fetchParent();
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
    </div>
  );
}

// Sub-components
function HeroMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center sm:text-left">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function ContactItem({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 rounded bg-slate-50 p-1.5 text-slate-400">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
      </CardContent>
    </Card>
  );
}

function DetailItem({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/5 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
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

function parseIncome(notes?: string | null) {
  if (!notes) return tI18n('parents.detail.notDisclosed', 'Not disclosed');
  const match = notes.match(/Monthly income range:\s*(.*)/);
  return match ? match[1] : tI18n('parents.detail.notDisclosed', 'Not disclosed');
}

function initials(name: string) { return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2); }
