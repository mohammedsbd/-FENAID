'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Accessibility,
  Brain,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  UserMinus,
  X,
  UserPlus,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import api from '@/lib/api';
import { getSession } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { ExportButton } from '@/components/dashboard/export-button';
import { exportToCSV, exportToExcelHTML, exportToWordHTML, exportToPDF, escapeHTML, formatEnum } from '@/lib/export';
import { useToast } from '@/hooks/use-toast';
import { ChildDrawer } from '@/components/dashboard/child-drawer';
import { DeactivateConfirmationModal } from '@/components/dashboard/deactivate-confirmation-modal';
import { 
  ChildRow, 
  StaffOption, 
  ChildStatus, 
  DisabilityType, 
  SeverityLevel, 
  SuggestedService 
} from '@/types/children';

const statusOptions: ChildStatus[] = ['ACTIVE', 'GRADUATED', 'TRANSFERRED', 'INACTIVE', 'DECEASED'];
const disabilityOptions: DisabilityType[] = ['PHYSICAL', 'INTELLECTUAL', 'MULTIPLE'];
const severityOptions: SeverityLevel[] = ['MILD', 'MODERATE', 'SEVERE'];

export default function ChildrenPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [children, setChildren] = useState<ChildRow[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
  const [disabilityType, setDisabilityType] = useState('');
  const [severityLevel, setSeverityLevel] = useState('');
  const [assignedStaffId, setAssignedStaffId] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingChild, setEditingChild] = useState<ChildRow | null>(null);
  const [suggestedServices, setSuggestedServices] = useState<SuggestedService[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [deactivatingChild, setDeactivatingChild] = useState<ChildRow | null>(null);
  const [exporting, setExporting] = useState(false);


  useEffect(() => {
    const timeout = globalThis.setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search);
    }, 300);

    return () => globalThis.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    fetchChildren();
  }, [debouncedSearch, status, disabilityType, severityLevel, assignedStaffId, page]);

  useEffect(() => {
    const session = getSession();
    if (session) {
      setStaff([{ id: session.id, fullName: session.fullName, role: session.role }]);
    }

    const fetchStaff = async () => {
      try {
        const res = await api.get('/dashboard/admin');
        const options = (res.data.caseWorkerWorkload || []).map(
          (worker: { staffId: string; staffName: string }) => ({
            id: worker.staffId,
            fullName: worker.staffName,
          }),
        );
        if (options.length) {
          setStaff(options);
        }
      } catch {
        // Non-admins can still assign to themselves
      }
    };

    fetchStaff();
  }, []);

  const staffOptions = useMemo(() => {
    const fromChildren = children
      .map((child) => child.assignedStaff)
      .filter((worker): worker is StaffOption => Boolean(worker?.id));
    const unique = new Map<string, StaffOption>();
    [...staff, ...fromChildren].forEach((worker) => unique.set(worker.id, worker));
    return [...unique.values()];
  }, [children, staff]);

  async function fetchChildren() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/children', {
        params: {
          page,
          limit: 10,
          search: debouncedSearch || undefined,
          status: status || undefined,
          disabilityType: disabilityType || undefined,
          severityLevel: severityLevel || undefined,
          assignedStaffId: assignedStaffId || undefined,
        },
      });
      setChildren(res.data.data || []);
      setPages(res.data.meta?.pages || 1);
      setTotal(res.data.meta?.total || 0);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load children.'));
    } finally {
      setLoading(false);
    }
  }

  function openNewDrawer() {
    setEditingChild(null);
    setDrawerOpen(true);
  }

  async function openEditDrawer(child: ChildRow) {
    setEditingChild(child);
    setDrawerOpen(true);
  }

  async function handleToggleStatus() {
    if (!deactivatingChild) return;
    try {
      await api.delete(`/children/${deactivatingChild.id}`);
      const name = deactivatingChild.fullName;
      const isActivating = deactivatingChild.status === 'INACTIVE';
      
      setDeactivatingChild(null);
      fetchChildren();
      
      toast({
        title: isActivating ? 'Profile Activated' : 'Profile Deactivated',
        description: `${name} has been successfully ${isActivating ? 'activated' : 'deactivated'}.`,
      });
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to update child status.'));
    }
  }

  const handleExport = async (formatType: 'pdf' | 'csv' | 'excel' | 'docx') => {
    setExporting(true);
    try {
      const res = await api.get('/children', {
        params: {
          limit: 100000,
          search: debouncedSearch || undefined,
          status: status || undefined,
          disabilityType: disabilityType || undefined,
          severityLevel: severityLevel || undefined,
          assignedStaffId: assignedStaffId || undefined,
        },
      });
      const data = res.data.data || [];
      const filename = `children-export-${new Date().toISOString().split('T')[0]}`;

      if (formatType === 'csv') {
        const headers = ['ID Tag', 'Full Name', 'Gender', 'Date of Birth', 'Disability Type', 'Disability Category', 'Severity Level', 'School Status', 'Communication', 'Status', 'Parent Name', 'Assigned Worker', 'Registered Date'];
        const rows = data.map((c: any) => [
          c.idTag || '',
          c.fullName || '',
          c.gender || '',
          c.dateOfBirth ? new Date(c.dateOfBirth).toLocaleDateString() : '',
          c.disabilityType || '',
          c.disabilityCategory || '',
          c.severityLevel || '',
          c.schoolEnrollmentStatus || '',
          c.communicationAbility || '',
          c.status || '',
          c.parent?.fullName || '',
          c.assignedStaff?.fullName || 'Unassigned',
          c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''
        ]);
        exportToCSV(headers, rows, `${filename}.csv`);
      } else if (formatType === 'excel') {
        const headers = ['ID Tag', 'Full Name', 'Gender', 'Date of Birth', 'Disability Type', 'Disability Category', 'Severity Level', 'School Status', 'Communication', 'Status', 'Parent Name', 'Assigned Worker', 'Registered Date'];
        const rows = data.map((c: any) => [
          c.idTag || '',
          c.fullName || '',
          c.gender || '',
          c.dateOfBirth ? new Date(c.dateOfBirth).toLocaleDateString() : '',
          c.disabilityType || '',
          c.disabilityCategory || '',
          c.severityLevel || '',
          c.schoolEnrollmentStatus || '',
          c.communicationAbility || '',
          c.status || '',
          c.parent?.fullName || '',
          c.assignedStaff?.fullName || 'Unassigned',
          c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''
        ]);
        exportToExcelHTML('Children Directory', headers, rows, `${filename}.xls`);
      } else if (formatType === 'docx') {
        let tableRowsHTML = '';
        data.forEach((c: any) => {
          tableRowsHTML += `
            <tr>
              <td>${escapeHTML(c.idTag || '')}</td>
              <td><b>${escapeHTML(c.fullName || '')}</b></td>
              <td>${escapeHTML(c.gender || '')}</td>
              <td>${escapeHTML(c.dateOfBirth ? new Date(c.dateOfBirth).toLocaleDateString() : '')}</td>
              <td>${escapeHTML(formatEnum(c.disabilityType))}</td>
              <td><span class="badge">${escapeHTML(formatEnum(c.severityLevel))}</span></td>
              <td>${escapeHTML(c.parent?.fullName || '')}</td>
              <td>${escapeHTML(c.assignedStaff?.fullName || 'Unassigned')}</td>
            </tr>
          `;
        });
        const contentHTML = `
          <h2>Children Directory</h2>
          <p>Total Records: ${data.length}</p>
          <table>
            <thead>
              <tr>
                <th>ID Tag</th>
                <th>Full Name</th>
                <th>Gender</th>
                <th>DOB</th>
                <th>Disability Type</th>
                <th>Severity</th>
                <th>Parent</th>
                <th>Case Worker</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHTML}
            </tbody>
          </table>
        `;
        exportToWordHTML('Children Directory', contentHTML, `${filename}.doc`);
      } else if (formatType === 'pdf') {
        let tableRowsHTML = '';
        data.forEach((c: any) => {
          const severityClass = c.severityLevel === 'SEVERE' ? 'badge-inactive' : c.severityLevel === 'MODERATE' ? 'badge-review' : 'badge-active';
          tableRowsHTML += `
            <tr>
              <td>${escapeHTML(c.idTag || '')}</td>
              <td><b>${escapeHTML(c.fullName || '')}</b></td>
              <td>${escapeHTML(c.gender || '')}</td>
              <td>${escapeHTML(c.dateOfBirth ? new Date(c.dateOfBirth).toLocaleDateString() : '')}</td>
              <td>${escapeHTML(formatEnum(c.disabilityType))}</td>
              <td><span class="badge ${severityClass}">${escapeHTML(formatEnum(c.severityLevel))}</span></td>
              <td>${escapeHTML(c.parent?.fullName || '')}</td>
              <td>${escapeHTML(c.assignedStaff?.fullName || 'Unassigned')}</td>
            </tr>
          `;
        });
        const htmlBody = `
          <div style="margin-bottom: 20px; font-size: 13px; color: #475569;">
            Total records matching current filters: <b>${data.length}</b>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 10%">ID Tag</th>
                <th style="width: 22%">Full Name</th>
                <th style="width: 8%">Gender</th>
                <th style="width: 12%">DOB</th>
                <th style="width: 15%">Disability Type</th>
                <th style="width: 10%">Severity</th>
                <th style="width: 13%">Parent</th>
                <th style="width: 10%">Case Worker</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHTML}
            </tbody>
          </table>
        `;
        exportToPDF('Child Directory', htmlBody);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to export children data.'));
    } finally {
      setExporting(false);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Children</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Register and manage children profiles and progress.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center w-full sm:w-auto">
          <ExportButton onExport={handleExport} loading={exporting} />
          <Button onClick={openNewDrawer} className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Register New Child
          </Button>
        </div>

      </div>

      <Card>
        <CardHeader className="gap-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(250px,1fr)_160px_160px_160px_200px_auto] lg:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="child-search" className="text-sm font-semibold">Search Children</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/70" />
                <Input
                  id="child-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name, ID..."
                  className="h-12 pl-10 pr-10 text-base shadow-sm focus-visible:ring-primary"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-slate-100 hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <FilterSelect label="Disability Type" value={disabilityType} onChange={setDisabilityType}>
              <option value="">All types</option>
              {disabilityOptions.map((option) => (
                <option key={option} value={option}>{formatEnum(option)}</option>
              ))}
            </FilterSelect>
            <FilterSelect label="Severity" value={severityLevel} onChange={setSeverityLevel}>
              <option value="">All levels</option>
              {severityOptions.map((option) => (
                <option key={option} value={option}>{formatEnum(option)}</option>
              ))}
            </FilterSelect>
            <FilterSelect label="Status" value={status} onChange={setStatus}>
              <option value="">All statuses</option>
              {statusOptions.map((option) => (
                <option key={option} value={option}>{formatEnum(option)}</option>
              ))}
            </FilterSelect>
            <FilterSelect label="Assigned Staff" value={assignedStaffId} onChange={setAssignedStaffId}>
              <option value="">All staff</option>
              {staffOptions.map((worker) => (
                <option key={worker.id} value={worker.id}>{worker.fullName}</option>
              ))}
            </FilterSelect>
            <Button
              variant="outline"
              className="h-11"
              onClick={() => {
                setSearch('');
                setStatus('');
                setDisabilityType('');
                setSeverityLevel('');
                setAssignedStaffId('');
                setPage(1);
              }}
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Child Name</TableHead>
                <TableHead className="w-[120px]">ID</TableHead>
                <TableHead>Disability Type</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Parent Name</TableHead>
                <TableHead>Assigned Staff</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(6)].map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={8}>
                      <div className="h-8 animate-pulse rounded bg-slate-100" />
                    </TableCell>
                  </TableRow>
                ))
              ) : children.length ? (
                children.map((child) => (
                  <TableRow 
                    key={child.id}
                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => router.push(`/dashboard/children/${child.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={child.photoUrl || undefined} alt={child.fullName} />
                          <AvatarFallback>{initials(child.fullName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{child.fullName}</div>
                          <div className="text-xs text-muted-foreground">{calculateAge(child.dateOfBirth)} years old</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono font-bold text-primary">{child.idTag || '---'}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <DisabilityIcon type={child.disabilityType} />
                        <span className="text-sm">{formatEnum(child.disabilityType)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <SeverityBadge level={child.severityLevel} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={child.status} />
                    </TableCell>
                    <TableCell>
                      {child.parent ? (
                        <Link 
                          href={`/dashboard/parents/${child.parent.id}`} 
                          className="text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {child.parent.fullName}
                        </Link>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell>{child.assignedStaff?.fullName || 'Unassigned'}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditDrawer(child);
                          }}
                          aria-label="Edit child"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDeactivatingChild(child);
                          }}
                          aria-label={child.status === 'INACTIVE' ? 'Activate child' : 'Deactivate child'}
                          className={child.status === 'INACTIVE' ? "text-emerald-600 hover:text-emerald-700" : "text-red-600 hover:text-red-700"}
                        >
                          {child.status === 'INACTIVE' ? <UserPlus className="h-4 w-4" /> : <UserMinus className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="rounded-full bg-slate-50 p-4">
                        <UserMinus className="h-10 w-10 text-muted-foreground/50" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-lg font-semibold">No children found</p>
                        <p className="max-w-xs text-sm text-muted-foreground">
                          {debouncedSearch
                            ? `We couldn't find any children matching "${debouncedSearch}". Try a different name or ID.`
                            : "You haven't registered any children yet. Click the 'Register New Child' button to get started."}
                        </p>
                      </div>
                      {debouncedSearch && (
                        <Button variant="outline" size="sm" onClick={() => setSearch('')}>
                          Clear Search
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing page {page} of {pages} for {total} child records
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pages}
                onClick={() => setPage((current) => Math.min(pages, current + 1))}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <ChildDrawer
        open={drawerOpen}
        childId={editingChild?.id}
        fallbackChild={editingChild}
        staffOptions={staffOptions}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => {
          setDrawerOpen(false);
          fetchChildren();
          toast({
            title: editingChild ? 'Profile Updated' : 'Child Registered',
            description: 'The child profile has been saved successfully.',
          });
        }}
      />

      {showConfirmation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
            <div className="border-b p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Registration successful</h2>
                  <p className="text-sm text-muted-foreground">The profile has been saved.</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t p-4">
              <Button onClick={() => setShowConfirmation(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {deactivatingChild && (
        <DeactivateConfirmationModal
          name={deactivatingChild.fullName}
          title={deactivatingChild.status === 'INACTIVE' ? "Activate Profile?" : "Deactivate Profile?"}
          description={deactivatingChild.status === 'INACTIVE' ? `Are you sure you want to activate ${deactivatingChild.fullName}? This will restore their access in the system.` : undefined}
          confirmLabel={deactivatingChild.status === 'INACTIVE' ? "Activate Now" : "Deactivate Now"}
          onConfirm={handleToggleStatus}
          onCancel={() => setDeactivatingChild(null)}
        />
      )}
    </div>
  );
}

// Helpers
function DisabilityIcon({ type }: { type: DisabilityType }) {
  if (type === 'PHYSICAL') return <Accessibility className="h-4 w-4 text-blue-600" />;
  if (type === 'INTELLECTUAL') return <Brain className="h-4 w-4 text-purple-600" />;
  return <div className="flex -space-x-1"><Accessibility className="h-4 w-4 text-blue-600" /><Brain className="h-4 w-4 text-purple-600" /></div>;
}

function SeverityBadge({ level }: { level: SeverityLevel }) {
  const classes = {
    MILD: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    MODERATE: 'bg-amber-50 text-amber-700 border-amber-200',
    SEVERE: 'bg-red-50 text-red-700 border-red-200',
  };
  return <Badge className={classes[level]}>{formatEnum(level)}</Badge>;
}

function StatusBadge({ status }: { status: ChildStatus }) {
  const classes = {
    ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    GRADUATED: 'bg-blue-50 text-blue-700 border-blue-200',
    TRANSFERRED: 'bg-amber-50 text-amber-700 border-amber-200',
    INACTIVE: 'bg-slate-100 text-slate-600 border-slate-200',
    DECEASED: 'bg-red-950 text-white border-red-900',
  };
  return <Badge className={classes[status]}>{formatEnum(status)}</Badge>;
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      <select 
        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    </label>
  );
}

function calculateAge(dob: string) {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getErrorMessage(err: any, fallback: string) {
  return err.response?.data?.message?.[0] || err.response?.data?.message || fallback;
}
