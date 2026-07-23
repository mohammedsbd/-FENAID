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
import { useLocale } from '@/components/providers/locale-provider';
import api from '@/lib/api';
import { getSession } from '@/lib/auth';
import { ExportButton } from '@/components/dashboard/export-button';
import { exportToCSV, exportToExcelHTML, exportToWordHTML, exportToPDF, escapeHTML, formatEnum } from '@/lib/export';
import { t as tI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { ParentDrawer } from '@/components/dashboard/parent-drawer';
import { DeactivateConfirmationModal } from '@/components/dashboard/deactivate-confirmation-modal';
import { 
  ParentRow, 
  StaffOption, 
  ParentStatus, 
  MembershipStatus, 
  FinancialBracket, 
  SuggestedService 
} from '@/types/parents';

const statusOptions: ParentStatus[] = ['ACTIVE', 'UNDER_REVIEW', 'INACTIVE'];
const membershipStatusOptions: MembershipStatus[] = ['PAID', 'UNPAID'];
const bracketOptions: FinancialBracket[] = ['LOW', 'MEDIUM', 'HIGH'];

export default function ParentsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [parents, setParents] = useState<ParentRow[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
  const [financialBracket, setFinancialBracket] = useState('');
  const [membershipStatus, setMembershipStatus] = useState('');
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
  }, [debouncedSearch, status, financialBracket, membershipStatus, assignedStaffId, page]);

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
          membershipStatus: membershipStatus || undefined,
          assignedStaffId: assignedStaffId || undefined,
        },
      });
      setParents(res.data.data || []);
      setPages(res.data.meta?.pages || 1);
      setTotal(res.data.meta?.total || 0);
    } catch (err: unknown) {
      setError(getErrorMessage(err, t('parents.errorLoad', 'Failed to load parents.')));
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
        title: isActivating ? t('parents.toast.activated', 'Profile Activated') : t('parents.toast.deactivated', 'Profile Deactivated'),
        description: t('parents.toast.description', '{name} has been successfully {action}.', { name, action: isActivating ? t('parents.toast.activatedAction', 'activated') : t('parents.toast.deactivatedAction', 'deactivated') }),
      });
    } catch (err: unknown) {
      setError(getErrorMessage(err, t('parents.errorUpdateStatus', 'Failed to update parent status.')));
    }
  }

  async function handleToggleMembership(parent: ParentRow) {
    const newStatus: MembershipStatus = parent.membershipStatus === 'PAID' ? 'UNPAID' : 'PAID';
    try {
      await api.patch(`/parents/${parent.id}`, { membershipStatus: newStatus });
      fetchParents();
      toast({
        title: newStatus === 'PAID' ? t('parents.membership.markedPaid', 'Marked as Paid') : t('parents.membership.markedUnpaid', 'Marked as Unpaid'),
        description: t('parents.membership.toggleDesc', '{name} membership is now {status}.', { name: parent.fullName, status: newStatus }),
      });
    } catch (err: unknown) {
      setError(getErrorMessage(err, t('parents.membership.errorToggle', 'Failed to update membership status.')));
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
          membershipStatus: membershipStatus || undefined,
          assignedStaffId: assignedStaffId || undefined,
        },
      });
      const data = res.data.data || [];
      const filename = `parents-export-${new Date().toISOString().split('T')[0]}`;

      const membershipHeader = t('parents.export.csv.membership', 'Membership');
      const membershipFeeHeader = t('parents.export.csv.membershipFee', 'Membership Fee');

      if (formatType === 'csv') {
        const headers = [
          t('parents.export.csv.idTag', 'ID Tag'), t('parents.export.csv.fullName', 'Full Name'),
          t('parents.export.csv.nationalId', 'National ID'), t('parents.export.csv.phone', 'Phone'),
          t('parents.export.csv.email', 'Email'), t('parents.export.csv.city', 'City'),
          t('parents.export.csv.subcity', 'Subcity'), t('parents.export.csv.woreda', 'Woreda'),
          t('parents.export.csv.status', 'Status'),
          t('parents.export.csv.financialBracket', 'Financial Bracket'),
          membershipHeader, membershipFeeHeader,
          t('parents.export.csv.maritalStatus', 'Marital Status'),
          t('parents.export.csv.assignedWorker', 'Assigned Worker'),
          t('parents.export.csv.registeredDate', 'Registered Date'),
        ];
        const rows = data.map((p: any) => [
          p.idTag || '', p.fullName || '', p.nationalId || '', p.phone || '',
          p.email || '', p.city || '', p.subcity || '', p.woreda || '',
          p.status || '', p.financialBracket || '',
          p.membershipStatus || '', p.membershipFee != null ? Number(p.membershipFee).toLocaleString() : '',
          p.maritalStatus || '',
          p.assignedStaff?.fullName || t('parents.unassigned', 'Unassigned'),
          p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '',
        ]);
        exportToCSV(headers, rows, `${filename}.csv`);
      } else if (formatType === 'excel') {
        const headers = [
          t('parents.export.csv.idTag', 'ID Tag'), t('parents.export.csv.fullName', 'Full Name'),
          t('parents.export.csv.nationalId', 'National ID'), t('parents.export.csv.phone', 'Phone'),
          t('parents.export.csv.email', 'Email'), t('parents.export.csv.city', 'City'),
          t('parents.export.csv.subcity', 'Subcity'), t('parents.export.csv.woreda', 'Woreda'),
          t('parents.export.csv.status', 'Status'),
          t('parents.export.csv.financialBracket', 'Financial Bracket'),
          membershipHeader, membershipFeeHeader,
          t('parents.export.csv.maritalStatus', 'Marital Status'),
          t('parents.export.csv.assignedWorker', 'Assigned Worker'),
          t('parents.export.csv.registeredDate', 'Registered Date'),
        ];
        const rows = data.map((p: any) => [
          p.idTag || '', p.fullName || '', p.nationalId || '', p.phone || '',
          p.email || '', p.city || '', p.subcity || '', p.woreda || '',
          p.status || '', p.financialBracket || '',
          p.membershipStatus || '', p.membershipFee != null ? Number(p.membershipFee).toLocaleString() : '',
          p.maritalStatus || '',
          p.assignedStaff?.fullName || t('parents.unassigned', 'Unassigned'),
          p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '',
        ]);
        exportToExcelHTML(t('parents.export.directory', 'Parents Directory'), headers, rows, `${filename}.xls`);
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
              <td>${escapeHTML(p.membershipStatus || '')}</td>
              <td>${escapeHTML(p.membershipFee != null ? Number(p.membershipFee).toLocaleString() : '')}</td>
              <td>${escapeHTML(p.assignedStaff?.fullName || t('parents.unassigned', 'Unassigned'))}</td>
            </tr>
          `;
        });
        const contentHTML = `
          <h2>${t('parents.export.directory', 'Parents Directory')}</h2>
          <p>${t('parents.export.totalRecords', 'Total Records')}: ${data.length}</p>
          <table>
            <thead>
              <tr>
                <th>${t('parents.export.csv.idTag', 'ID Tag')}</th>
                <th>${t('parents.export.csv.fullName', 'Full Name')}</th>
                <th>${t('parents.export.csv.nationalId', 'National ID')}</th>
                <th>${t('parents.export.csv.phone', 'Phone')}</th>
                <th>${t('parents.export.csv.location', 'Location')}</th>
                <th>${t('parents.export.csv.status', 'Status')}</th>
                <th>${t('parents.export.csv.financialBracket', 'Financial Bracket')}</th>
                <th>${membershipHeader}</th>
                <th>${membershipFeeHeader}</th>
                <th>${t('parents.export.csv.caseWorker', 'Case Worker')}</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHTML}
            </tbody>
          </table>
        `;
        exportToWordHTML(t('parents.export.directory', 'Parents Directory'), contentHTML, `${filename}.doc`);
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
              <td>${escapeHTML(p.membershipStatus || '')}</td>
              <td>${escapeHTML(p.membershipFee != null ? Number(p.membershipFee).toLocaleString() : '')}</td>
              <td>${escapeHTML(p.assignedStaff?.fullName || t('parents.unassigned', 'Unassigned'))}</td>
            </tr>
          `;
        });
        const htmlBody = `
          <div style="margin-bottom: 20px; font-size: 13px; color: #475569;">
            ${t('parents.export.matchingRecords', 'Total records matching current filters')}: <b>${data.length}</b>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 10%">${t('parents.export.csv.idTag', 'ID Tag')}</th>
                <th style="width: 25%">${t('parents.export.csv.fullName', 'Full Name')}</th>
                <th style="width: 15%">${t('parents.export.csv.nationalId', 'National ID')}</th>
                <th style="width: 15%">${t('parents.export.csv.phone', 'Phone')}</th>
                <th style="width: 15%">${t('parents.export.csv.location', 'Location')}</th>
                <th style="width: 10%">${t('parents.export.csv.status', 'Status')}</th>
                <th style="width: 10%">${t('parents.export.csv.financial', 'Financial')}</th>
                <th style="width: 10%">${membershipHeader}</th>
                <th style="width: 10%">${membershipFeeHeader}</th>
                <th style="width: 15%">${t('parents.export.csv.caseWorker', 'Case Worker')}</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHTML}
            </tbody>
          </table>
        `;
        exportToPDF(t('parents.export.parentDirectory', 'Parent Directory'), htmlBody);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, t('parents.errorExport', 'Failed to export parents data.')));
    } finally {
      setExporting(false);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('parents.title', 'Parents')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('parents.description', 'Manage registered parents and their financial brackets.')}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center w-full sm:w-auto">
          <ExportButton onExport={handleExport} loading={exporting} />
          <Button onClick={openNewDrawer} className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            {t('parents.registerNew', 'Register New Parent')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(250px,1fr)_160px_160px_130px_160px_auto] lg:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="parent-search" className="text-sm font-semibold">{t('parents.search.label', 'Search Parents')}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/70" />
                <Input
                  id="parent-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t('parents.search.placeholder', 'Search by name, phone, ID...')}
                  className="h-12 pl-10 pr-10 text-base shadow-sm focus-visible:ring-primary"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-slate-100 dark:hover:bg-neutral-800 hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <FilterSelect label={t('parents.filter.status', 'Status')} value={status} onChange={setStatus}>
              <option value="">{t('parents.filter.statusAll', 'All statuses')}</option>
              {statusOptions.map((option) => (
                <option key={option} value={option}>{tI18n(`enum.parentStatus.${option.toLowerCase()}`, formatEnum(option))}</option>
              ))}
            </FilterSelect>
            <FilterSelect label={t('parents.filter.membership', 'Membership')} value={membershipStatus} onChange={setMembershipStatus}>
              <option value="">{t('parents.filter.membershipAll', 'All')}</option>
              {membershipStatusOptions.map((option) => (
                <option key={option} value={option}>{formatEnum(option)}</option>
              ))}
            </FilterSelect>
            <FilterSelect label={t('parents.filter.financialBracket', 'Financial Bracket')} value={financialBracket} onChange={setFinancialBracket}>
              <option value="">{t('parents.filter.bracketAll', 'All brackets')}</option>
              {bracketOptions.map((option) => (
                <option key={option} value={option}>{tI18n(`enum.financialBracket.${option.toLowerCase()}`, formatEnum(option))}</option>
              ))}
            </FilterSelect>
            <FilterSelect label={t('parents.filter.assignedStaff', 'Assigned Staff')} value={assignedStaffId} onChange={setAssignedStaffId}>
              <option value="">{t('parents.filter.staffAll', 'All staff')}</option>
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
                setMembershipStatus('');
                setAssignedStaffId('');
                setPage(page);
              }}
            >
              <RotateCcw className="h-4 w-4" />
              {t('parents.reset', 'Reset')}
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
                <TableHead>{t('parents.table.firstName', 'First Name')}</TableHead>
                <TableHead>{t('parents.table.lastName', 'Last Name')}</TableHead>
                <TableHead className="w-[120px]">{t('parents.table.id', 'ID')}</TableHead>
                <TableHead>{t('parents.table.nationalId', 'National ID')}</TableHead>
                <TableHead>{t('parents.table.phone', 'Phone')}</TableHead>
                <TableHead>{t('parents.table.financial', 'Financial')}</TableHead>
                <TableHead>{t('parents.table.membership', 'Membership')}</TableHead>
                <TableHead>{t('parents.table.status', 'Status')}</TableHead>
                <TableHead>{t('parents.table.staff', 'Staff')}</TableHead>
                <TableHead className="text-right">{t('parents.table.actions', 'Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(6)].map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={10}>
                      <div className="h-8 animate-pulse rounded bg-slate-100 dark:bg-neutral-800" />
                    </TableCell>
                  </TableRow>
                ))
              ) : parents.length ? (
                parents.map((parent) => (
                  <TableRow 
                    key={parent.id}
                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors"
                    onClick={() => router.push(`/dashboard/parents/${parent.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={parent.photoUrl || undefined} alt={parent.fullName} />
                          <AvatarFallback>{initials(parent.fullName)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{splitFullName(parent.fullName).firstName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{splitFullName(parent.fullName).lastName}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono font-bold text-primary">{parent.idTag || t('parents.table.idTagPlaceholder', '---')}</span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{parent.nationalId}</TableCell>
                    <TableCell>{parent.phone}</TableCell>
                    <TableCell>
                      <BracketBadge bracket={parent.financialBracket} />
                    </TableCell>
                    <TableCell>
                      <MembershipBadge 
                        status={parent.membershipStatus} 
                        fee={parent.membershipFee} 
                        onToggle={() => handleToggleMembership(parent)}
                      />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={parent.status} />
                    </TableCell>
                    <TableCell>{parent.assignedStaff?.fullName || t('parents.unassigned', 'Unassigned')}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditDrawer(parent);
                          }}
                          aria-label={t('parents.table.editLabel', 'Edit parent')}
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
                          aria-label={parent.status === 'INACTIVE' ? t('parents.table.activateLabel', 'Activate parent') : t('parents.table.deactivateLabel', 'Deactivate parent')}
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
                  <TableCell colSpan={9} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="rounded-full bg-slate-50 dark:bg-neutral-800 p-4">
                        <UserMinus className="h-10 w-10 text-muted-foreground/50" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-lg font-semibold">{t('parents.empty.title', 'No parents found')}</p>
                        <p className="max-w-xs text-sm text-muted-foreground">
                          {debouncedSearch
                            ? t('parents.empty.searchDesc', 'We couldn\'t find any parents matching "{search}". Try a different name or ID.', { search: debouncedSearch })
                            : t('parents.empty.generalDesc', "You haven't registered any parents yet. Click the 'Register New Parent' button to get started.")}
                        </p>
                      </div>
                      {debouncedSearch && (
                        <Button variant="outline" size="sm" onClick={() => setSearch('')}>
                          {t('parents.empty.clearSearch', 'Clear Search')}
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
              {t('parents.pagination.showing', 'Showing page {page} of {pages} for {total} parent records', { page: String(page), pages: String(pages), total: String(total) })}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                {t('parents.pagination.previous', 'Previous')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pages}
                onClick={() => setPage((current) => Math.min(pages, current + 1))}
              >
                {t('parents.pagination.next', 'Next')}
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
            title: editingParentId ? t('parents.drawer.updated', 'Profile Updated') : t('parents.drawer.registered', 'Parent Registered'),
            description: t('parents.drawer.saved', 'The parent profile has been saved successfully.'),
          });
        }}
      />

      {deactivatingParent && (
        <DeactivateConfirmationModal
          name={deactivatingParent.fullName}
          title={deactivatingParent.status === 'INACTIVE' ? t('parents.deactivate.titleActivate', 'Activate Profile?') : t('parents.deactivate.titleDeactivate', 'Deactivate Profile?')}
          description={deactivatingParent.status === 'INACTIVE' ? t('parents.deactivate.descActivate', 'Are you sure you want to activate {name}? This will restore their access in the system.', { name: deactivatingParent.fullName }) : undefined}
          confirmLabel={deactivatingParent.status === 'INACTIVE' ? t('parents.deactivate.confirmActivate', 'Activate Now') : t('parents.deactivate.confirmDeactivate', 'Deactivate Now')}
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
    INACTIVE: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700',
  };

  return <Badge className={classes[status]}>{tI18n(`enum.parentStatus.${status.toLowerCase()}`, formatEnum(status))}</Badge>;
}

function BracketBadge({ bracket }: { bracket: FinancialBracket }) {
  const classes = {
    LOW: 'bg-red-50 text-red-700 border-red-200',
    MEDIUM: 'bg-blue-50 text-blue-700 border-blue-200',
    HIGH: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  return <Badge className={classes[bracket]}>{tI18n(`enum.financialBracket.${bracket.toLowerCase()}`, formatEnum(bracket))}</Badge>;
}

function MembershipBadge({ status, fee, onToggle }: { status: MembershipStatus; fee?: number | null; onToggle?: () => void }) {
  const isPaid = status === 'PAID';
  const numericFee = fee != null ? Number(fee) : null;
  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onToggle?.();
        }}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all hover:opacity-80 active:scale-95"
        title={isPaid ? 'Click to mark as unpaid' : 'Click to mark as paid'}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${isPaid ? 'bg-emerald-500' : 'bg-amber-500'}`} />
        {isPaid ? 'Paid' : 'Unpaid'}
      </button>
      {numericFee != null && (
        <span className="text-[11px] font-medium text-slate-500">{numericFee.toLocaleString()} ETB</span>
      )}
    </div>
  );
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

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = (fullName || '').trim().split(' ');
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || '',
  };
}

function initials(value: string) {
  return value
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
