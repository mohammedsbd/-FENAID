'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
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
import { ExportButton } from '@/components/dashboard/export-button';
import { exportToCSV, exportToExcelHTML, exportToWordHTML, exportToPDF, escapeHTML, formatEnum } from '@/lib/export';
import { useToast } from '@/hooks/use-toast';
import { ParentDrawer } from '@/components/dashboard/parent-drawer';
import { DeactivateConfirmationModal } from '@/components/dashboard/deactivate-confirmation-modal';
import { 
  ParentRow, 
  StaffOption, 
  ParentStatus, 
  FinancialBracket, 
  SuggestedService 
} from '@/types/parents';

const statusOptions: ParentStatus[] = ['ACTIVE', 'UNDER_REVIEW', 'INACTIVE'];
const bracketOptions: FinancialBracket[] = ['LOW', 'MEDIUM', 'HIGH'];

export default function ParentsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [parents, setParents] = useState<ParentRow[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
  const [financialBracket, setFinancialBracket] = useState('');
  const [assignedStaffId, setAssignedStaffId] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingParent, setEditingParent] = useState<ParentRow | null>(null);
  const [editingParentId, setEditingParentId] = useState<string | undefined>();
  const [suggestedServices, setSuggestedServices] = useState<SuggestedService[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [deactivatingParent, setDeactivatingParent] = useState<ParentRow | null>(null);
  const [exporting, setExporting] = useState(false);


  useEffect(() => {
    const timeout = globalThis.setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search);
    }, 300);

    return () => globalThis.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    fetchParents();
  }, [debouncedSearch, status, financialBracket, assignedStaffId, page]);

  useEffect(() => {
    const editId = searchParams.get('edit') || undefined;
    if (!editId) return;

    const found = parents.find((p) => p.id === editId);
    if (found) {
      setEditingParent(found);
      setEditingParentId(editId);
      setDrawerOpen(true);
    }
  }, [parents, searchParams]);

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
    const fromParents = parents
      .map((parent) => parent.assignedStaff)
      .filter((worker): worker is StaffOption => Boolean(worker?.id));
    const unique = new Map<string, StaffOption>();
    [...staff, ...fromParents].forEach((worker) => unique.set(worker.id, worker));
    return [...unique.values()];
  }, [parents, staff]);

  async function fetchParents() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/parents', {
        params: {
          page,
          limit: 10,
          search: debouncedSearch || undefined,
          status: status || undefined,
          financialBracket: financialBracket || undefined,
          assignedStaffId: assignedStaffId || undefined,
        },
      });
      setParents(res.data.data || []);
      setPages(res.data.meta?.pages || 1);
      setTotal(res.data.meta?.total || 0);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load parents.'));
    } finally {
      setLoading(false);
    }
  }

  function openNewDrawer() {
    setEditingParent(null);
    setEditingParentId(undefined);
    setDrawerOpen(true);
  }

  async function openEditDrawer(parent: ParentRow) {
    setEditingParent(parent);
    setEditingParentId(parent.id);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditingParent(null);
    setEditingParentId(undefined);

    if (searchParams.has('edit')) {
      router.replace(pathname);
    }
  }

  async function handleToggleStatus() {
    if (!deactivatingParent) return;
    try {
      await api.delete(`/parents/${deactivatingParent.id}`);
      const name = deactivatingParent.fullName;
      const isActivating = deactivatingParent.status === 'INACTIVE';
      
      setDeactivatingParent(null);
      fetchParents();
      
      toast({
        title: isActivating ? 'Profile Activated' : 'Profile Deactivated',
        description: `${name} has been successfully ${isActivating ? 'activated' : 'deactivated'}.`,
      });
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to update parent status.'));
    }
  }

  const handleExport = async (formatType: 'pdf' | 'csv' | 'excel' | 'docx') => {
    setExporting(true);
    try {
      const res = await api.get('/parents', {
        params: {
          limit: 100000,
          search: debouncedSearch || undefined,
          status: status || undefined,
          financialBracket: financialBracket || undefined,
          assignedStaffId: assignedStaffId || undefined,
        },
      });
      const data = res.data.data || [];
      const filename = `parents-export-${new Date().toISOString().split('T')[0]}`;

      if (formatType === 'csv') {
        const headers = ['ID Tag', 'Full Name', 'National ID', 'Phone', 'Email', 'City', 'Subcity', 'Woreda', 'Status', 'Financial Bracket', 'Marital Status', 'Assigned Worker', 'Registered Date'];
        const rows = data.map((p: any) => [
          p.idTag || '',
          p.fullName || '',
          p.nationalId || '',
          p.phone || '',
          p.email || '',
          p.city || '',
          p.subcity || '',
          p.woreda || '',
          p.status || '',
          p.financialBracket || '',
          p.maritalStatus || '',
          p.assignedStaff?.fullName || 'Unassigned',
          p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ''
        ]);
        exportToCSV(headers, rows, `${filename}.csv`);
      } else if (formatType === 'excel') {
        const headers = ['ID Tag', 'Full Name', 'National ID', 'Phone', 'Email', 'City', 'Subcity', 'Woreda', 'Status', 'Financial Bracket', 'Marital Status', 'Assigned Worker', 'Registered Date'];
        const rows = data.map((p: any) => [
          p.idTag || '',
          p.fullName || '',
          p.nationalId || '',
          p.phone || '',
          p.email || '',
          p.city || '',
          p.subcity || '',
          p.woreda || '',
          p.status || '',
          p.financialBracket || '',
          p.maritalStatus || '',
          p.assignedStaff?.fullName || 'Unassigned',
          p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ''
        ]);
        exportToExcelHTML('Parents Directory', headers, rows, `${filename}.xls`);
      } else if (formatType === 'docx') {
        let tableRowsHTML = '';
        data.forEach((p: any) => {
          tableRowsHTML += `
            <tr>
              <td>${escapeHTML(p.idTag || '')}</td>
              <td><b>${escapeHTML(p.fullName || '')}</b></td>
              <td>${escapeHTML(p.nationalId || '')}</td>
              <td>${escapeHTML(p.phone || '')}</td>
              <td>${escapeHTML(p.city || '')}, ${escapeHTML(p.subcity || '')}</td>
              <td><span class="badge">${escapeHTML(formatEnum(p.status))}</span></td>
              <td>${escapeHTML(formatEnum(p.financialBracket))}</td>
              <td>${escapeHTML(p.assignedStaff?.fullName || 'Unassigned')}</td>
            </tr>
          `;
        });
        const contentHTML = `
          <h2>Parents Directory</h2>
          <p>Total Records: ${data.length}</p>
          <table>
            <thead>
              <tr>
                <th>ID Tag</th>
                <th>Full Name</th>
                <th>National ID</th>
                <th>Phone</th>
                <th>Location</th>
                <th>Status</th>
                <th>Financial Bracket</th>
                <th>Case Worker</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHTML}
            </tbody>
          </table>
        `;
        exportToWordHTML('Parents Directory', contentHTML, `${filename}.doc`);
      } else if (formatType === 'pdf') {
        let tableRowsHTML = '';
        data.forEach((p: any) => {
          const statusClass = p.status === 'ACTIVE' ? 'badge-active' : p.status === 'INACTIVE' ? 'badge-inactive' : 'badge-review';
          tableRowsHTML += `
            <tr>
              <td>${escapeHTML(p.idTag || '')}</td>
              <td><b>${escapeHTML(p.fullName || '')}</b></td>
              <td>${escapeHTML(p.nationalId || '')}</td>
              <td>${escapeHTML(p.phone || '')}</td>
              <td>${escapeHTML(p.city || '')}, ${escapeHTML(p.subcity || '')}</td>
              <td><span class="badge ${statusClass}">${escapeHTML(formatEnum(p.status))}</span></td>
              <td>${escapeHTML(formatEnum(p.financialBracket))}</td>
              <td>${escapeHTML(p.assignedStaff?.fullName || 'Unassigned')}</td>
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
                <th style="width: 25%">Full Name</th>
                <th style="width: 15%">National ID</th>
                <th style="width: 15%">Phone</th>
                <th style="width: 15%">Location</th>
                <th style="width: 10%">Status</th>
                <th style="width: 10%">Financial</th>
                <th style="width: 15%">Case Worker</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHTML}
            </tbody>
          </table>
        `;
        exportToPDF('Parent Directory', htmlBody);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to export parents data.'));
    } finally {
      setExporting(false);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Parents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage registered parents and their financial brackets.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center w-full sm:w-auto">
          <ExportButton onExport={handleExport} loading={exporting} />
          <Button onClick={openNewDrawer} className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Register New Parent
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(250px,1fr)_160px_160px_160px_auto] lg:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="parent-search" className="text-sm font-semibold">Search Parents</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/70" />
                <Input
                  id="parent-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name, phone, ID..."
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
            <FilterSelect label="Status" value={status} onChange={setStatus}>
              <option value="">All statuses</option>
              {statusOptions.map((option) => (
                <option key={option} value={option}>{formatEnum(option)}</option>
              ))}
            </FilterSelect>
            <FilterSelect label="Financial Bracket" value={financialBracket} onChange={setFinancialBracket}>
              <option value="">All brackets</option>
              {bracketOptions.map((option) => (
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
                setFinancialBracket('');
                setAssignedStaffId('');
                setPage(page);
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
                <TableHead>Parent Name</TableHead>
                <TableHead className="w-[120px]">ID</TableHead>
                <TableHead>National ID</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Financial</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Staff</TableHead>
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
              ) : parents.length ? (
                parents.map((parent) => (
                  <TableRow 
                    key={parent.id}
                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => router.push(`/dashboard/parents/${parent.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={parent.photoUrl || undefined} alt={parent.fullName} />
                          <AvatarFallback>{initials(parent.fullName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{parent.fullName}</div>
                          <div className="text-xs text-muted-foreground">{parent.email || 'No email'}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono font-bold text-primary">{parent.idTag || '---'}</span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{parent.nationalId}</TableCell>
                    <TableCell>{parent.phone}</TableCell>
                    <TableCell>
                      <BracketBadge bracket={parent.financialBracket} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={parent.status} />
                    </TableCell>
                    <TableCell>{parent.assignedStaff?.fullName || 'Unassigned'}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditDrawer(parent);
                          }}
                          aria-label="Edit parent"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDeactivatingParent(parent);
                          }}
                          aria-label={parent.status === 'INACTIVE' ? 'Activate parent' : 'Deactivate parent'}
                          className={parent.status === 'INACTIVE' ? "text-emerald-600 hover:text-emerald-700" : "text-red-600 hover:text-red-700"}
                        >
                          {parent.status === 'INACTIVE' ? <UserPlus className="h-4 w-4" /> : <UserMinus className="h-4 w-4" />}
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
                        <p className="text-lg font-semibold">No parents found</p>
                        <p className="max-w-xs text-sm text-muted-foreground">
                          {debouncedSearch
                            ? `We couldn't find any parents matching "${debouncedSearch}". Try a different name or ID.`
                            : "You haven't registered any parents yet. Click the 'Register New Parent' button to get started."}
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
              Showing page {page} of {pages} for {total} parent records
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

      <ParentDrawer
        open={drawerOpen}
        parentId={editingParentId}
        fallbackParent={editingParent}
        staffOptions={staffOptions}
        onClose={closeDrawer}
        onSaved={() => {
          closeDrawer();
          fetchParents();
          toast({
            title: editingParentId ? 'Profile Updated' : 'Parent Registered',
            description: 'The parent profile has been saved successfully.',
          });
        }}
      />

      {deactivatingParent && (
        <DeactivateConfirmationModal
          name={deactivatingParent.fullName}
          title={deactivatingParent.status === 'INACTIVE' ? "Activate Profile?" : "Deactivate Profile?"}
          description={deactivatingParent.status === 'INACTIVE' ? `Are you sure you want to activate ${deactivatingParent.fullName}? This will restore their access in the system.` : undefined}
          confirmLabel={deactivatingParent.status === 'INACTIVE' ? "Activate Now" : "Deactivate Now"}
          onConfirm={handleToggleStatus}
          onCancel={() => setDeactivatingParent(null)}
        />
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <select 
        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={value} 
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
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

function initials(value: string) {
  return value
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
