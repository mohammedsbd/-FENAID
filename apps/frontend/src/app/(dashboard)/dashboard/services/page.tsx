'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Plus,
  Search,
  X,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  List,
  Grid3X3,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  PlayCircle,
  Power,
  CheckCheck,
  Pencil,
  Eye,
  AlertCircle,
  ExternalLink,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/components/providers/locale-provider';
import { getSession } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ExportButton, ExportFormat } from '@/components/dashboard/export-button';
import { exportToCSV, exportToExcelHTML, exportToWordHTML, exportToPDF, escapeHTML, formatEnum } from '@/lib/export';

import {
  getServices,
  deleteService,
  getAssignments,
  updateAssignment,
  getReferrals,
  deleteReferral,
  type ServiceDto,
  type ServiceAssignmentDto,
  type PaginatedResult,
} from '@/lib/services-api';
import { ServiceCard } from '@/components/services/ServiceCard';
import { ServiceDrawer } from '@/components/services/ServiceDrawer';
import { AssignServiceDrawer } from '@/components/services/AssignServiceDrawer';
import { EditAssignmentDrawer } from '@/components/services/EditAssignmentDrawer';
import { AssignmentDetailPanel } from '@/components/services/AssignmentDetailPanel';
import { AssignmentStatusBadge } from '@/components/services/AssignmentStatusBadge';
import { FrequencyBadge } from '@/components/services/FrequencyBadge';
import { ReferralDrawer } from '@/components/services/ReferralDrawer';

type Tab = 'catalog' | 'assignments' | 'referrals';

