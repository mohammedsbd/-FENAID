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
  parent: {
    id: string;
    fullName: string;
    photoUrl?: string | null;
    phone: string;
    financialBracket: string;
    fundAllocations: any[];
  };
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
};

const tabs = [
  'Profile',
  'Progress',
  'Services',
  'Appointments',
  'Fund & Finance',
  'Documents',
] as const;
type Tab = (typeof tabs)[number];

export default function ChildProfilePage() {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('Profile');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [staff, setStaff] = useState<StaffOption[]>([]);

  const fetchChild = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/children/${params.id}`);
      setChild(res.data);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load child profile.'));
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  const fetchStaff = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    void fetchChild();
    void fetchStaff();
  }, [fetchChild, fetchStaff]);

  const handleToggleStatus = async () => {
    if (!child) return;
    try {
      await api.delete(`/children/${child.id}`);
      const isActivating = child.status === 'INACTIVE';
      toast({
        title: isActivating ? 'Profile Activated' : 'Profile Deactivated',
        description: `${child.fullName} has been successfully ${isActivating ? 'activated' : 'deactivated'}.`,
      });
      setShowDeactivateModal(false);
      await fetchChild();
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: getErrorMessage(err, 'Failed to update child status.'),
      });
    }
  };

  const handleExport = (formatType: 'pdf' | 'csv' | 'excel' | 'docx') => {
    if (!child) return;
    setExporting(true);

    const filename = `child-${child.fullName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}`;
    const title = `Child Profile: ${child.fullName}`;

    const profileSections = [
      {
        title: 'Personal Information',
        fields: [
          ['Full Name', child.fullName],
          ['Gender', child.gender],
          ['Date of Birth', formatDate(child.dateOfBirth)],
          ['Age', `${calculateAge(child.dateOfBirth)} years`],
          ['Communication', formatEnum(child.communicationAbility)],
          ['Status', formatEnum(child.status)],
        ] as [string, string][],
      },
      {
        title: 'Disability & Education',
        fields: [
          ['Type', formatEnum(child.disabilityType)],
          ['Category', child.disabilityCategory],
          ['Severity', formatEnum(child.severityLevel)],
          ['School Status', formatEnum(child.schoolEnrollmentStatus)],
        ] as [string, string][],
      },
      {
        title: 'Medical & Assignment',
        fields: [
          ['Parent', child.parent.fullName],
          ['Case Worker', child.assignedStaff?.fullName || 'Unassigned'],
          ['Registered Date', formatDate(child.createdAt)],
        ] as [string, string][],
      },
    ];

    if (formatType === 'csv') {
      const headers = ['Field', 'Value'];
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
        contentHTML += `<h2>Medical Background</h2>`;
        if (child.medicalHistory) contentHTML += `<p><b>History:</b> ${escapeHTML(child.medicalHistory)}</p>`;
        if (child.medications) contentHTML += `<p><b>Medications:</b> ${escapeHTML(child.medications)}</p>`;
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
        htmlBody += `<h2>Medical Background</h2>`;
        if (child.medicalHistory) htmlBody += `<div class="field"><strong>History:</strong><br/>${escapeHTML(child.medicalHistory)}</div>`;
        if (child.medications) htmlBody += `<div class="field"><strong>Medications:</strong><br/>${escapeHTML(child.medications)}</div>`;
      }
      exportToPDF(title, htmlBody);
    }

    setExporting(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-40 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-96 animate-pulse rounded-lg bg-slate-100" />
      </div>
    );
  }

  if (error || !child) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm font-medium text-muted-foreground">{error || 'Child profile not found.'}</p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/children">Back to Children</Link>
        </Button>
      </div>
    );
  }

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
                  <span className="font-mono text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{child.idTag || '---'}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {calculateAge(child.dateOfBirth)} years old
                  </span>
                  <span className="flex items-center gap-1">
                    <DisabilityIcon type={child.disabilityType as any} />
                    {formatEnum(child.disabilityType)}
                  </span>
                  <span className="flex items-center gap-1">
                    <UserRound className="h-4 w-4" />
                    Parent: <Link href={`/dashboard/parents/${child.parent.id}`} className="text-primary hover:underline font-medium">{child.parent.fullName}</Link>
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={child.status as any} />
                <SeverityBadge level={child.severityLevel as any} />
                <Badge variant="outline" className="bg-slate-50">{child.disabilityCategory}</Badge>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <ExportButton onExport={handleExport} loading={exporting} />
              <Button size="sm">
                <Plus className="h-4 w-4" />
                Add Progress Note
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDrawerOpen(true)}>
                  <Pencil className="h-4 w-4" />
                  Edit Profile
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
                {child.status === 'INACTIVE' ? 'Activate' : 'Deactivate'}
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
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="mt-6">
        {activeTab === 'Profile' && <ProfileTab child={child} />}
        {activeTab === 'Progress' && <ProgressTab child={child} />}
        {activeTab === 'Services' && <ServicesTab child={child} />}
        {activeTab === 'Appointments' && <AppointmentsTab child={child} />}
        {activeTab === 'Fund & Finance' && <FinanceTab child={child} />}
        {activeTab === 'Documents' && <DocumentsTab child={child} />}
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
            title: 'Profile Updated',
            description: 'The child profile has been saved successfully.',
          });
        }}
      />

      {showDeactivateModal && (
        <DeactivateConfirmationModal
          name={child.fullName}
          title={child.status === 'INACTIVE' ? 'Activate Profile?' : 'Deactivate Profile?'}
          description={
            child.status === 'INACTIVE'
              ? `Are you sure you want to activate ${child.fullName}? This will restore their access in the system.`
              : undefined
          }
          confirmLabel={child.status === 'INACTIVE' ? 'Activate Now' : 'Deactivate Now'}
          onConfirm={handleToggleStatus}
          onCancel={() => setShowDeactivateModal(false)}
        />
      )}
    </div>
  );
}

// Sub-components for Tabs
function ProfileTab({ child }: { child: ChildProfile }) {
  const groups = [
    {
      title: 'Personal Information',
      icon: UserRound,
      fields: [
        ['Full Name', child.fullName],
        ['Gender', child.gender],
        ['Date of Birth', formatDate(child.dateOfBirth)],
        ['Age', `${calculateAge(child.dateOfBirth)} years`],
        ['Communication', formatEnum(child.communicationAbility)],
        ['Status', formatEnum(child.status)],
      ],
    },
    {
      title: 'Disability & Education',
      icon: Accessibility,
      fields: [
        ['Type', formatEnum(child.disabilityType)],
        ['Category', child.disabilityCategory],
        ['Severity', formatEnum(child.severityLevel)],
        ['School Status', formatEnum(child.schoolEnrollmentStatus)],
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
          <CardTitle className="text-base">Medical Background</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase">Medical History</p>
            <p className="text-sm leading-relaxed text-slate-700 bg-slate-50 p-4 rounded-md border italic">
              {child.medicalHistory || 'No medical history recorded.'}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase">Current Medications</p>
            <p className="text-sm leading-relaxed text-slate-700 bg-slate-50 p-4 rounded-md border italic">
              {child.medications || 'No medications recorded.'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProgressTab({ child }: { child: ChildProfile }) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Timeline of Notes */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Progress Timeline</CardTitle>
            </div>
            <Button size="sm" variant="outline">View All</Button>
          </CardHeader>
          <CardContent>
            {child.progressNotes.length ? (
              <div className="space-y-6">
                {child.progressNotes.map((note, idx) => (
                  <div key={note.id} className="relative pl-6 pb-6 last:pb-0">
                    {idx !== child.progressNotes.length - 1 && (
                      <div className="absolute left-[7px] top-6 bottom-0 w-px bg-slate-200" />
                    )}
                    <div className="absolute left-0 top-1.5 h-4 w-4 rounded-full border-2 border-primary bg-white" />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase">{formatDate(note.createdAt)}</span>
                        <span className="text-xs font-medium px-2 py-0.5 bg-slate-100 rounded text-slate-600">{note.staff?.fullName}</span>
                      </div>
                      <p className="text-sm leading-relaxed bg-slate-50/50 p-3 rounded-md border">{note.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="No progress notes recorded yet." />
            )}
          </CardContent>
        </Card>

        {/* Milestone Checklist */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Milestones</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {child.milestones.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {child.milestones.map((ms) => (
                  <div key={ms.id} className="flex items-center justify-between p-3 border rounded-md bg-slate-50/30">
                    <div className="flex items-center gap-3">
                      {ms.status === 'ACHIEVED' ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <TrendingUp className="h-5 w-5 text-slate-300" />
                      )}
                      <span className="text-sm font-medium">{ms.title}</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">{formatEnum(ms.status)}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="No milestones defined." />
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
              <CardTitle className="text-base">Active Goals</CardTitle>
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
                     <Badge className={goal.type === 'SHORT_TERM' ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"}>
                       {formatEnum(goal.type)}
                     </Badge>
                     <span className="text-[10px] text-muted-foreground">{formatDate(goal.createdAt)}</span>
                   </div>
                   <h4 className="text-sm font-bold">{goal.title}</h4>
                   <p className="text-xs text-muted-foreground line-clamp-2">{goal.description}</p>
                </div>
              ))
            ) : (
              <EmptyState message="No goals set." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ServicesTab({ child }: { child: ChildProfile }) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service</TableHead>
              <TableHead>Staff</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {child.serviceAssignments.length ? (
              child.serviceAssignments.map((sa) => (
                <TableRow key={sa.id}>
                  <TableCell className="font-semibold">{sa.service.name}</TableCell>
                  <TableCell>{sa.assignedStaff?.fullName || 'N/A'}</TableCell>
                  <TableCell>{formatEnum(sa.frequency)}</TableCell>
                  <TableCell>{formatDate(sa.startDate)}</TableCell>
                  <TableCell>{sa.endDate ? formatDate(sa.endDate) : 'Ongoing'}</TableCell>
                  <TableCell><GenericStatusBadge status={sa.status} /></TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No assigned services.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function AppointmentsTab({ child }: { child: ChildProfile }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
         <div className="flex items-center gap-2">
           <CalendarDays className="h-5 w-5 text-primary" />
           <CardTitle className="text-base">Upcoming Appointments</CardTitle>
         </div>
         <Button size="sm">Schedule New</Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {child.appointments.length ? (
            child.appointments.map((apt) => (
              <div key={apt.id} className="flex items-center justify-between p-4 border rounded-lg bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 flex flex-col items-center justify-center bg-white border rounded text-center">
                    <span className="text-[10px] font-bold text-primary uppercase">{format(new Date(apt.scheduledAt), 'MMM')}</span>
                    <span className="text-lg font-bold leading-none">{format(new Date(apt.scheduledAt), 'dd')}</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">{apt.title}</h4>
                    <p className="text-xs text-muted-foreground">{format(new Date(apt.scheduledAt), 'hh:mm a')} / {apt.staff?.fullName}</p>
                  </div>
                </div>
                <GenericStatusBadge status={apt.status} />
              </div>
            ))
          ) : (
            <EmptyState message="No upcoming appointments." />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FinanceTab({ child }: { child: ChildProfile }) {
  const allocations = child.parent.fundAllocations || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Fund Allocations (Parent Linked)</CardTitle>
        </div>
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
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Acknowledged</Badge>
                    ) : (
                      <Badge className="bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>
                    )}
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Allocated on {formatDate(fund.allocationDate)}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="No fund allocations linked to this child's parent." />
        )}
      </CardContent>
    </Card>
  );
}

function DocumentsTab({ child }: { child: ChildProfile }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Files className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Documents</CardTitle>
        </div>
        <Button size="sm"><FileUp className="h-4 w-4" /> Upload</Button>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {child.documents.length ? (
            child.documents.map((doc) => (
              <div key={doc.id} className="p-4 border rounded-lg bg-slate-50/50 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="p-2 bg-white rounded border"><Files className="h-5 w-5 text-slate-400" /></div>
                  <Badge variant="outline">{doc.category}</Badge>
                </div>
                <div>
                  <h4 className="text-sm font-bold truncate">{doc.name}</h4>
                  <p className="text-xs text-muted-foreground">Added {formatDate(doc.createdAt)}</p>
                </div>
                <Button size="sm" variant="outline" className="w-full" asChild>
                  <Link href={doc.fileUrl} target="_blank">Open Document <ExternalLink className="h-3 w-3 ml-2" /></Link>
                </Button>
              </div>
            ))
          ) : (
            <div className="col-span-full"><EmptyState message="No documents uploaded." /></div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Helpers
function DisabilityIcon({ type }: { type: 'PHYSICAL' | 'INTELLECTUAL' | 'MULTIPLE' }) {
  if (type === 'PHYSICAL') return <Accessibility className="h-4 w-4 text-blue-600" />;
  if (type === 'INTELLECTUAL') return <Brain className="h-4 w-4 text-purple-600" />;
  return <div className="flex -space-x-1"><Accessibility className="h-4 w-4 text-blue-600" /><Brain className="h-4 w-4 text-purple-600" /></div>;
}

function SeverityBadge({ level }: { level: 'MILD' | 'MODERATE' | 'SEVERE' }) {
  const classes = {
    MILD: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    MODERATE: 'bg-amber-50 text-amber-700 border-amber-200',
    SEVERE: 'bg-red-50 text-red-700 border-red-200',
  };
  return <Badge className={classes[level]}>{formatEnum(level)}</Badge>;
}

function StatusBadge({ status }: { status: 'ACTIVE' | 'GRADUATED' | 'TRANSFERRED' | 'INACTIVE' | 'DECEASED' }) {
  const classes = {
    ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    GRADUATED: 'bg-blue-50 text-blue-700 border-blue-200',
    TRANSFERRED: 'bg-amber-50 text-amber-700 border-amber-200',
    INACTIVE: 'bg-slate-100 text-slate-600 border-slate-200',
    DECEASED: 'bg-red-950 text-white border-red-900',
  };
  return <Badge className={classes[status]}>{formatEnum(status)}</Badge>;
}

function GenericStatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const className = ['ACTIVE', 'COMPLETED', 'DISBURSED', 'ACHIEVED'].includes(normalized)
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : ['PENDING', 'ALLOCATED', 'IN_PROGRESS', 'SCHEDULED'].includes(normalized)
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : 'border-slate-200 bg-slate-100 text-slate-600';
  return <Badge className={className}>{formatEnum(status)}</Badge>;
}

function EmptyState({ message }: { message: string }) {
  return <div className="flex min-h-[100px] items-center justify-center rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{message}</div>;
}

function profileToChildRow(child: ChildProfile): ChildRow {
  return {
    id: child.id,
    idTag: child.idTag,
    fullName: child.fullName,
    photoUrl: child.photoUrl,
    dateOfBirth: child.dateOfBirth,
    disabilityType: child.disabilityType as ChildRow['disabilityType'],
    disabilityCategory: child.disabilityCategory,
    severityLevel: child.severityLevel as ChildRow['severityLevel'],
    status: child.status as ChildRow['status'],
    parentId: child.parent.id,
    assignedStaffId: child.assignedStaff?.id || '',
    createdAt: child.createdAt,
    parent: {
      id: child.parent.id,
      fullName: child.parent.fullName,
    },
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

function formatDate(value: string) { return format(new Date(value), 'MMM dd, yyyy'); }
function initials(name: string) { return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2); }
function getErrorMessage(err: any, fallback: string) { return err.response?.data?.message || fallback; }
