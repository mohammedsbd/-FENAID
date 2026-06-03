'use client';

import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { format, isBefore } from 'date-fns';
import {
  Baby,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileUp,
  Files,
  MapPin,
  UserRound,
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

type ParentStatus = 'ACTIVE' | 'INACTIVE' | 'UNDER_REVIEW';
type FinancialBracket = 'LOW' | 'MEDIUM' | 'HIGH';

type ParentProfile = {
  id: string;
  fullName: string;
  photoUrl?: string | null;
  dateOfBirth: string;
  gender: string;
  nationalId: string;
  phone: string;
  email?: string | null;
  address: string;
  city: string;
  subcity: string;
  woreda: string;
  maritalStatus: string;
  employmentStatus: string;
  financialBracket: FinancialBracket;
  educationLevel: string;
  numberOfDependents: number;
  referralSource?: string | null;
  status: ParentStatus;
  internalNotes?: string | null;
  createdAt: string;
  assignedStaff?: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  } | null;
  children: Array<{
    id: string;
    fullName: string;
    photoUrl?: string | null;
    dateOfBirth: string;
    gender: string;
    disabilityType: string;
    disabilityCategory: string;
    severityLevel: string;
    status: string;
  }>;
  serviceAssignments: Array<{
    id: string;
    startDate: string;
    endDate?: string | null;
    frequency: string;
    deliveryMethod: string;
    status: string;
    notes?: string | null;
    service: {
      name: string;
      category: string;
      targetType: string;
    };
    assignedStaff?: {
      fullName: string;
    };
  }>;
  fundAllocations: Array<{
    id: string;
    amount: string | number;
    currency: string;
    purpose: string;
    allocationDate: string;
    status: string;
    parentAcknowledged: boolean;
    acknowledgedAt?: string | null;
  }>;
  documents: Array<{
    id: string;
    name: string;
    category: string;
    fileUrl: string;
    expiresAt?: string | null;
    createdAt: string;
    uploadedBy?: {
      fullName: string;
    };
  }>;
};

const tabs = ['Profile', 'Children', 'Services', 'Fund History', 'Documents'] as const;
type Tab = (typeof tabs)[number];