export default function ServicesPage() {
  const { t } = useLocale();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState('');

  const isSuperAdmin = useMemo(() => userRole === 'SUPER_ADMIN', [userRole]);
  const canAssign = useMemo(() => userRole === 'SUPER_ADMIN' || userRole === 'CASE_WORKER', [userRole]);

  useEffect(() => {
    const session = getSession();
    setUserRole(session?.role ?? '');
  }, []);

  const [tab, setTab] = useState<Tab>('catalog');

  // Service Catalog state
  const [services, setServices] = useState<ServiceDto[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [serviceSearch, setServiceSearch] = useState('');
  const [serviceTargetFilter, setServiceTargetFilter] = useState('');
  const [serviceStatusFilter, setServiceStatusFilter] = useState('');

  // Service drawer
  const [serviceDrawerOpen, setServiceDrawerOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceDto | null>(null);

  // Assignments state
  const [assignments, setAssignments] = useState<PaginatedResult<ServiceAssignmentDto> | null>(null);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [assignSearch, setAssignSearch] = useState('');
  const [assignStatusFilter, setAssignStatusFilter] = useState('');
  const [assignTargetFilter, setAssignTargetFilter] = useState('');
  const [assignStaffFilter, setAssignStaffFilter] = useState('');
  const [assignPage, setAssignPage] = useState(1);

  // Confirmation modals
  const [deactivatingService, setDeactivatingService] = useState<ServiceDto | null>(null);
  const [cancellingAssignment, setCancellingAssignment] = useState<ServiceAssignmentDto | null>(null);
  const [reactivatingAssignment, setReactivatingAssignment] = useState<ServiceAssignmentDto | null>(null);
  const [deletingReferral, setDeletingReferral] = useState<any | null>(null);

  // Assignment drawer / detail / edit
  const [assignDrawerOpen, setAssignDrawerOpen] = useState(false);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [detailReadOnly, setDetailReadOnly] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<ServiceAssignmentDto | null>(null);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<ServiceAssignmentDto | null>(null);

  function openEditAssignment(assignment: ServiceAssignmentDto) {
    setEditingAssignment(assignment);
    setEditDrawerOpen(true);
  }

  // Referrals state
  const [referrals, setReferrals] = useState<PaginatedResult<any> | null>(null);
  const [referralsLoading, setReferralsLoading] = useState(true);
  const [referralSearch, setReferralSearch] = useState('');
  const [debouncedReferralSearch, setDebouncedReferralSearch] = useState('');
  const [referralStatusFilter, setReferralStatusFilter] = useState('');
  const [referralPage, setReferralPage] = useState(1);
  const [referralDrawerOpen, setReferralDrawerOpen] = useState(false);
  const [editingReferral, setEditingReferral] = useState<any | null>(null);

  async function fetchReferrals() {
    setReferralsLoading(true);
    try {
      const result = await getReferrals({
        search: debouncedReferralSearch || undefined,
        status: (referralStatusFilter as any) || undefined,
        page: referralPage,
        limit: 20,
      });
      setReferrals(result);
    } catch {
      toast({ title: t('common.error', 'Error'), description: t('services.referrals.error.load', 'Failed to load referrals'), variant: 'destructive' });
    } finally {
      setReferralsLoading(false);
    }
  }

  // Staff list for filter
  const [staffList, setStaffList] = useState<{ id: string; fullName: string }[]>([]);

  // Debounced search
  const [debouncedServiceSearch, setDebouncedServiceSearch] = useState('');
  const [debouncedAssignSearch, setDebouncedAssignSearch] = useState('');

  useEffect(() => {
    const t1 = setTimeout(() => setDebouncedServiceSearch(serviceSearch), 300);
    return () => clearTimeout(t1);
  }, [serviceSearch]);

  useEffect(() => {
    const t2 = setTimeout(() => setDebouncedAssignSearch(assignSearch), 300);
    return () => clearTimeout(t2);
  }, [assignSearch]);

  useEffect(() => {
    const t3 = setTimeout(() => setDebouncedReferralSearch(referralSearch), 300);
    return () => clearTimeout(t3);
  }, [referralSearch]);

  useEffect(() => {
    fetchServices();
  }, [debouncedServiceSearch, serviceTargetFilter, serviceStatusFilter]);

  useEffect(() => {
    fetchAssignments();
  }, [debouncedAssignSearch, assignStatusFilter, assignTargetFilter, assignStaffFilter, assignPage]);

  useEffect(() => {
    fetchReferrals();
  }, [debouncedReferralSearch, referralStatusFilter, referralPage]);

  useEffect(() => {
    async function fetchStaff() {
      try {
        const { default: api } = await import('@/lib/api');
        const dashRes = await api.get('/dashboard/admin');
        const workers = (dashRes.data.caseWorkerWorkload || []).map(
          (w: any) => ({ id: w.staffId, fullName: w.staffName })
        );
        if (workers.length) {
          setStaffList(workers);
        } else {
          const s = getSession();
          if (s) {
            setStaffList([{ id: s.id, fullName: s.fullName }]);
          }
        }
      } catch {
        const s = getSession();
        if (s) {
          setStaffList([{ id: s.id, fullName: s.fullName }]);
        }
      }
    }
    fetchStaff();
  }, []);

  async function fetchServices() {
    setServicesLoading(true);
    try {
      const result = await getServices({
        search: debouncedServiceSearch || undefined,
        targetType: (serviceTargetFilter as any) || undefined,
        isActive: serviceStatusFilter === 'active' ? true : serviceStatusFilter === 'inactive' ? false : undefined,
      });
      setServices(result);
    } catch {
      toast({ title: t('common.error', 'Error'), description: t('services.error.load', 'Failed to load services'), variant: 'destructive' });
    } finally {
      setServicesLoading(false);
    }
  }

  async function fetchAssignments() {
    setAssignmentsLoading(true);
    try {
      const result = await getAssignments({
        search: debouncedAssignSearch || undefined,
        status: (assignStatusFilter as any) || undefined,
        targetType: (assignTargetFilter as any) || undefined,
        assignedStaffId: assignStaffFilter || undefined,
        page: assignPage,
        limit: 20,
      });
      setAssignments(result);
    } catch {
      toast({ title: t('common.error', 'Error'), description: t('services.error.load', 'Failed to load assignments'), variant: 'destructive' });
    } finally {
      setAssignmentsLoading(false);
    }
  }

  function resetServiceFilters() {
    setServiceSearch('');
    setServiceTargetFilter('');
    setServiceStatusFilter('');
  }

  function resetAssignFilters() {
    setAssignSearch('');
    setAssignStatusFilter('');
    setAssignTargetFilter('');
    setAssignStaffFilter('');
    setAssignPage(1);
  }

  function resetReferralFilters() {
    setReferralSearch('');
    setReferralStatusFilter('');
    setReferralPage(1);
  }

  function openNewReferral() {
    setEditingReferral(null);
    setReferralDrawerOpen(true);
  }

  function openEditReferral(referral: any) {
    setEditingReferral(referral);
    setReferralDrawerOpen(true);
  }

  async function handleConfirmDeleteReferral() {
    const ref = deletingReferral;
    if (!ref) return;
    setDeletingReferral(null);
    try {
      await deleteReferral(ref.id);
      toast({
        title: t('services.referrals.deleted', 'Referral Deleted'),
        description: t('services.referrals.deletedDesc', 'The referral to "{organization}" has been deleted.', { organization: ref.referredTo }),
      });
      fetchReferrals();
    } catch (err: any) {
      const msg = err?.response?.data?.message || t('services.referrals.error.delete', 'Failed to delete referral');
      toast({ title: t('common.error', 'Error'), description: msg, variant: 'destructive' });
    }
  }

  function openAddService() {
    setEditingService(null);
    setServiceDrawerOpen(true);
  }

  function openEditService(service: ServiceDto) {
    setEditingService(service);
    setServiceDrawerOpen(true);
  }

  function handleToggleActive(service: ServiceDto) {
    if (service.isActive) {
      // Deactivating — show confirmation first
      setDeactivatingService(service);
    } else {
      // Reactivating — proceed directly
      void handleConfirmActivateService(service.id);
    }
  }

  async function handleConfirmActivateService(id: string) {
    try {
      const { updateService } = await import('@/lib/services-api');
      await updateService(id, { isActive: true });
      toast({
        title: t('services.catalog.activated', 'Service Activated'),
        description: t('services.catalog.activatedDesc', 'The service has been activated.'),
      });
      fetchServices();
    } catch (err: any) {
      const msg = err?.response?.data?.message || t('services.error.update', 'Failed to update service');
      toast({ title: t('common.error', 'Error'), description: msg, variant: 'destructive' });
    }
  }

  async function handleConfirmDeactivate(service: ServiceDto) {
    setDeactivatingService(null);
    try {
      await deleteService(service.id);
      toast({
        title: t('services.catalog.deactivated', 'Service Deactivated'),
        description: t('services.catalog.deactivatedDesc', '"{name}" has been deactivated.', { name: service.name }),
      });
      fetchServices();
    } catch (err: any) {
      const msg = err?.response?.data?.message || t('services.error.update', 'Failed to update service');
      toast({ title: t('common.error', 'Error'), description: msg, variant: 'destructive' });
    }
  }

  async function handleConfirmCancelled() {
    const assignment = cancellingAssignment;
    if (!assignment) return;
    setCancellingAssignment(null);
    try {
      await updateAssignment(assignment.id, { status: 'CANCELLED' });
      toast({
        title: t('services.toast.markedCancelled', 'Marked as Cancelled'),
        description: t('services.toast.statusUpdated', 'The assignment status has been updated.'),
      });
      fetchAssignments();
    } catch (err: any) {
      const msg = err?.response?.data?.message || t('services.error.update', 'Failed to update status');
      toast({ title: t('common.error', 'Error'), description: msg, variant: 'destructive' });
    }
  }

  function openAssignDrawer() {
    setAssignDrawerOpen(true);
  }

  function openDetailPanel(assignment: ServiceAssignmentDto, readOnly = false) {
    setSelectedAssignment(assignment);
    setDetailReadOnly(readOnly);
    setDetailPanelOpen(true);
  }

  async function handleStatusChange(id: string, status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED') {
    const currentAssignment = assignments?.data.find((a) => a.id === id) || (selectedAssignment?.id === id ? selectedAssignment : null);

    if (status === 'CANCELLED') {
      if (currentAssignment) {
        setCancellingAssignment(currentAssignment);
      }
      return;
    }

    // Confirmation prompt when reactivating a COMPLETED service
    if (status === 'ACTIVE' && currentAssignment?.status === 'COMPLETED') {
      setReactivatingAssignment(currentAssignment);
      return;
    }

    try {
      await updateAssignment(id, { status });
      toast({
        title: t('services.toast.statusUpdated', 'Status Updated'),
        description: t('services.toast.statusUpdatedDesc', 'Assignment status updated to {status}.', { status }),
      });
      fetchAssignments();
      setDetailPanelOpen(false);
      setSelectedAssignment(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message || t('services.error.update', 'Failed to update status');
      toast({ title: t('common.error', 'Error'), description: msg, variant: 'destructive' });
    }
  }

  async function handleConfirmReactivate() {
    const assignment = reactivatingAssignment;
    if (!assignment) return;
    setReactivatingAssignment(null);
    try {
      await updateAssignment(assignment.id, { status: 'ACTIVE' });
      toast({
        title: t('services.toast.reactivated', 'Assignment Reactivated'),
        description: t('services.toast.reactivatedDesc', 'The completed service assignment has been reactivated.'),
      });
      fetchAssignments();
      setDetailPanelOpen(false);
      setSelectedAssignment(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message || t('services.error.update', 'Failed to reactivate assignment');
      toast({ title: t('common.error', 'Error'), description: msg, variant: 'destructive' });
    }
  }

  const [exportingAssignments, setExportingAssignments] = useState(false);
  const [exportingReferrals, setExportingReferrals] = useState(false);

  async function handleExportAssignments(formatType: ExportFormat) {
    setExportingAssignments(true);
    try {
      const res = await getAssignments({
        search: debouncedAssignSearch || undefined,
        status: (assignStatusFilter as any) || undefined,
        targetType: (assignTargetFilter as any) || undefined,
        assignedStaffId: assignStaffFilter || undefined,
        limit: 1000,
        page: 1,
      });
      const data = res?.data || [];

      if (data.length === 0) {
        toast({
          title: t('common.error', 'Error'),
          description: t('services.export.noAssignments', 'No service assignments available to export.'),
          variant: 'destructive',
        });
        return;
      }

      const headers = [
        '#',
        t('services.table.recipient', 'Recipient'),
        t('services.table.type', 'Type'),
        t('services.table.service', 'Service'),
        t('services.table.category', 'Category'),
        t('services.table.frequency', 'Frequency'),
        t('services.table.delivery', 'Delivery'),
        t('services.table.status', 'Status'),
        t('services.table.startDate', 'Start Date'),
        t('services.table.endDate', 'End Date'),
        t('services.table.staff', 'Assigned Staff'),
      ];

      const rows = data.map((a: any, idx: number) => [
        String(idx + 1),
        a.parent?.fullName || a.child?.fullName || t('common.unknown', 'Unknown'),
        a.targetType === 'ALL' ? 'For All' : a.targetType === 'PARENT' ? 'Parent' : 'Child',
        a.service?.name || '',
        a.service?.category || '',
        formatEnum(a.frequency || ''),
        formatEnum(a.deliveryMethod || ''),
        formatEnum(a.status || ''),
        a.startDate ? format(new Date(a.startDate), 'yyyy-MM-dd') : '',
        a.endDate ? format(new Date(a.endDate), 'yyyy-MM-dd') : '',
        a.assignedStaff?.fullName || t('common.unassigned', 'Unassigned'),
      ]);

      const timestamp = format(new Date(), 'yyyyMMdd_HHmm');
      const filename = `service_assignments_${timestamp}`;

      if (formatType === 'csv') {
        exportToCSV(headers, rows, `${filename}.csv`);
      } else if (formatType === 'excel') {
        exportToExcelHTML(t('services.export.assignmentsTitle', 'Service Assignments Directory'), headers, rows, `${filename}.xls`);
      } else if (formatType === 'docx') {
        let tableRowsHTML = '';
        data.forEach((a: any, idx: number) => {
          tableRowsHTML += `
            <tr>
              <td>${idx + 1}</td>
              <td><b>${escapeHTML(a.parent?.fullName || a.child?.fullName || 'Unknown')}</b></td>
              <td><span class="badge">${escapeHTML(a.targetType)}</span></td>
              <td>${escapeHTML(a.service?.name || '')}</td>
              <td>${escapeHTML(a.service?.category || '')}</td>
              <td>${escapeHTML(formatEnum(a.frequency || ''))}</td>
              <td>${escapeHTML(formatEnum(a.deliveryMethod || ''))}</td>
              <td><span class="badge">${escapeHTML(formatEnum(a.status || ''))}</span></td>
              <td>${a.startDate ? format(new Date(a.startDate), 'yyyy-MM-dd') : ''}</td>
              <td>${a.endDate ? format(new Date(a.endDate), 'yyyy-MM-dd') : '—'}</td>
              <td>${escapeHTML(a.assignedStaff?.fullName || 'Unassigned')}</td>
            </tr>
          `;
        });
        const contentHTML = `
          <h2>${t('services.export.assignmentsTitle', 'Service Assignments Directory')}</h2>
          <p>${t('services.export.totalRecords', 'Total Records')}: ${data.length}</p>
          <table>
            <thead>
              <tr>
                ${headers.map((h) => `<th>${escapeHTML(h)}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${tableRowsHTML}
            </tbody>
          </table>
        `;
        exportToWordHTML(t('services.export.assignmentsTitle', 'Service Assignments Directory'), contentHTML, `${filename}.doc`);
      } else if (formatType === 'pdf') {
        let tableRowsHTML = '';
        data.forEach((a: any, idx: number) => {
          tableRowsHTML += `
            <tr>
              <td>${idx + 1}</td>
              <td><b>${escapeHTML(a.parent?.fullName || a.child?.fullName || 'Unknown')}</b></td>
              <td>${escapeHTML(a.targetType)}</td>
              <td>${escapeHTML(a.service?.name || '')}</td>
              <td>${escapeHTML(a.service?.category || '')}</td>
              <td>${escapeHTML(formatEnum(a.frequency || ''))}</td>
              <td>${escapeHTML(formatEnum(a.status || ''))}</td>
              <td>${a.startDate ? format(new Date(a.startDate), 'yyyy-MM-dd') : ''}</td>
              <td>${escapeHTML(a.assignedStaff?.fullName || 'Unassigned')}</td>
            </tr>
          `;
        });
        const pdfHeaders = ['#', 'Recipient', 'Type', 'Service', 'Category', 'Frequency', 'Status', 'Start Date', 'Staff'];
        const htmlBody = `
          <p style="font-size: 13px; color: #666; margin-bottom: 12px;">Total Assignments: ${data.length}</p>
          <table>
            <thead>
              <tr>${pdfHeaders.map((h) => `<th>${escapeHTML(h)}</th>`).join('')}</tr>
            </thead>
            <tbody>${tableRowsHTML}</tbody>
          </table>
        `;
        exportToPDF(t('services.export.assignmentsTitle', 'Service Assignments Directory'), htmlBody);
      }
      toast({
        title: t('services.export.successTitle', 'Export Successful'),
        description: t('services.export.successDesc', 'Export completed successfully.'),
      });
    } catch (err: any) {
      toast({
        title: t('common.error', 'Error'),
        description: t('services.export.error', 'Failed to export service assignments.'),
        variant: 'destructive',
      });
    } finally {
      setExportingAssignments(false);
    }
  }

  async function handleExportReferrals(formatType: ExportFormat) {
    setExportingReferrals(true);
    try {
      const res = await getReferrals({
        search: debouncedReferralSearch || undefined,
        status: referralStatusFilter as any || undefined,
        limit: 1000,
        page: 1,
      });
      const data = res?.data || [];

      if (data.length === 0) {
        toast({
          title: t('common.error', 'Error'),
          description: t('services.export.noReferrals', 'No referrals available to export.'),
          variant: 'destructive',
        });
        return;
      }

      const headers = [
        '#',
        t('services.referrals.table.recipient', 'Recipient'),
        t('services.table.type', 'Type'),
        t('services.referrals.table.organization', 'Referred To'),
        t('services.referrals.table.reason', 'Referral Reason'),
        t('services.referrals.table.referralDate', 'Referral Date'),
        t('services.referrals.table.followUpDate', 'Follow-up Date'),
        t('services.referrals.table.status', 'Status'),
        t('services.referrals.table.referredBy', 'Referred By'),
      ];

      const rows = data.map((r: any, idx: number) => [
        String(idx + 1),
        r.parent?.fullName || r.child?.fullName || t('common.unknown', 'Unknown'),
        r.parent ? 'Parent' : 'Child',
        r.referredTo || '',
        r.referralReason || '',
        r.referralDate ? format(new Date(r.referralDate), 'yyyy-MM-dd') : '',
        r.followUpDate ? format(new Date(r.followUpDate), 'yyyy-MM-dd') : '',
        formatEnum(r.status || ''),
        r.staff?.fullName || '—',
      ]);

      const timestamp = format(new Date(), 'yyyyMMdd_HHmm');
      const filename = `referrals_${timestamp}`;

      if (formatType === 'csv') {
        exportToCSV(headers, rows, `${filename}.csv`);
      } else if (formatType === 'excel') {
        exportToExcelHTML(t('services.export.referralsTitle', 'Referrals Directory'), headers, rows, `${filename}.xls`);
      } else if (formatType === 'docx') {
        let tableRowsHTML = '';
        data.forEach((r: any, idx: number) => {
          tableRowsHTML += `
            <tr>
              <td>${idx + 1}</td>
              <td><b>${escapeHTML(r.parent?.fullName || r.child?.fullName || 'Unknown')}</b></td>
              <td><span class="badge">${r.parent ? 'Parent' : 'Child'}</span></td>
              <td><b>${escapeHTML(r.referredTo || '')}</b></td>
              <td>${escapeHTML(r.referralReason || '')}</td>
              <td>${r.referralDate ? format(new Date(r.referralDate), 'yyyy-MM-dd') : ''}</td>
              <td>${r.followUpDate ? format(new Date(r.followUpDate), 'yyyy-MM-dd') : '—'}</td>
              <td><span class="badge">${escapeHTML(formatEnum(r.status || ''))}</span></td>
              <td>${escapeHTML(r.staff?.fullName || '—')}</td>
            </tr>
          `;
        });
        const contentHTML = `
          <h2>${t('services.export.referralsTitle', 'Referrals Directory')}</h2>
          <p>${t('services.export.totalRecords', 'Total Records')}: ${data.length}</p>
          <table>
            <thead>
              <tr>
                ${headers.map((h) => `<th>${escapeHTML(h)}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${tableRowsHTML}
            </tbody>
          </table>
        `;
        exportToWordHTML(t('services.export.referralsTitle', 'Referrals Directory'), contentHTML, `${filename}.doc`);
      } else if (formatType === 'pdf') {
        let tableRowsHTML = '';
        data.forEach((r: any, idx: number) => {
          tableRowsHTML += `
            <tr>
              <td>${idx + 1}</td>
              <td><b>${escapeHTML(r.parent?.fullName || r.child?.fullName || 'Unknown')}</b></td>
              <td>${r.parent ? 'Parent' : 'Child'}</td>
              <td>${escapeHTML(r.referredTo || '')}</td>
              <td>${escapeHTML(r.referralReason || '')}</td>
              <td>${r.referralDate ? format(new Date(r.referralDate), 'yyyy-MM-dd') : ''}</td>
              <td>${escapeHTML(formatEnum(r.status || ''))}</td>
              <td>${escapeHTML(r.staff?.fullName || '—')}</td>
            </tr>
          `;
        });
        const pdfHeaders = ['#', 'Recipient', 'Type', 'Referred To', 'Reason', 'Date', 'Status', 'Referred By'];
        const htmlBody = `
          <p style="font-size: 13px; color: #666; margin-bottom: 12px;">Total Referrals: ${data.length}</p>
          <table>
            <thead>
              <tr>${pdfHeaders.map((h) => `<th>${escapeHTML(h)}</th>`).join('')}</tr>
            </thead>
            <tbody>${tableRowsHTML}</tbody>
          </table>
        `;
        exportToPDF(t('services.export.referralsTitle', 'Referrals Directory'), htmlBody);
      }
      toast({
        title: t('services.export.successTitle', 'Export Successful'),
        description: t('services.export.successDesc', 'Export completed successfully.'),
      });
    } catch (err: any) {
      toast({
        title: t('common.error', 'Error'),
        description: t('services.export.error', 'Failed to export referrals.'),
        variant: 'destructive',
      });
    } finally {
      setExportingReferrals(false);
    }
  }

  const serviceCategories = useMemo(() => {
    return [...new Set(services.map((s) => s.category))];
  }, [services]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('Services', 'Services')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('services.subtitle', 'Manage service catalog, assignments, and external referrals')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'assignments' && (
            <>
              <ExportButton onExport={handleExportAssignments} loading={exportingAssignments} />
              {canAssign && (
                <Button onClick={openAssignDrawer}>
                  <Plus className="h-4 w-4" />
                  {t('services.assignService', 'Assign Service')}
                </Button>
              )}
            </>
          )}
          {tab === 'referrals' && (
            <>
              <ExportButton onExport={handleExportReferrals} loading={exportingReferrals} />
              {canAssign && (
                <Button onClick={() => { setEditingReferral(null); setReferralDrawerOpen(true); }}>
                  <Plus className="h-4 w-4" />
                  {t('services.referrals.create', 'Create Referral')}
                </Button>
              )}
            </>
          )}
          {tab === 'catalog' && canAssign && (
            <Button onClick={openAddService}>
              <Plus className="h-4 w-4" />
              {t('services.addService', 'Create New Service')}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto border-b">
        <button
          onClick={() => setTab('catalog')}
          className={cn(
            'whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors flex items-center gap-2',
            tab === 'catalog' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Grid3X3 className="h-4 w-4" />
          {t('services.tab.catalog', 'Service Catalog')}
        </button>
        <button
          onClick={() => setTab('assignments')}
          className={cn(
            'whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors flex items-center gap-2',
            tab === 'assignments' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <List className="h-4 w-4" />
          {t('services.tab.assignments', 'Assignments')}
        </button>
        <button
          onClick={() => setTab('referrals')}
          className={cn(
            'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap',
            tab === 'referrals' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <ExternalLink className="h-4 w-4" />
          {t('services.tab.referrals', 'Referrals')}
        </button>
      </div>

      {/* Tab: Service Catalog */}
      {tab === 'catalog' && (
        <div className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader className="gap-4">
              <div className="grid gap-4 lg:grid-cols-[1fr_160px_160px_auto] lg:items-end">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">{t('common.search', 'Search')}</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/70" />
                    <Input
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      placeholder={t('services.catalog.searchPlaceholder', 'Search by name or category...')}
                      className="h-12 pl-10 pr-10 text-base shadow-sm"
                    />
                    {serviceSearch && (
                      <button
                        type="button"
                        onClick={() => setServiceSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-slate-100 dark:hover:bg-neutral-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <FilterSelect label={t('services.catalog.targetType', 'Target')} value={serviceTargetFilter} onChange={setServiceTargetFilter}>
                  <option value="">{t('common.all', 'All Types')}</option>
                  <option value="PARENT">{t('services.catalog.forParents', 'For Parents')}</option>
                  <option value="CHILD">{t('services.catalog.forChildren', 'For Children')}</option>
                  <option value="ALL">{t('services.catalog.forAll', 'For All')}</option>
                </FilterSelect>
                <FilterSelect label={t('services.catalog.active', 'Status')} value={serviceStatusFilter} onChange={setServiceStatusFilter}>
                  <option value="">{t('common.all', 'All')}</option>
                  <option value="active">{t('services.catalog.active', 'Active')}</option>
                  <option value="inactive">{t('services.catalog.inactive', 'Inactive')}</option>
                </FilterSelect>
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="h-11" onClick={resetServiceFilters}>
                    <RotateCcw className="h-4 w-4 mr-1" />
                    {t('common.reset', 'Reset')}
                  </Button>
                  {isSuperAdmin && (
                    <Button className="h-11" onClick={openAddService}>
                      <Plus className="h-4 w-4 mr-1" />
                      {t('services.catalog.add', 'Add Service')}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Service Cards */}
          {servicesLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))}
            </div>
          ) : services.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="rounded-full bg-slate-50 dark:bg-neutral-800 p-4">
                <List className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <p className="text-lg font-semibold">{t('services.catalog.empty.title', 'No services found')}</p>
              <p className="max-w-xs text-sm text-muted-foreground text-center">
                {debouncedServiceSearch || serviceTargetFilter || serviceStatusFilter
                  ? t('services.catalog.empty.filtered', 'Try adjusting or removing filters to broaden your search.')
                  : t('services.catalog.empty.desc', 'Add your first service to get started.')}
              </p>
              {isSuperAdmin && !debouncedServiceSearch && !serviceTargetFilter && !serviceStatusFilter && (
                <Button onClick={openAddService}>
                  <Plus className="h-4 w-4 mr-1" />
                  {t('services.catalog.add', 'Add Service')}
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  isSuperAdmin={isSuperAdmin}
                  onEdit={openEditService}
                  onToggleActive={handleToggleActive}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Assignments */}
      {tab === 'assignments' && (
        <div className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader className="gap-4">
              <div className="grid gap-4 lg:grid-cols-[1fr_160px_140px_160px_auto] lg:items-end">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">{t('common.search', 'Search')}</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/70" />
                    <Input
                      value={assignSearch}
                      onChange={(e) => setAssignSearch(e.target.value)}
                      placeholder={t('services.table.searchPlaceholder', 'Search by parent or child name...')}
                      className="h-12 pl-10 pr-10 text-base shadow-sm"
                    />
                    {assignSearch && (
                      <button
                        type="button"
                        onClick={() => setAssignSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-slate-100 dark:hover:bg-neutral-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <FilterSelect label={t('services.table.status', 'Status')} value={assignStatusFilter} onChange={setAssignStatusFilter}>
                  <option value="">{t('common.all', 'All')}</option>
                  <option value="PENDING">{t('services.status.pending', 'Pending')}</option>
                  <option value="ACTIVE">{t('services.status.active', 'Active')}</option>
                  <option value="COMPLETED">{t('services.status.completed', 'Completed')}</option>
                  <option value="CANCELLED">{t('services.status.cancelled', 'Cancelled')}</option>
                </FilterSelect>
                <FilterSelect label={t('services.table.type', 'Target')} value={assignTargetFilter} onChange={setAssignTargetFilter}>
                  <option value="">{t('common.all', 'All')}</option>
                  <option value="PARENT">{t('dataQuery.parents', 'Parents')}</option>
                  <option value="CHILD">{t('dataQuery.children', 'Children')}</option>
                  <option value="ALL">{t('services.catalog.forAll', 'For All')}</option>
                </FilterSelect>
                <FilterSelect label={t('services.table.staff', 'Staff')} value={assignStaffFilter} onChange={setAssignStaffFilter}>
                  <option value="">{t('common.allStaff', 'All Staff')}</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>{s.fullName}</option>
                  ))}
                </FilterSelect>
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="h-11" onClick={resetAssignFilters}>
                    <RotateCcw className="h-4 w-4 mr-1" />
                    {t('common.reset', 'Reset')}
                  </Button>
                  {canAssign && (
                    <Button className="h-11" onClick={openAssignDrawer}>
                      <Plus className="h-4 w-4 mr-1" />
                      {t('services.assign.button', 'Assign Service')}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12 text-center font-bold">#</TableHead>
                    <TableHead>{t('services.table.recipient', 'Recipient')}</TableHead>
                    <TableHead>{t('services.table.service', 'Service')}</TableHead>
                    <TableHead>{t('services.table.type', 'Type')}</TableHead>
                    <TableHead>{t('services.table.frequency', 'Frequency')}</TableHead>
                    <TableHead>{t('services.table.delivery', 'Delivery')}</TableHead>
                    <TableHead>{t('services.table.status', 'Status')}</TableHead>
                    <TableHead>{t('services.table.startDate', 'Start Date')}</TableHead>
                    <TableHead>{t('services.table.endDate', 'End Date')}</TableHead>
                    <TableHead>{t('services.table.staff', 'Assigned Staff')}</TableHead>
                    <TableHead className="text-right">{t('services.table.actions', 'Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignmentsLoading ? (
                    [...Array(8)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={11}>
                          <Skeleton className="h-8 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : assignments && assignments.data.length > 0 ? (
                    assignments.data.map((a, idx) => (
                      <TableRow
                        key={a.id}
                        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors"
                        onClick={() => openDetailPanel(a)}
                      >
                        <TableCell className="w-12 text-center text-xs font-semibold text-muted-foreground">
                          {(assignPage - 1) * 20 + idx + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {initials(
                                  a.parent?.fullName || a.child?.fullName || '??'
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <Link
                              href={
                                a.parent
                                  ? `/dashboard/parents/${a.parent.id}`
                                  : a.child
                                  ? `/dashboard/children/${a.child.id}`
                                  : '#'
                              }
                              className="font-medium text-sm hover:text-primary truncate max-w-[140px]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {a.parent?.fullName || a.child?.fullName || t('common.unknown', 'Unknown')}
                            </Link>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{a.service?.name}</span>
                            <Badge variant="secondary" className="w-fit text-[10px] mt-0.5">
                              {a.service?.category}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] font-semibold',
                              a.targetType === 'ALL'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                                : a.targetType === 'PARENT'
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                                : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                            )}
                          >
                            {a.targetType === 'ALL'
                              ? t('services.assign.forAll', 'For All')
                              : a.targetType === 'PARENT'
                              ? t('services.assign.parent', 'Parent')
                              : t('services.assign.child', 'Child')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <FrequencyBadge frequency={a.frequency} />
                        </TableCell>
                        <TableCell>
                          <span className="text-xs capitalize">
                            {a.deliveryMethod.replace('_', ' ').toLowerCase()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <AssignmentStatusBadge status={a.status} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(a.startDate), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {a.endDate ? format(new Date(a.endDate), 'MMM dd, yyyy') : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {a.assignedStaff?.fullName || '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end items-center gap-1">
                            {canAssign && (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditAssignment(a);
                                  }}
                                  title={t('common.edit', 'Edit Assignment')}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                {/* Active / Deactive Toggle Button (Same Power Icon: Green when Active, Red when Deactive/Cancelled) */}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className={cn(
                                    "h-8 w-8 transition-colors",
                                    a.status === 'ACTIVE'
                                      ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300"
                                      : "text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:text-red-300"
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (a.status === 'ACTIVE') {
                                      handleStatusChange(a.id, 'CANCELLED');
                                    } else {
                                      handleStatusChange(a.id, 'ACTIVE');
                                    }
                                  }}
                                  title={
                                    a.status === 'ACTIVE'
                                      ? t('services.status.deactivate', 'Active — Click to Deactivate')
                                      : t('services.status.activate', 'Deactivated — Click to Activate')
                                  }
                                >
                                  <Power className="h-4 w-4" />
                                </Button>

                                {/* Separate Icon for Completed */}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className={cn(
                                    "h-8 w-8 transition-colors",
                                    a.status === 'COMPLETED'
                                      ? "text-purple-700 bg-purple-100 hover:bg-purple-200 dark:bg-purple-950 dark:text-purple-300"
                                      : "text-slate-500 hover:text-purple-600 hover:bg-purple-50"
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusChange(a.id, 'COMPLETED');
                                  }}
                                  title={t('services.detail.markComplete', 'Mark as Completed')}
                                >
                                  <CheckCheck className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDetailPanel(a, true);
                              }}
                              title={t('common.viewDetails', 'View Details')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={11} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <div className="rounded-full bg-slate-50 dark:bg-neutral-800 p-4">
                            <AlertCircle className="h-10 w-10 text-muted-foreground/50" />
                          </div>
                          <p className="text-lg font-semibold">{t('services.table.noAssignments', 'No service assignments yet')}</p>
                          <p className="max-w-xs text-sm text-muted-foreground">
                            {t('services.table.noAssignmentsDesc', 'Assign a service to a parent or child to get started.')}
                          </p>
                          {canAssign && (
                            <Button onClick={openAssignDrawer}>
                              <Plus className="h-4 w-4 mr-1" />
                              {t('services.assign.button', 'Assign Service')}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {assignments && assignments.totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-6 py-4">
                  <p className="text-sm text-muted-foreground">
                    {t('common.showingPage', 'Showing page {page} of {totalPages} for {total} records', { page: assignments.page, totalPages: assignments.totalPages, total: assignments.total })}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={assignPage <= 1}
                      onClick={() => setAssignPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      {t('common.previous', 'Previous')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={assignPage >= (assignments?.totalPages ?? 1)}
                      onClick={() => setAssignPage((p) => Math.min(assignments?.totalPages ?? 1, p + 1))}
                    >
                      {t('common.next', 'Next')}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Referrals */}
      {tab === 'referrals' && (
        <div className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader className="gap-4">
              <div className="grid gap-4 lg:grid-cols-[1fr_160px_auto] lg:items-end">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">{t('common.search', 'Search')}</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/70" />
                    <Input
                      value={referralSearch}
                      onChange={(e) => setReferralSearch(e.target.value)}
                      placeholder={t('services.referrals.searchPlaceholder', 'Search by name or organization...')}
                      className="h-12 pl-10 pr-10 text-base shadow-sm"
                    />
                    {referralSearch && (
                      <button
                        type="button"
                        onClick={() => setReferralSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-slate-100"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <FilterSelect label={t('services.referrals.table.status', 'Status')} value={referralStatusFilter} onChange={setReferralStatusFilter}>
                  <option value="">{t('common.all', 'All')}</option>
                  <option value="PENDING">{t('services.referrals.status.pending', 'Pending')}</option>
                  <option value="CONTACTED">{t('services.referrals.status.contacted', 'Contacted')}</option>
                  <option value="COMPLETED">{t('services.referrals.status.completed', 'Completed')}</option>
                  <option value="CANCELLED">{t('services.referrals.status.cancelled', 'Cancelled')}</option>
                </FilterSelect>
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="h-11" onClick={resetReferralFilters}>
                    <RotateCcw className="h-4 w-4 mr-1" />
                    {t('common.reset', 'Reset')}
                  </Button>
                  {canAssign && (
                    <Button className="h-11" onClick={openNewReferral}>
                      <Plus className="h-4 w-4 mr-1" />
                      {t('services.referrals.new', 'New Referral')}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>{t('services.referrals.table.recipient', 'Recipient')}</TableHead>
                    <TableHead>{t('services.referrals.table.organization', 'Organization')}</TableHead>
                    <TableHead>{t('services.referrals.table.reason', 'Reason')}</TableHead>
                    <TableHead>{t('services.referrals.table.date', 'Date')}</TableHead>
                    <TableHead>{t('services.referrals.table.followUp', 'Follow-up')}</TableHead>
                    <TableHead>{t('services.referrals.table.status', 'Status')}</TableHead>
                    <TableHead>{t('services.referrals.table.referredBy', 'Referred By')}</TableHead>
                    {canAssign && <TableHead className="text-right">{t('services.referrals.table.actions', 'Actions')}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referralsLoading ? (
                    [...Array(6)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={canAssign ? 8 : 7}>
                          <Skeleton className="h-8 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : referrals && referrals.data.length > 0 ? (
                    referrals.data.map((r: any) => (
                      <TableRow key={r.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {initials(r.parent?.fullName || r.child?.fullName || '??')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <Link
                                href={
                                  r.parent
                                    ? `/dashboard/parents/${r.parent.id}`
                                    : r.child
                                    ? `/dashboard/children/${r.child.id}`
                                    : '#'
                                }
                                className="font-medium text-sm hover:text-primary truncate max-w-[140px]"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {r.parent?.fullName || r.child?.fullName || t('common.unknown', 'Unknown')}
                              </Link>
                              <Badge
                                variant="outline"
                                className={cn(
                                  'w-fit text-[10px] mt-0.5',
                                  r.parent
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                )}
                              >
                                {r.parent
                                  ? t('services.assign.parent', 'Parent')
                                  : t('services.assign.child', 'Child')}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{r.referredTo}</span>
                            <span className="text-xs text-muted-foreground line-clamp-1 max-w-[160px]">{r.referralReason}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground line-clamp-2 max-w-[180px]">
                            {r.referralReason}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(r.referralDate), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {r.followUpDate ? format(new Date(r.followUpDate), 'MMM dd, yyyy') : '—'}
                        </TableCell>
                        <TableCell>
                          <ReferralStatusBadge status={r.status} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.staff?.fullName || '—'}
                        </TableCell>
                        {canAssign && (
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => openEditReferral(r)}
                                title={t('services.referrals.edit', 'Edit')}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => setDeletingReferral(r)}
                                title={t('services.referrals.delete', 'Delete Referral')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={canAssign ? 8 : 7} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <div className="rounded-full bg-slate-50 p-4">
                            <ExternalLink className="h-10 w-10 text-muted-foreground/50" />
                          </div>
                          <p className="text-lg font-semibold">{t('services.referrals.table.noReferrals', 'No referrals yet')}</p>
                          <p className="max-w-xs text-sm text-muted-foreground">
                            {t('services.referrals.table.noReferralsDesc', 'Create a referral to track when a client is referred to an external organization.')}
                          </p>
                          {canAssign && (
                            <Button onClick={openNewReferral}>
                              <Plus className="h-4 w-4 mr-1" />
                              {t('services.referrals.new', 'New Referral')}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {referrals && referrals.totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-6 py-4">
                  <p className="text-sm text-muted-foreground">
                    {t('common.showingPage', 'Showing page {page} of {totalPages}', { page: referrals.page, totalPages: referrals.totalPages })}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={referralPage <= 1}
                      onClick={() => setReferralPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      {t('common.previous', 'Previous')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={referralPage >= (referrals?.totalPages ?? 1)}
                      onClick={() => setReferralPage((p) => Math.min(referrals?.totalPages ?? 1, p + 1))}
                    >
                      {t('common.next', 'Next')}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Drawers */}
      <ServiceDrawer
        open={serviceDrawerOpen}
        service={editingService}
        onClose={() => {
          setServiceDrawerOpen(false);
          setEditingService(null);
        }}
        onSaved={() => {
          setServiceDrawerOpen(false);
          setEditingService(null);
          fetchServices();
        }}
      />

      <AssignServiceDrawer
        open={assignDrawerOpen}
        onClose={() => setAssignDrawerOpen(false)}
        onSaved={() => {
          setAssignDrawerOpen(false);
          fetchAssignments();
        }}
        userRole={userRole}
      />

      <ReferralDrawer
        open={referralDrawerOpen}
        referral={editingReferral}
        onClose={() => {
          setReferralDrawerOpen(false);
          setEditingReferral(null);
        }}
        onSaved={() => {
          setReferralDrawerOpen(false);
          setEditingReferral(null);
          fetchReferrals();
        }}
        userRole={userRole}
      />

      <EditAssignmentDrawer
        open={editDrawerOpen}
        assignment={editingAssignment}
        staffList={staffList}
        onClose={() => {
          setEditDrawerOpen(false);
          setEditingAssignment(null);
        }}
        onSaved={() => {
          setEditDrawerOpen(false);
          setEditingAssignment(null);
          fetchAssignments();
        }}
      />

      <AssignmentDetailPanel
        open={detailPanelOpen}
        assignment={selectedAssignment}
        readOnly={detailReadOnly}
        onClose={() => {
          setDetailPanelOpen(false);
          setSelectedAssignment(null);
        }}
        onEdit={() => {
          if (selectedAssignment) {
            const current = selectedAssignment;
            setDetailPanelOpen(false);
            setSelectedAssignment(null);
            openEditAssignment(current);
          }
        }}
        onMarkComplete={() => {
          if (selectedAssignment) handleStatusChange(selectedAssignment.id, 'COMPLETED');
        }}
        onMarkCancelled={() => {
          if (selectedAssignment) {
            setCancellingAssignment(selectedAssignment);
            setDetailPanelOpen(false);
            setSelectedAssignment(null);
          }
        }}
        userRole={userRole}
      />

      {/* Deactivate Service Confirmation Modal */}
      {deactivatingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDeactivatingService(null)}>
          <div className="w-full max-w-md rounded-lg border bg-white dark:bg-neutral-900 dark:border-neutral-700 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{t('services.catalog.confirmDeactivateTitle', 'Deactivate Service?')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('services.catalog.confirmDeactivateDesc', 'Are you sure you want to deactivate "{name}"? Existing assignments will remain, but the service will no longer be available for new assignments.', { name: deactivatingService.name })}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeactivatingService(null)}>{t('common.cancel', 'Cancel')}</Button>
              <Button variant="destructive" onClick={() => void handleConfirmDeactivate(deactivatingService)}>{t('services.catalog.confirmDeactivate', 'Deactivate')}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Assignment Confirmation Modal */}
      {cancellingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setCancellingAssignment(null)}>
          <div className="w-full max-w-md rounded-lg border bg-white dark:bg-neutral-900 dark:border-neutral-700 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{t('services.detail.confirmCancelTitle', 'Cancel Assignment?')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('services.detail.confirmCancelDesc', 'Are you sure you want to cancel the assignment for "{name}"?', { name: cancellingAssignment.service?.name || t('common.unknown', 'Unknown') })}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCancellingAssignment(null)}>{t('common.cancel', 'Cancel')}</Button>
              <Button variant="destructive" onClick={() => void handleConfirmCancelled()}>{t('services.detail.confirmCancel', 'Cancel Assignment')}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Reactivate Completed Assignment Confirmation Modal */}
      {reactivatingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setReactivatingAssignment(null)}>
          <div className="w-full max-w-md rounded-lg border bg-white dark:bg-neutral-900 dark:border-neutral-700 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{t('services.detail.confirmReactivateTitle', 'Reactivate Completed Service?')}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('services.detail.confirmReactivateDesc', 'This service assignment for "{name}" is currently marked as Completed. Are you sure you want to reactivate it back to Active status?', { name: reactivatingAssignment.service?.name || t('common.unknown', 'Unknown') })}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReactivatingAssignment(null)}>{t('common.cancel', 'Cancel')}</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => void handleConfirmReactivate()}>{t('services.detail.confirmReactivate', 'Reactivate (Mark Active)')}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Referral Confirmation Modal */}
      {deletingReferral && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDeletingReferral(null)}>
          <div className="w-full max-w-md rounded-lg border bg-white dark:bg-neutral-900 dark:border-neutral-700 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{t('services.referrals.confirmDeleteTitle', 'Delete Referral?')}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('services.referrals.confirmDeleteDesc', 'Are you sure you want to delete the referral to "{organization}" for "{name}"? This action cannot be undone.', {
                    organization: deletingReferral.referredTo,
                    name: deletingReferral.parent?.fullName || deletingReferral.child?.fullName || t('common.unknown', 'Unknown'),
                  })}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeletingReferral(null)}>{t('common.cancel', 'Cancel')}</Button>
              <Button variant="destructive" onClick={() => void handleConfirmDeleteReferral()}>{t('services.referrals.confirmDeleteAction', 'Delete Referral')}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReferralStatusBadge({ status }: { status: string }) {
  const { t } = useLocale();
  const config: Record<string, { className: string; label: string }> = {
    PENDING: {
      className: 'bg-amber-50 text-amber-700 border-amber-200',
      label: t('services.referrals.status.pending', 'Pending'),
    },
    CONTACTED: {
      className: 'bg-blue-50 text-blue-700 border-blue-200',
      label: t('services.referrals.status.contacted', 'Contacted'),
    },
    COMPLETED: {
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      label: t('services.referrals.status.completed', 'Completed'),
    },
    CANCELLED: {
      className: 'bg-red-50 text-red-700 border-red-200',
      label: t('services.referrals.status.cancelled', 'Cancelled'),
    },
  };
  const c = config[status] || config.PENDING;
  return (
    <Badge variant="outline" className={c.className}>
      {c.label}
    </Badge>
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
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
        {label}
      </span>
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

function initials(value: string) {
  return value
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
