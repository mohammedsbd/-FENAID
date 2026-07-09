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
  Pencil,
  Eye,
  AlertCircle,
  ExternalLink,
  Trash2,
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

  // Assignment drawer / detail
  const [assignDrawerOpen, setAssignDrawerOpen] = useState(false);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<ServiceAssignmentDto | null>(null);

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

  async function handleDeleteReferral(id: string) {
    if (!confirm(t('services.referrals.confirmDelete', 'Delete this referral?'))) return;
    try {
      await deleteReferral(id);
      toast({
        title: t('services.referrals.deleted', 'Referral Deleted'),
        description: t('services.referrals.deletedDesc', 'The referral has been removed.'),
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

  async function handleToggleActive(service: ServiceDto) {
    try {
      const targetActive = !service.isActive;
      if (!targetActive) {
        // Soft-deactivate
        await deleteService(service.id);
        toast({
          title: t('services.catalog.deactivated', 'Service Deactivated'),
          description: t('services.catalog.deactivatedDesc', '"{name}" has been deactivated.', { name: service.name }),
        });
      } else {
        // Reactivate
        const { updateService } = await import('@/lib/services-api');
        await updateService(service.id, { isActive: true });
        toast({
          title: t('services.catalog.activated', 'Service Activated'),
          description: t('services.catalog.activatedDesc', '"{name}" has been activated.', { name: service.name }),
        });
      }
      fetchServices();
    } catch (err: any) {
      const msg = err?.response?.data?.message || t('services.error.update', 'Failed to update service');
      toast({ title: t('common.error', 'Error'), description: msg, variant: 'destructive' });
    }
  }

  function openAssignDrawer() {
    setAssignDrawerOpen(true);
  }

  function openDetailPanel(assignment: ServiceAssignmentDto) {
    setSelectedAssignment(assignment);
    setDetailPanelOpen(true);
  }

  async function handleStatusChange(id: string, status: 'COMPLETED' | 'CANCELLED') {
    try {
      await updateAssignment(id, { status });
      toast({
        title: status === 'COMPLETED' ? t('services.toast.markedComplete', 'Marked as Completed') : t('services.toast.markedCancelled', 'Marked as Cancelled'),
        description: t('services.toast.statusUpdated', 'The assignment status has been updated.'),
      });
      fetchAssignments();
      setDetailPanelOpen(false);
      setSelectedAssignment(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message || t('services.error.update', 'Failed to update status');
      toast({ title: t('common.error', 'Error'), description: msg, variant: 'destructive' });
    }
  }

  const serviceCategories = useMemo(() => {
    return [...new Set(services.map((s) => s.category))];
  }, [services]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('Services', 'Services')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('services.subtitle', 'Manage service catalog and assignments')}
          </p>
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
          {assignments && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
              {assignments.total}
            </Badge>
          )}
        </button>
        <button
          onClick={() => setTab('referrals')}
          className={cn(
            'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition whitespace-nowrap',
            tab === 'referrals' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <ExternalLink className="h-4 w-4" />
          {t('services.tab.referrals', 'Referrals')}
          {referrals && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
              {referrals.total}
            </Badge>
          )}
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
                        <TableCell colSpan={10}>
                          <Skeleton className="h-8 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : assignments && assignments.data.length > 0 ? (
                    assignments.data.map((a) => (
                      <TableRow
                        key={a.id}
                        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors"
                        onClick={() => openDetailPanel(a)}
                      >
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
                              'text-[10px]',
                              a.targetType === 'PARENT'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            )}
                          >
                            {a.targetType === 'PARENT' ? t('services.assign.parent', 'Parent') : t('services.assign.child', 'Child')}
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
                          <div className="flex justify-end gap-1">
                            {canAssign && a.status === 'ACTIVE' && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-emerald-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(a.id, 'COMPLETED');
                                }}
                                title={t('services.detail.markComplete', 'Mark as Completed')}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            )}
                            {canAssign && (a.status === 'PENDING' || a.status === 'ACTIVE') && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-red-500"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(a.id, 'CANCELLED');
                                }}
                                title={t('services.detail.markCancelled', 'Mark as Cancelled')}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDetailPanel(a);
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
                      <TableCell colSpan={10} className="h-64 text-center">
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
                              {userRole === 'SUPER_ADMIN' && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-red-500"
                                  onClick={() => handleDeleteReferral(r.id)}
                                  title={t('services.referrals.delete', 'Delete')}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
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

      <AssignmentDetailPanel
        open={detailPanelOpen}
        assignment={selectedAssignment}
        onClose={() => {
          setDetailPanelOpen(false);
          setSelectedAssignment(null);
        }}
        onEdit={() => {
          setDetailPanelOpen(false);
          setSelectedAssignment(null);
        }}
        onMarkComplete={() => {
          if (selectedAssignment) handleStatusChange(selectedAssignment.id, 'COMPLETED');
        }}
        onMarkCancelled={() => {
          if (selectedAssignment) handleStatusChange(selectedAssignment.id, 'CANCELLED');
        }}
        userRole={userRole}
      />
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