export default function ParentProfilePage() {
  const params = useParams<{ id: string }>();
  const [parent, setParent] = useState<ParentProfile | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('Profile');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchParent = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/parents/${params.id}`);
        setParent(res.data);
      } catch (err: unknown) {
        setError(getErrorMessage(err, 'Failed to load parent profile.'));
      } finally {
        setLoading(false);
      }
    };

    fetchParent();
  }, [params.id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-40 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-96 animate-pulse rounded-lg bg-slate-100" />
      </div>
    );
  }

  if (error || !parent) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          {error || 'Parent profile not found.'}
        </p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/parents">Back to Parents</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border">
                <AvatarImage src={parent.photoUrl || undefined} alt={parent.fullName} />
                <AvatarFallback className="text-lg">{initials(parent.fullName)}</AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">{parent.fullName}</h1>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <UserRound className="h-4 w-4" />
                      {parent.assignedStaff?.fullName || 'Unassigned'}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {parent.city}, {parent.subcity}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={parent.status} />
                  <BracketBadge bracket={parent.financialBracket} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <HeroMetric label="Children" value={parent.children.length} />
              <HeroMetric label="Services" value={parent.serviceAssignments.length} />
              <HeroMetric label="Funds" value={parent.fundAllocations.length} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 overflow-x-auto border-b">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              'whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium text-muted-foreground',
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent hover:text-foreground',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Profile' && <ProfileTab parent={parent} />}
      {activeTab === 'Children' && <ChildrenTab parent={parent} />}
      {activeTab === 'Services' && <ServicesTab parent={parent} />}
      {activeTab === 'Fund History' && <FundHistoryTab parent={parent} />}
      {activeTab === 'Documents' && <DocumentsTab parent={parent} />}
    </div>
  );
}

function ProfileTab({ parent }: { parent: ParentProfile }) {
  const fields = [
    ['Full Name', parent.fullName],
    ['National ID', parent.nationalId],
    ['Date of Birth', formatDate(parent.dateOfBirth)],
    ['Gender', parent.gender],
    ['Phone', parent.phone],
    ['Email', parent.email || 'Not provided'],
    ['Address', parent.address],
    ['City', parent.city],
    ['Subcity', parent.subcity],
    ['Woreda', parent.woreda],
    ['Marital Status', formatEnum(parent.maritalStatus)],
    ['Education Level', parent.educationLevel],
    ['Employment Status', formatEnum(parent.employmentStatus)],
    ['Financial Bracket', formatEnum(parent.financialBracket)],
    ['Dependents', String(parent.numberOfDependents)],
    ['Referral Source', parent.referralSource || 'Not provided'],
    ['Assigned Case Worker', parent.assignedStaff?.fullName || 'Unassigned'],
    ['Registered Date', formatDate(parent.createdAt)],
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Profile Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {fields.map(([label, value]) => (
            <div key={label} className="rounded-md border bg-slate-50/50 p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
              <p className="mt-1 text-sm font-medium">{value}</p>
            </div>
          ))}
        </div>
        <div className="rounded-md border p-4">
          <p className="text-xs font-medium uppercase text-muted-foreground">Internal Notes</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
            {parent.internalNotes || 'No internal notes recorded.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ChildrenTab({ parent }: { parent: ParentProfile }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {parent.children.length ? (
        parent.children.map((child) => (
          <Card key={child.id}>
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={child.photoUrl || undefined} alt={child.fullName} />
                  <AvatarFallback>{initials(child.fullName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold">{child.fullName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {child.gender} / {formatDate(child.dateOfBirth)}
                  </p>
                </div>
                <Badge variant="secondary">{formatEnum(child.status)}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <MiniStat icon={Baby} label="Disability" value={formatEnum(child.disabilityType)} />
                <MiniStat icon={CheckCircle2} label="Severity" value={formatEnum(child.severityLevel)} />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{child.disabilityCategory}</p>
              <Button className="mt-4 w-full" variant="outline" size="sm" asChild>
                <Link href={`/dashboard/children/${child.id}`}>
                  View Child
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))
      ) : (
        <EmptyState message="No linked children found for this parent." />
      )}
    </div>
  );
}

function ServicesTab({ parent }: { parent: ParentProfile }) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Service</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Delivery</TableHead>
              <TableHead>Staff</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parent.serviceAssignments.length ? (
              parent.serviceAssignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell className="font-medium">{assignment.service.name}</TableCell>
                  <TableCell>{assignment.service.category}</TableCell>
                  <TableCell>{formatEnum(assignment.frequency)}</TableCell>
                  <TableCell>{formatEnum(assignment.deliveryMethod)}</TableCell>
                  <TableCell>{assignment.assignedStaff?.fullName || 'Unassigned'}</TableCell>
                  <TableCell>{formatDate(assignment.startDate)}</TableCell>
                  <TableCell>
                    <GenericStatusBadge status={assignment.status} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  No assigned services found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function FundHistoryTab({ parent }: { parent: ParentProfile }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Fund Allocation Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {parent.fundAllocations.length ? (
          <div className="space-y-4">
            {parent.fundAllocations.map((fund) => (
              <div key={fund.id} className="relative border-l pl-5">
                <div className="absolute -left-2 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary" />
                <div className="rounded-md border p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold">
                        {Number(fund.amount).toLocaleString()} {fund.currency}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{fund.purpose}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <GenericStatusBadge status={fund.status} />
                      <Badge
                        className={cn(
                          fund.parentAcknowledged
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-amber-200 bg-amber-50 text-amber-700',
                        )}
                      >
                        {fund.parentAcknowledged ? 'Acknowledged' : 'Pending Acknowledgement'}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-4 w-4" />
                      Allocated {formatDate(fund.allocationDate)}
                    </span>
                    {fund.acknowledgedAt && (
                      <span>Acknowledged {formatDate(fund.acknowledgedAt)}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="No fund allocations have been recorded." />
        )}
      </CardContent>
    </Card>
  );
}

function DocumentsTab({ parent }: { parent: ParentProfile }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Documents</CardTitle>
        <Button size="sm">
          <FileUp className="h-4 w-4" />
          Upload
        </Button>
      </CardHeader>
      <CardContent>
        {parent.documents.length ? (
          <div className="space-y-3">
            {parent.documents.map((document) => {
              const expired = document.expiresAt
                ? isBefore(new Date(document.expiresAt), new Date())
                : false;
              return (
                <div
                  key={document.id}
                  className="flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                      <Files className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{document.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {document.category} / Uploaded {formatDate(document.createdAt)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Uploaded by {document.uploadedBy?.fullName || 'Unknown staff'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {document.expiresAt ? (
                      <Badge
                        className={cn(
                          expired
                            ? 'border-red-200 bg-red-50 text-red-700'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700',
                        )}
                      >
                        {expired ? 'Expired' : `Expires ${formatDate(document.expiresAt)}`}
                      </Badge>
                    ) : (
                      <Badge variant="outline">No expiry</Badge>
                    )}
                    <Button variant="outline" size="sm" asChild>
                      <Link href={document.fileUrl} target="_blank">
                        Open
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState message="No documents have been uploaded." />
        )}
      </CardContent>
    </Card>
  );
}

function HeroMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border px-4 py-3">
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="col-span-full flex min-h-40 items-center justify-center rounded-lg border border-dashed bg-white p-6 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function StatusBadge({ status }: { status: ParentStatus }) {
  const classes = {
    ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    UNDER_REVIEW: 'bg-amber-50 text-amber-700 border-amber-200',
    INACTIVE: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  return <Badge className={classes[status]}>{formatEnum(status)}</Badge>;
}

function BracketBadge({ bracket }: { bracket: FinancialBracket }) {
  const classes = {
    LOW: 'bg-red-50 text-red-700 border-red-200',
    MEDIUM: 'bg-blue-50 text-blue-700 border-blue-200',
    HIGH: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  return <Badge className={classes[bracket]}>{formatEnum(bracket)}</Badge>;
}

function GenericStatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const className =
    normalized === 'ACTIVE' || normalized === 'COMPLETED' || normalized === 'DISBURSED'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : normalized === 'PENDING' || normalized === 'ALLOCATED' || normalized === 'PARTIALLY_DISBURSED'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-slate-200 bg-slate-100 text-slate-600';

  return <Badge className={className}>{formatEnum(status)}</Badge>;
}

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDate(value: string) {
  return format(new Date(value), 'MMM dd, yyyy');
}

function initials(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function getErrorMessage(error: unknown, fallback: string) {
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
