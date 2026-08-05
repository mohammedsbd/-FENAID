'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  HeartHandshake,
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  RotateCcw,
  Calendar,
  Phone,
  Mail,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  UserMinus,
  UserPlus,
  Power,
  Building2,
  MapPin,
  User,
  Eye,
} from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DeactivateConfirmationModal } from '@/components/dashboard/deactivate-confirmation-modal';
import { PermanentDeleteModal } from '@/components/dashboard/permanent-delete-modal';
import { ExportButton } from '@/components/dashboard/export-button';
import { exportToCSV, exportToExcelHTML, exportToWordHTML, exportToPDF, escapeHTML, formatEnum } from '@/lib/export';

interface VolunteerServiceRow {
  id: string;
  serviceType: string;
  description?: string;
  serviceDate: string;
  notes?: string;
  child?: {
    id: string;
    fullName: string;
  };
  parent?: {
    id: string;
    fullName: string;
  };
}

interface Volunteer {
  id: string;
  isOrganization?: boolean;
  organizationName?: string;
  organizationLocation?: string;
  organizationPhone?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  status: string;
  serviceTypes?: string;
  notes?: string;
  createdAt: string;
  services: VolunteerServiceRow[];
}

interface RecipientOption {
  id: string;
  fullName: string;
}

type RecipientType = 'GENERAL' | 'CHILD' | 'PARENT';

export default function VolunteersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLocale();

  // List and search state
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Export state
  const [exporting, setExporting] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Volunteer Drawer (Add/Edit)
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingVolunteer, setEditingVolunteer] = useState<Volunteer | null>(null);
  const [vForm, setVForm] = useState({
    isOrganization: false,
    organizationName: '',
    organizationLocation: '',
    organizationPhone: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    serviceTypes: '',
    notes: '',
    status: 'ACTIVE',
  });
  const [vSaving, setVSaving] = useState(false);

  // Service Log Drawer
  const [serviceDrawerOpen, setServiceDrawerOpen] = useState(false);
  const [activeVolunteer, setActiveVolunteer] = useState<Volunteer | null>(null);
  const [children, setChildren] = useState<RecipientOption[]>([]);
  const [parents, setParents] = useState<RecipientOption[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [sForm, setSForm] = useState({
    serviceType: '',
    recipientType: 'GENERAL' as RecipientType,
    childId: '',
    parentId: '',
    description: '',
    serviceDate: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [sSaving, setSSaving] = useState(false);

  // History Dialog state
  const [historyVolunteer, setHistoryVolunteer] = useState<Volunteer | null>(null);

  // Status + delete confirmation state
  const [deactivatingVolunteer, setDeactivatingVolunteer] = useState<Volunteer | null>(null);
  const [deletingVolunteer, setDeletingVolunteer] = useState<Volunteer | null>(null);
  const [deletingInFlight, setDeletingInFlight] = useState(false);
  const [deletingServiceRecord, setDeletingServiceRecord] = useState<{ id: string; name: string } | null>(null);
  // Erasing a record is restricted to super admins on the server too.
  const canPermanentlyDelete = getSession()?.role === 'SUPER_ADMIN';

  // Drawer animation state
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [serviceDrawerVisible, setServiceDrawerVisible] = useState(false);
  const [serviceDrawerMounted, setServiceDrawerMounted] = useState(false);

  // Handle search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch volunteers list
  const fetchVolunteers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/volunteers', {
        params: {
          search: debouncedSearch || undefined,
          status: statusFilter || undefined,
          type: typeFilter || undefined,
          page,
          limit,
        },
      });
      const totalCount = res.data?.meta?.total || 0;
      const totalPages = res.data?.meta?.pages || 1;

      setVolunteers(res.data?.data || []);
      setTotal(totalCount);
      setPages(totalPages);

      // The last row of a page can disappear (deletion, search) — step back.
      if (page > totalPages && totalPages > 0) {
        setPage(totalPages);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t('volunteers.errorLoad', 'Failed to load volunteers.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVolunteers();
  }, [debouncedSearch, statusFilter, typeFilter, page, limit]);

  // The parents endpoint caps page size at 100, so walk the pages (up to the
  // same 1000 ceiling the children dropdown uses) to fill the dropdown.
  const fetchAllParents = async (): Promise<RecipientOption[]> => {
    const pageSize = 100;
    const maxPages = 10;

    const first = await api.get('/parents', { params: { limit: pageSize, page: 1 } });
    const collected: RecipientOption[] = first.data?.data || [];
    const pageCount = Math.min(first.data?.meta?.pages || 1, maxPages);

    if (pageCount > 1) {
      const rest = await Promise.all(
        Array.from({ length: pageCount - 1 }, (_, i) =>
          api.get('/parents', { params: { limit: pageSize, page: i + 2 } }),
        ),
      );
      rest.forEach((res) => collected.push(...(res.data?.data || [])));
    }

    return collected;
  };

  // Fetch children and parents for the service recipient dropdowns
  const fetchRecipients = async () => {
    setRecipientsLoading(true);
    try {
      const [childrenRes, allParents] = await Promise.all([
        api.get('/children', { params: { limit: 1000 } }),
        fetchAllParents(),
      ]);
      setChildren(childrenRes.data?.data || []);
      setParents(allParents);
    } catch {
      toast({
        title: t('common.error', 'Error'),
        description: t('volunteers.toast.errorLoadRecipients', 'Failed to load children and parents list for dropdown'),
        variant: 'destructive',
      });
    } finally {
      setRecipientsLoading(false);
    }
  };

  useEffect(() => {
    if (serviceDrawerOpen) {
      fetchRecipients();
    }
  }, [serviceDrawerOpen]);

  // Export Volunteers
  const handleExport = async (formatType: 'pdf' | 'csv' | 'excel' | 'docx') => {
    setExporting(true);
    try {
      const res = await api.get('/volunteers', {
        params: {
          limit: 100000,
          search: debouncedSearch || undefined,
          status: statusFilter || undefined,
          type: typeFilter || undefined,
        },
      });
      const data: Volunteer[] = res.data?.data || [];
      const filename = `volunteers-export-${new Date().toISOString().split('T')[0]}`;
      const title = t('volunteers.export.directory', 'Volunteers Directory');

      if (formatType === 'csv') {
        const headers = [
          t('volunteers.export.csv.name', 'Volunteer / Organization Name'),
          t('volunteers.export.csv.type', 'Type'),
          t('volunteers.export.csv.email', 'Email'),
          t('volunteers.export.csv.phone', 'Phone'),
          t('volunteers.export.csv.location', 'Location'),
          t('volunteers.export.csv.status', 'Status'),
          t('volunteers.export.csv.servicesCount', 'Services Logged'),
          t('volunteers.export.csv.serviceTypes', 'Service Types'),
          t('volunteers.export.csv.registeredDate', 'Registered Date'),
        ];
        const rows = data.map((v) => {
          const displayName = v.isOrganization && v.organizationName
            ? v.organizationName
            : [v.firstName, v.lastName].filter(Boolean).join(' ') || '---';
          const typeStr = v.isOrganization ? t('volunteers.type.organization', 'Organization') : t('volunteers.type.individual', 'Individual');
          const phoneStr = v.phone || v.organizationPhone || '---';
          const locationStr = v.organizationLocation || '---';

          return [
            displayName,
            typeStr,
            v.email || '',
            phoneStr,
            locationStr,
            v.status || '',
            String(v.services?.length || 0),
            v.serviceTypes || '',
            v.createdAt ? new Date(v.createdAt).toLocaleDateString() : '',
          ];
        });
        exportToCSV(headers, rows, `${filename}.csv`);
      } else if (formatType === 'excel') {
        const headers = [
          t('volunteers.export.csv.name', 'Volunteer / Organization Name'),
          t('volunteers.export.csv.type', 'Type'),
          t('volunteers.export.csv.email', 'Email'),
          t('volunteers.export.csv.phone', 'Phone'),
          t('volunteers.export.csv.location', 'Location'),
          t('volunteers.export.csv.status', 'Status'),
          t('volunteers.export.csv.servicesCount', 'Services Logged'),
          t('volunteers.export.csv.serviceTypes', 'Service Types'),
          t('volunteers.export.csv.registeredDate', 'Registered Date'),
        ];
        const rows = data.map((v) => {
          const displayName = v.isOrganization && v.organizationName
            ? v.organizationName
            : [v.firstName, v.lastName].filter(Boolean).join(' ') || '---';
          const typeStr = v.isOrganization ? t('volunteers.type.organization', 'Organization') : t('volunteers.type.individual', 'Individual');
          const phoneStr = v.phone || v.organizationPhone || '---';
          const locationStr = v.organizationLocation || '---';

          return [
            displayName,
            typeStr,
            v.email || '',
            phoneStr,
            locationStr,
            v.status || '',
            String(v.services?.length || 0),
            v.serviceTypes || '',
            v.createdAt ? new Date(v.createdAt).toLocaleDateString() : '',
          ];
        });
        exportToExcelHTML(title, headers, rows, `${filename}.xls`);
      } else if (formatType === 'docx') {
        let tableRowsHTML = '';
        data.forEach((v) => {
          const displayName = v.isOrganization && v.organizationName
            ? v.organizationName
            : [v.firstName, v.lastName].filter(Boolean).join(' ') || '---';
          const typeStr = v.isOrganization ? t('volunteers.type.organization', 'Organization') : t('volunteers.type.individual', 'Individual');
          const phoneStr = v.phone || v.organizationPhone || '---';
          const locationStr = v.organizationLocation || '---';

          tableRowsHTML += `
            <tr>
              <td><b>${escapeHTML(displayName)}</b></td>
              <td>${escapeHTML(typeStr)}</td>
              <td>${escapeHTML(v.email || '')}</td>
              <td>${escapeHTML(phoneStr)}</td>
              <td>${escapeHTML(locationStr)}</td>
              <td><span class="badge">${escapeHTML(formatEnum(v.status))}</span></td>
              <td>${v.services?.length || 0}</td>
              <td>${escapeHTML(v.serviceTypes || '')}</td>
            </tr>
          `;
        });
        const contentHTML = `
          <h2>${escapeHTML(title)}</h2>
          <p>${t('volunteers.export.totalRecords', 'Total Records')}: ${data.length}</p>
          <table>
            <thead>
              <tr>
                <th>${t('volunteers.export.csv.name', 'Volunteer / Organization Name')}</th>
                <th>${t('volunteers.export.csv.type', 'Type')}</th>
                <th>${t('volunteers.export.csv.email', 'Email')}</th>
                <th>${t('volunteers.export.csv.phone', 'Phone')}</th>
                <th>${t('volunteers.export.csv.location', 'Location')}</th>
                <th>${t('volunteers.export.csv.status', 'Status')}</th>
                <th>${t('volunteers.export.csv.servicesCount', 'Services Logged')}</th>
                <th>${t('volunteers.export.csv.serviceTypes', 'Service Types')}</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHTML}
            </tbody>
          </table>
        `;
        exportToWordHTML(title, contentHTML, `${filename}.doc`);
      } else if (formatType === 'pdf') {
        let tableRowsHTML = '';
        data.forEach((v) => {
          const displayName = v.isOrganization && v.organizationName
            ? v.organizationName
            : [v.firstName, v.lastName].filter(Boolean).join(' ') || '---';
          const typeStr = v.isOrganization ? t('volunteers.type.organization', 'Organization') : t('volunteers.type.individual', 'Individual');
          const phoneStr = v.phone || v.organizationPhone || '---';
          const locationStr = v.organizationLocation || '---';
          const statusClass = v.status === 'ACTIVE' ? 'badge-active' : 'badge-inactive';

          tableRowsHTML += `
            <tr>
              <td><b>${escapeHTML(displayName)}</b></td>
              <td><span class="badge">${escapeHTML(typeStr)}</span></td>
              <td>${escapeHTML(v.email || '')}</td>
              <td>${escapeHTML(phoneStr)}</td>
              <td>${escapeHTML(locationStr)}</td>
              <td><span class="badge ${statusClass}">${escapeHTML(formatEnum(v.status))}</span></td>
              <td>${v.services?.length || 0}</td>
              <td>${escapeHTML(v.serviceTypes || '')}</td>
            </tr>
          `;
        });
        const htmlBody = `
          <div style="margin-bottom: 20px; font-size: 13px; color: #475569;">
            ${t('volunteers.export.matchingRecords', 'Total volunteer records matching filters')}: <b>${data.length}</b>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 22%">${t('volunteers.export.csv.name', 'Volunteer / Organization Name')}</th>
                <th style="width: 10%">${t('volunteers.export.csv.type', 'Type')}</th>
                <th style="width: 15%">${t('volunteers.export.csv.email', 'Email')}</th>
                <th style="width: 13%">${t('volunteers.export.csv.phone', 'Phone')}</th>
                <th style="width: 13%">${t('volunteers.export.csv.location', 'Location')}</th>
                <th style="width: 9%">${t('volunteers.export.csv.status', 'Status')}</th>
                <th style="width: 8%">${t('volunteers.export.csv.servicesCount', 'Services')}</th>
                <th style="width: 10%">${t('volunteers.export.csv.serviceTypes', 'Service Types')}</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHTML}
            </tbody>
          </table>
        `;
        exportToPDF(title, htmlBody);
      }
    } catch (err: any) {
      toast({
        title: t('common.error', 'Error'),
        description: err.response?.data?.message || t('volunteers.errorExport', 'Failed to export volunteers data.'),
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  // Manage Volunteer Creation/Update
  const openNewVolunteer = () => {
    setEditingVolunteer(null);
    setVForm({
      isOrganization: false,
      organizationName: '',
      organizationLocation: '',
      organizationPhone: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      serviceTypes: '',
      notes: '',
      status: 'ACTIVE',
    });
    setDrawerMounted(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setDrawerVisible(true);
      });
    });
    setDrawerOpen(true);
  };

  const openEditVolunteer = (volunteer: Volunteer) => {
    setEditingVolunteer(volunteer);
    setVForm({
      isOrganization: !!volunteer.isOrganization,
      organizationName: volunteer.organizationName || '',
      organizationLocation: volunteer.organizationLocation || '',
      organizationPhone: volunteer.organizationPhone || '',
      firstName: volunteer.firstName || '',
      lastName: volunteer.lastName || '',
      email: volunteer.email || '',
      phone: volunteer.phone || '',
      serviceTypes: volunteer.serviceTypes || '',
      notes: volunteer.notes || '',
      status: volunteer.status || 'ACTIVE',
    });
    setDrawerMounted(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setDrawerVisible(true);
      });
    });
    setDrawerOpen(true);
  };

  const handleVSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (vForm.isOrganization) {
      if (!vForm.organizationName.trim()) {
        toast({
          title: t('common.validationError', 'Validation Error'),
          description: t('volunteers.toast.orgNameRequired', 'Organization name is required'),
          variant: 'destructive',
        });
        return;
      }
    } else {
      if (!vForm.firstName.trim() || !vForm.lastName.trim() || !vForm.phone.trim()) {
        toast({
          title: t('common.validationError', 'Validation Error'),
          description: t('volunteers.toast.requiredFields', 'First name, last name, and phone are required'),
          variant: 'destructive',
        });
        return;
      }
    }

    setVSaving(true);
    const payload = {
      ...vForm,
      email: vForm.email?.trim() || undefined,
      phone: vForm.phone?.trim() || undefined,
      organizationName: vForm.isOrganization ? (vForm.organizationName?.trim() || undefined) : undefined,
      organizationLocation: vForm.isOrganization ? (vForm.organizationLocation?.trim() || undefined) : undefined,
      organizationPhone: vForm.isOrganization ? (vForm.organizationPhone?.trim() || undefined) : undefined,
      firstName: vForm.firstName?.trim() || undefined,
      lastName: vForm.lastName?.trim() || undefined,
      serviceTypes: vForm.serviceTypes?.trim() || undefined,
      notes: vForm.notes?.trim() || undefined,
    };

    try {
      if (editingVolunteer) {
        await api.patch(`/volunteers/${editingVolunteer.id}`, payload);
        toast({
          title: t('common.success', 'Success'),
          description: t('volunteers.toast.updated', 'Volunteer details updated successfully'),
        });
      } else {
        await api.post('/volunteers', payload);
        toast({
          title: t('common.success', 'Success'),
          description: t('volunteers.toast.registered', 'Volunteer registered successfully'),
        });
      }
      setDrawerVisible(false);
      setTimeout(() => { setDrawerMounted(false); setDrawerOpen(false); }, 300);
      fetchVolunteers();
    } catch (err: any) {
      toast({
        title: t('common.error', 'Error'),
        description: err.response?.data?.message || t('volunteers.toast.saveFailed', 'Failed to save volunteer details'),
        variant: 'destructive',
      });
    } finally {
      setVSaving(false);
    }
  };

  function closeDrawer() {
    setDrawerVisible(false);
    setTimeout(() => { setDrawerMounted(false); setDrawerOpen(false); }, 300);
  }

  // Manage Service logs
  const openServiceLog = (volunteer: Volunteer) => {
    setActiveVolunteer(volunteer);
    setSForm({
      serviceType: '',
      recipientType: 'GENERAL',
      childId: '',
      parentId: '',
      description: '',
      serviceDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setServiceDrawerMounted(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setServiceDrawerVisible(true);
      });
    });
    setServiceDrawerOpen(true);
  };

  function closeServiceDrawer() {
    setServiceDrawerVisible(false);
    setTimeout(() => { setServiceDrawerMounted(false); setServiceDrawerOpen(false); }, 300);
  }

  const handleSSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sForm.serviceType || !sForm.serviceDate) {
      toast({
        title: t('common.validationError', 'Validation Error'),
        description: t('volunteers.toast.serviceRequired', 'Service type and date are required'),
        variant: 'destructive',
      });
      return;
    }

    if (sForm.recipientType === 'CHILD' && !sForm.childId) {
      toast({
        title: t('common.validationError', 'Validation Error'),
        description: t('volunteers.toast.childRequired', 'Please select the child who received the service'),
        variant: 'destructive',
      });
      return;
    }

    if (sForm.recipientType === 'PARENT' && !sForm.parentId) {
      toast({
        title: t('common.validationError', 'Validation Error'),
        description: t('volunteers.toast.parentRequired', 'Please select the parent who received the service'),
        variant: 'destructive',
      });
      return;
    }

    setSSaving(true);
    try {
      await api.post(`/volunteers/${activeVolunteer?.id}/services`, {
        serviceType: sForm.serviceType,
        childId: sForm.recipientType === 'CHILD' ? sForm.childId : undefined,
        parentId: sForm.recipientType === 'PARENT' ? sForm.parentId : undefined,
        description: sForm.description,
        serviceDate: sForm.serviceDate,
        notes: sForm.notes,
      });
      const activeName = activeVolunteer?.isOrganization && activeVolunteer?.organizationName
        ? activeVolunteer.organizationName
        : `${activeVolunteer?.firstName || ''} ${activeVolunteer?.lastName || ''}`.trim();
      toast({
        title: t('common.success', 'Success'),
        description: t('volunteers.toast.serviceSaved', 'Service log added for {name}').replace('{name}', activeName || 'Volunteer'),
      });
      setServiceDrawerVisible(false);
      setTimeout(() => { setServiceDrawerMounted(false); setServiceDrawerOpen(false); }, 300);
      fetchVolunteers();
    } catch (err: any) {
      toast({
        title: t('common.error', 'Error'),
        description: err.response?.data?.message || t('volunteers.toast.serviceSaveFailed', 'Failed to save service log'),
        variant: 'destructive',
      });
    } finally {
      setSSaving(false);
    }
  };

  // Take a volunteer out of use without losing their record
  const handleToggleStatus = async () => {
    if (!deactivatingVolunteer) return;
    const isActivating = deactivatingVolunteer.status === 'INACTIVE';
    const name = deactivatingVolunteer.isOrganization && deactivatingVolunteer.organizationName
      ? deactivatingVolunteer.organizationName
      : `${deactivatingVolunteer.firstName || ''} ${deactivatingVolunteer.lastName || ''}`.trim();
    try {
      await api.patch(`/volunteers/${deactivatingVolunteer.id}`, {
        status: isActivating ? 'ACTIVE' : 'INACTIVE',
      });
      setDeactivatingVolunteer(null);
      toast({
        title: isActivating
          ? t('volunteers.toast.activated', 'Volunteer Activated')
          : t('volunteers.toast.deactivated', 'Volunteer Deactivated'),
        description: t('volunteers.toast.statusDescription', '{name} is now {status}.', {
          name,
          status: isActivating
            ? t('volunteers.form.active', 'ACTIVE')
            : t('volunteers.form.inactive', 'INACTIVE'),
        }),
      });
      fetchVolunteers();
    } catch (err: any) {
      toast({
        title: t('common.error', 'Error'),
        description: err.response?.data?.message || t('volunteers.toast.statusFailed', 'Failed to update volunteer status'),
        variant: 'destructive',
      });
    }
  };

  // Erase the volunteer and every service they logged
  const handleDeleteVolunteer = async () => {
    if (!deletingVolunteer) return;
    const name = deletingVolunteer.isOrganization && deletingVolunteer.organizationName
      ? deletingVolunteer.organizationName
      : `${deletingVolunteer.firstName || ''} ${deletingVolunteer.lastName || ''}`.trim();
    setDeletingInFlight(true);
    try {
      await api.delete(`/volunteers/${deletingVolunteer.id}/permanent`);
      setDeletingVolunteer(null);
      toast({
        title: t('common.success', 'Success'),
        description: t('volunteers.toast.deletedPermanently', '{name} and their service records have been permanently removed.', { name }),
      });
      fetchVolunteers();
    } catch (err: any) {
      toast({
        title: t('common.error', 'Error'),
        description: err.response?.data?.message || t('volunteers.toast.deleteFailed', 'Failed to remove volunteer'),
        variant: 'destructive',
      });
    } finally {
      setDeletingInFlight(false);
    }
  };

  // Delete service log
  const handleDeleteService = async (serviceId: string, volunteerName: string) => {
    setDeletingServiceRecord(null);
    try {
      await api.delete(`/volunteers/services/${serviceId}`);
      toast({
        title: t('common.success', 'Success'),
        description: t('volunteers.toast.serviceDeleted', 'Service record deleted'),
      });
      if (historyVolunteer) {
        const res = await api.get(`/volunteers/${historyVolunteer.id}`);
        setHistoryVolunteer(res.data);
      }
      fetchVolunteers();
    } catch (err: any) {
      toast({
        title: t('common.error', 'Error'),
        description: err.response?.data?.message || t('volunteers.toast.serviceDeleteFailed', 'Failed to delete service record'),
        variant: 'destructive',
      });
    }
  };

  const initials = (firstName: string, lastName: string) => {
    return (firstName[0] + lastName[0]).toUpperCase();
  };

  const getPageNumbers = () => {
    const items: (number | string)[] = [];
    if (pages <= 7) {
      for (let i = 1; i <= pages; i++) items.push(i);
    } else {
      items.push(1);
      if (page > 3) items.push('...');
      const start = Math.max(2, page - 1);
      const end = Math.min(pages - 1, page + 1);
      for (let i = start; i <= end; i++) items.push(i);
      if (page < pages - 2) items.push('...');
      items.push(pages);
    }
    return items;
  };

  const startRecord = total > 0 ? (page - 1) * limit + 1 : 0;
  const endRecord = Math.min(page * limit, total);

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <HeartHandshake className="h-8 w-8 text-primary" />
            {t('volunteers.title', 'Volunteers')}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {t('volunteers.subtitle', 'Manage volunteer registrations and log the support they provide.')}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center w-full sm:w-auto">
          <ExportButton onExport={handleExport} loading={exporting} />
          <Button
            onClick={openNewVolunteer}
            className="h-11 gap-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 shadow-sm transition-all duration-150 active:scale-95 shrink-0 w-full sm:w-auto"
          >
            <Plus className="h-5 w-5" />
            {t('volunteers.registerBtn', 'Register Volunteer')}
          </Button>
        </div>
      </div>

      {/* Main card with table */}
      <Card className="border border-border bg-card shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-border bg-muted/30 py-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(250px,1fr)_160px_200px_auto] lg:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="vol-search" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('volunteers.searchLabel', 'Search Volunteers')}
              </Label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  id="vol-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('volunteers.searchPlaceholder', 'Search by name, service types, contact...')}
                  className="h-11 pl-11 pr-10 text-sm shadow-inner bg-background border-border focus-visible:ring-primary rounded-xl"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-accent transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vol-status-filter" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('volunteers.filter.status', 'Status')}
              </Label>
              <select
                id="vol-status-filter"
                value={statusFilter}
                onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }}
                className="flex h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">{t('volunteers.filter.statusAll', 'All Statuses')}</option>
                <option value="ACTIVE">{t('volunteers.form.active', 'ACTIVE')}</option>
                <option value="INACTIVE">{t('volunteers.form.inactive', 'INACTIVE')}</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vol-type-filter" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('volunteers.filter.type', 'Volunteer Type')}
              </Label>
              <select
                id="vol-type-filter"
                value={typeFilter}
                onChange={(e) => { setPage(1); setTypeFilter(e.target.value); }}
                className="flex h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">{t('volunteers.filter.typeAll', 'All Types')}</option>
                <option value="INDIVIDUAL">{t('volunteers.type.individual', 'Individual Volunteer')}</option>
                <option value="ORGANIZATION">{t('volunteers.type.organization', 'Organization / Partner')}</option>
              </select>
            </div>

            {(search || statusFilter || typeFilter) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('');
                  setTypeFilter('');
                  setPage(1);
                }}
                className="h-11 gap-1.5 border-border hover:bg-accent rounded-xl"
              >
                <RotateCcw className="h-4 w-4" />
                {t('common.reset', 'Reset')}
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {error && (
            <div className="m-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          <Table>
            <TableHeader className="bg-muted/30 border-b border-border">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-semibold text-foreground h-12 py-3 px-6">{t('volunteers.table.name', 'Volunteer')}</TableHead>
                <TableHead className="font-semibold text-foreground h-12 py-3 px-6">{t('volunteers.table.contact', 'Contact')}</TableHead>
                <TableHead className="font-semibold text-foreground h-12 py-3 px-6">{t('volunteers.table.serviceTypes', 'Service Types')}</TableHead>
                <TableHead className="font-semibold text-foreground h-12 py-3 px-6">{t('volunteers.table.status', 'Status')}</TableHead>
                <TableHead className="font-semibold text-foreground h-12 py-3 px-6">{t('volunteers.table.servicesCount', 'Services Logged')}</TableHead>
                <TableHead className="font-semibold text-foreground h-12 py-3 px-6 text-right">{t('volunteers.table.actions', 'Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i} className="border-b border-border">
                    <TableCell colSpan={6} className="py-6 px-6">
                      <div className="h-10 animate-pulse rounded-lg bg-muted" />
                    </TableCell>
                  </TableRow>
                ))
              ) : volunteers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-56 text-center px-6">
                    <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
                      <HeartHandshake className="h-12 w-12 text-muted-foreground/30" />
                      <div>
                        <p className="font-semibold text-base text-foreground">{t('volunteers.empty.title', 'No Volunteers Found')}</p>
                        <p className="text-sm text-muted-foreground mt-1">{t('volunteers.empty.desc', 'Try searching with a different term or register a new volunteer.')}</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                volunteers.map((vol) => {
                  const displayName = vol.isOrganization && vol.organizationName
                    ? vol.organizationName
                    : [vol.firstName, vol.lastName].filter(Boolean).join(' ') || 'Volunteer';
                  const contactPhone = vol.phone || vol.organizationPhone || '---';

                  return (
                    <TableRow key={vol.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <TableCell className="py-4 px-6 font-medium text-foreground">
                        <Link href={`/dashboard/volunteers/${vol.id}`} className="flex items-center gap-3 group">
                          <Avatar className={`h-10 w-10 border border-border shadow-sm transition-transform group-hover:scale-105 ${vol.isOrganization ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' : 'bg-primary/5 text-primary'}`}>
                            <AvatarFallback className="font-bold bg-transparent">
                              {vol.isOrganization ? (
                                <Building2 className="h-5 w-5" />
                              ) : (
                                initials(vol.firstName || 'V', vol.lastName || 'O')
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold text-foreground flex items-center gap-2 group-hover:text-primary transition-colors">
                              <span>{displayName}</span>
                              {vol.isOrganization && (
                                <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800 text-[10px] font-semibold py-0 px-1.5 rounded">
                                  {t('volunteers.type.organization', 'Organization')}
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {vol.isOrganization && (vol.firstName || vol.lastName) && (
                                <span className="mr-2">{t('volunteers.table.contactPerson', 'Contact')}: {[vol.firstName, vol.lastName].filter(Boolean).join(' ')} • </span>
                              )}
                              {t('volunteers.joined', 'Joined')} {new Date(vol.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                            <span>{vol.email || <span className="italic">N/A</span>}</span>
                          </div>
                          {contactPhone !== '---' && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                              <span>{contactPhone}</span>
                            </div>
                          )}
                          {vol.isOrganization && vol.organizationLocation && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                              <span>{vol.organizationLocation}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        {vol.serviceTypes ? (
                          <p className="text-sm text-muted-foreground max-w-xs truncate" title={vol.serviceTypes}>
                            {vol.serviceTypes}
                          </p>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">{t('volunteers.noneSpecified', 'None specified')}</span>
                        )}
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <Badge
                          variant={vol.status === 'ACTIVE' ? 'default' : 'secondary'}
                          className={vol.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50 rounded-full font-medium dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 dark:hover:bg-emerald-950/40'
                            : 'bg-muted text-muted-foreground border-border hover:bg-muted rounded-full font-medium'}
                        >
                          {vol.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 font-semibold rounded-lg px-2.5 py-1 dark:border-primary/30 dark:bg-primary/10">
                            {vol.services?.length || 0}
                          </Badge>
                          {(vol.services?.length || 0) > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs font-semibold hover:text-primary hover:bg-primary/5 rounded-lg px-2 gap-1"
                              onClick={() => setHistoryVolunteer(vol)}
                            >
                              {t('volunteers.viewHistory', 'View History')}
                              <ChevronRight className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-6 text-right">
                        <div className="flex justify-end items-center gap-2">
                          <Link href={`/dashboard/volunteers/${vol.id}`}>
                            <Button
                              title={t('volunteers.viewProfile', 'View Profile')}
                              size="icon"
                              variant="ghost"
                              className="h-9 w-9 text-slate-600 hover:text-slate-700 hover:bg-slate-100 rounded-lg dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-slate-800"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            title={t('volunteers.logService', 'Log Service')}
                            size="icon"
                            variant="ghost"
                            onClick={() => openServiceLog(vol)}
                            className="h-9 w-9 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-950/30"
                          >
                            <HeartHandshake className="h-4 w-4" />
                          </Button>
                          <Button
                            title={t('volunteers.editDetails', 'Edit Details')}
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditVolunteer(vol)}
                            className="h-9 w-9 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-950/30"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            title={vol.status === 'INACTIVE' ? t('volunteers.activateVolunteer', 'Activate Volunteer') : t('volunteers.deactivateVolunteer', 'Deactivate Volunteer')}
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeactivatingVolunteer(vol)}
                            className={`h-9 w-9 rounded-lg ${
                              vol.status === 'ACTIVE'
                                ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300'
                            }`}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                          <Button
                            title={t('volunteers.removeVolunteer', 'Remove Volunteer')}
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeletingVolunteer(vol)}
                            className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/30"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          <div className="flex flex-col gap-4 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span>
                {t('volunteers.pagination.showingRange', 'Showing {start}–{end} of {total} volunteers', {
                  start: String(startRecord),
                  end: String(endRecord),
                  total: String(total),
                })}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs">{t('volunteers.pagination.perPage', 'Per page:')}</span>
                <select
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={limit}
                  onChange={(e) => {
                    setPage(1);
                    setLimit(Number(e.target.value));
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                {t('volunteers.pagination.previous', 'Previous')}
              </Button>

              <div className="hidden sm:flex items-center gap-1">
                {getPageNumbers().map((num, i) =>
                  typeof num === 'number' ? (
                    <Button
                      key={i}
                      variant={num === page ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 w-8 p-0 text-xs"
                      onClick={() => setPage(num)}
                    >
                      {num}
                    </Button>
                  ) : (
                    <span key={i} className="px-1 text-xs text-muted-foreground">
                      ...
                    </span>
                  ),
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={page >= pages || loading}
                onClick={() => setPage((current) => Math.min(pages, current + 1))}
              >
                {t('volunteers.pagination.next', 'Next')}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Volunteer Registration & Edit Slide-over Panel */}
      {drawerMounted && (
        <div className="fixed inset-0 z-50 !mt-0">
          <div className={`fixed inset-0 bg-black/40 backdrop-blur-sm dark:bg-black/60 transition-opacity duration-300 ease-out ${
            drawerVisible ? 'opacity-100' : 'opacity-0'
          }`} onClick={closeDrawer} />
          <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
            <div className={`pointer-events-auto w-screen max-w-2xl bg-background shadow-2xl flex flex-col h-full transition-transform duration-300 ease-out ${
              drawerVisible ? 'translate-x-0' : 'translate-x-full'
            }`}>
              <div className="px-6 py-5 border-b border-border bg-muted/30 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    {editingVolunteer ? t('volunteers.drawer.editTitle', 'Edit Volunteer') : t('volunteers.drawer.registerTitle', 'Register Volunteer')}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {editingVolunteer ? t('volunteers.drawer.editSubtitle', 'Update active profile details') : t('volunteers.drawer.registerSubtitle', 'Create a new volunteer profile')}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 hover:bg-accent" onClick={closeDrawer}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="flex-1 px-6 py-4">
                <form onSubmit={handleVSave} className="space-y-5">
                  {/* Volunteer Type Selection */}
                  <div className="space-y-2 rounded-xl border border-border p-4 bg-muted/20">
                    <Label className="text-foreground font-semibold flex items-center gap-2 text-sm">
                      {t('volunteers.form.typeLabel', 'Volunteer Type')}
                    </Label>
                    <div className="flex items-center gap-6 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                        <input
                          type="radio"
                          name="volunteerType"
                          checked={!vForm.isOrganization}
                          onChange={() => setVForm({ ...vForm, isOrganization: false })}
                          className="h-4 w-4 text-primary accent-primary"
                        />
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{t('volunteers.type.individual', 'Individual Volunteer')}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                        <input
                          type="radio"
                          name="volunteerType"
                          checked={vForm.isOrganization}
                          onChange={() => setVForm({ ...vForm, isOrganization: true })}
                          className="h-4 w-4 text-primary accent-primary"
                        />
                        <Building2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        <span>{t('volunteers.type.organization', 'Organization / Partner')}</span>
                      </label>
                    </div>
                  </div>

                  {vForm.isOrganization ? (
                    <div className="space-y-4 rounded-xl border border-purple-200 dark:border-purple-900/50 p-4 bg-purple-50/30 dark:bg-purple-950/10">
                      <div className="space-y-2">
                        <Label htmlFor="v-orgName" className="text-foreground font-semibold">
                          {t('volunteers.form.organizationName', 'Organization Name')} *
                        </Label>
                        <Input
                          id="v-orgName"
                          required
                          placeholder={t('volunteers.form.orgNamePlaceholder', 'e.g. Red Cross Ethiopia')}
                          value={vForm.organizationName}
                          onChange={(e) => setVForm({ ...vForm, organizationName: e.target.value })}
                          className="rounded-xl border-border focus-visible:ring-primary h-11"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="v-orgLocation" className="text-foreground font-semibold">
                            {t('volunteers.form.organizationLocation', 'Location / Address')}
                          </Label>
                          <Input
                            id="v-orgLocation"
                            placeholder={t('volunteers.form.orgLocationPlaceholder', 'e.g. Addis Ababa, Bole')}
                            value={vForm.organizationLocation}
                            onChange={(e) => setVForm({ ...vForm, organizationLocation: e.target.value })}
                            className="rounded-xl border-border focus-visible:ring-primary h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="v-orgPhone" className="text-foreground font-semibold">
                            {t('volunteers.form.organizationPhone', 'Organization Phone')}
                          </Label>
                          <Input
                            id="v-orgPhone"
                            placeholder={t('volunteers.form.orgPhonePlaceholder', 'e.g. +251 11 000 0000')}
                            value={vForm.organizationPhone}
                            onChange={(e) => setVForm({ ...vForm, organizationPhone: e.target.value })}
                            className="rounded-xl border-border focus-visible:ring-primary h-11"
                          />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-purple-200/60 dark:border-purple-900/40">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {t('volunteers.form.contactPersonTitle', 'Contact Person Details (Optional)')}
                        </span>
                        <div className="grid grid-cols-2 gap-4 mt-2">
                          <div className="space-y-1">
                            <Label htmlFor="v-firstName" className="text-xs text-muted-foreground">{t('volunteers.form.firstName', 'First Name')}</Label>
                            <Input
                              id="v-firstName"
                              placeholder={t('volunteers.form.firstNamePlaceholder', 'e.g. Abebe')}
                              value={vForm.firstName}
                              onChange={(e) => setVForm({ ...vForm, firstName: e.target.value })}
                              className="rounded-xl border-border focus-visible:ring-primary h-10"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="v-lastName" className="text-xs text-muted-foreground">{t('volunteers.form.lastName', 'Last Name')}</Label>
                            <Input
                              id="v-lastName"
                              placeholder={t('volunteers.form.lastNamePlaceholder', 'e.g. Kebede')}
                              value={vForm.lastName}
                              onChange={(e) => setVForm({ ...vForm, lastName: e.target.value })}
                              className="rounded-xl border-border focus-visible:ring-primary h-10"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="v-firstName" className="text-foreground font-semibold">{t('volunteers.form.firstName', 'First Name')} *</Label>
                          <Input
                            id="v-firstName"
                            required
                            placeholder={t('volunteers.form.firstNamePlaceholder', 'e.g. Abebe')}
                            value={vForm.firstName}
                            onChange={(e) => setVForm({ ...vForm, firstName: e.target.value })}
                            className="rounded-xl border-border focus-visible:ring-primary h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="v-lastName" className="text-foreground font-semibold">{t('volunteers.form.lastName', 'Last Name')} *</Label>
                          <Input
                            id="v-lastName"
                            required
                            placeholder={t('volunteers.form.lastNamePlaceholder', 'e.g. Kebede')}
                            value={vForm.lastName}
                            onChange={(e) => setVForm({ ...vForm, lastName: e.target.value })}
                            className="rounded-xl border-border focus-visible:ring-primary h-11"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="v-phone" className="text-foreground font-semibold">{t('volunteers.form.phone', 'Phone Number')} *</Label>
                        <Input
                          id="v-phone"
                          required
                          placeholder={t('volunteers.form.phonePlaceholder', 'e.g. +251 911 000 000')}
                          value={vForm.phone}
                          onChange={(e) => setVForm({ ...vForm, phone: e.target.value })}
                          className="rounded-xl border-border focus-visible:ring-primary h-11"
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="v-email" className="text-foreground font-semibold">
                      {t('volunteers.form.email', 'Email Address')} ({t('common.optional', 'Optional')})
                    </Label>
                    <Input
                      id="v-email"
                      type="email"
                      required={false}
                      placeholder={t('volunteers.form.emailPlaceholder', 'e.g. contact@email.com')}
                      value={vForm.email}
                      onChange={(e) => setVForm({ ...vForm, email: e.target.value })}
                      className="rounded-xl border-border focus-visible:ring-primary h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="v-status" className="text-foreground font-semibold">{t('volunteers.form.status', 'Status')}</Label>
                    <select
                      id="v-status"
                      value={vForm.status}
                      onChange={(e) => setVForm({ ...vForm, status: e.target.value })}
                      className="flex h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="ACTIVE">{t('volunteers.form.active', 'ACTIVE')}</option>
                      <option value="INACTIVE">{t('volunteers.form.inactive', 'INACTIVE')}</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="v-serviceTypes" className="text-foreground font-semibold">{t('volunteers.form.serviceTypes', 'Service Types')}</Label>
                    <textarea
                      id="v-serviceTypes"
                      placeholder={t('volunteers.form.serviceTypesPlaceholder', 'e.g. Teaching, Health Assessment, Counseling, Home Visit, Fundraising...')}
                      rows={3}
                      value={vForm.serviceTypes}
                      onChange={(e) => setVForm({ ...vForm, serviceTypes: e.target.value })}
                      className="flex w-full rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-h-[80px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="v-notes" className="text-foreground font-semibold">{t('volunteers.form.internalNotes', 'Internal Notes')}</Label>
                    <textarea
                      id="v-notes"
                      placeholder={t('volunteers.form.internalNotesPlaceholder', 'General notes or observations about this volunteer...')}
                      rows={3}
                      value={vForm.notes}
                      onChange={(e) => setVForm({ ...vForm, notes: e.target.value })}
                      className="flex w-full rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-h-[80px]"
                    />
                  </div>

                  <div className="pt-4 flex gap-3 border-t border-border">
                    <Button
                      type="submit"
                      disabled={vSaving}
                      className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                    >
                      {vSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          {t('volunteers.form.saving', 'Saving...')}
                        </>
                      ) : (
                        t('volunteers.form.saveProfile', 'Save Profile')
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closeDrawer}
                      className="h-11 rounded-xl border-border text-foreground font-semibold px-4"
                    >
                      {t('common.cancel', 'Cancel')}
                    </Button>
                  </div>
                </form>
              </ScrollArea>
            </div>
          </div>
        </div>
      )}

      {/* Log Volunteer Service Slide-over Panel */}
      {serviceDrawerMounted && (
        <div className="fixed inset-0 z-50 !mt-0">
          <div className={`fixed inset-0 bg-black/40 backdrop-blur-sm dark:bg-black/60 transition-opacity duration-300 ease-out ${
            serviceDrawerVisible ? 'opacity-100' : 'opacity-0'
          }`} onClick={closeServiceDrawer} />
          <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
            <div className={`pointer-events-auto w-screen max-w-2xl bg-background shadow-2xl flex flex-col h-full transition-transform duration-300 ease-out ${
              serviceDrawerVisible ? 'translate-x-0' : 'translate-x-full'
            }`}>
              <div className="px-6 py-5 border-b border-border bg-muted/30 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <HeartHandshake className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    {t('volunteers.serviceDrawer.title', 'Log Service Provided')}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('volunteers.serviceDrawer.subtitle', 'Record a service activity for')} <strong className="text-foreground">{activeVolunteer?.isOrganization && activeVolunteer?.organizationName ? activeVolunteer.organizationName : `${activeVolunteer?.firstName || ''} ${activeVolunteer?.lastName || ''}`.trim()}</strong>
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 hover:bg-accent" onClick={closeServiceDrawer}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="flex-1 px-6 py-4">
                <form onSubmit={handleSSave} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="s-type" className="text-foreground font-semibold">{t('volunteers.serviceDrawer.serviceType', 'Service Type / Activity')} *</Label>
                    <Input
                      id="s-type"
                      required
                      placeholder={t('volunteers.serviceDrawer.serviceTypePlaceholder', 'e.g. Special tutoring, Health assessment, Counseling')}
                      value={sForm.serviceType}
                      onChange={(e) => setSForm({ ...sForm, serviceType: e.target.value })}
                      className="rounded-xl border-border focus-visible:ring-primary h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="s-recipient-type" className="text-foreground font-semibold">{t('volunteers.serviceDrawer.targetRecipient', 'Target Recipient')}</Label>
                    <select
                      id="s-recipient-type"
                      value={sForm.recipientType}
                      onChange={(e) => setSForm({
                        ...sForm,
                        recipientType: e.target.value as RecipientType,
                        childId: '',
                        parentId: '',
                      })}
                      className="flex h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    >
                      <option value="GENERAL">{t('volunteers.serviceDrawer.generalService', 'General Service (no specific recipient)')}</option>
                      <option value="CHILD">{t('volunteers.serviceDrawer.recipientChild', 'A specific child')}</option>
                      <option value="PARENT">{t('volunteers.serviceDrawer.recipientParent', 'A specific parent')}</option>
                    </select>
                  </div>

                  {sForm.recipientType !== 'GENERAL' && (
                    <div className="space-y-2">
                      {recipientsLoading ? (
                        <div className="h-11 flex items-center justify-center border rounded-xl bg-muted/30">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
                          <span className="text-xs text-muted-foreground">{t('volunteers.serviceDrawer.loadingRecipients', 'Loading recipient options...')}</span>
                        </div>
                      ) : sForm.recipientType === 'CHILD' ? (
                        <>
                          <Label htmlFor="s-child" className="text-foreground font-semibold">{t('volunteers.serviceDrawer.selectChild', 'Select Child')} *</Label>
                          <select
                            id="s-child"
                            value={sForm.childId}
                            onChange={(e) => setSForm({ ...sForm, childId: e.target.value })}
                            className="flex h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                          >
                            <option value="">{t('volunteers.serviceDrawer.chooseChild', 'Choose a child...')}</option>
                            {children.map((child) => (
                              <option key={child.id} value={child.id}>
                                {child.fullName}
                              </option>
                            ))}
                          </select>
                        </>
                      ) : (
                        <>
                          <Label htmlFor="s-parent" className="text-foreground font-semibold">{t('volunteers.serviceDrawer.selectParent', 'Select Parent')} *</Label>
                          <select
                            id="s-parent"
                            value={sForm.parentId}
                            onChange={(e) => setSForm({ ...sForm, parentId: e.target.value })}
                            className="flex h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                          >
                            <option value="">{t('volunteers.serviceDrawer.chooseParent', 'Choose a parent...')}</option>
                            {parents.map((parent) => (
                              <option key={parent.id} value={parent.id}>
                                {parent.fullName}
                              </option>
                            ))}
                          </select>
                        </>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="s-date" className="text-foreground font-semibold">{t('volunteers.serviceDrawer.serviceDate', 'Service Date')} *</Label>
                    <Input
                      id="s-date"
                      type="date"
                      required
                      value={sForm.serviceDate}
                      onChange={(e) => setSForm({ ...sForm, serviceDate: e.target.value })}
                      className="rounded-xl border-border focus-visible:ring-primary h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="s-desc" className="text-foreground font-semibold">{t('volunteers.serviceDrawer.activityDescription', 'Activity Description')}</Label>
                    <textarea
                      id="s-desc"
                      placeholder={t('volunteers.serviceDrawer.activityDescriptionPlaceholder', 'Describe what the volunteer did during this service activity...')}
                      rows={4}
                      value={sForm.description}
                      onChange={(e) => setSForm({ ...sForm, description: e.target.value })}
                      className="flex w-full rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="s-notes" className="text-foreground font-semibold">{t('volunteers.serviceDrawer.additionalNotes', 'Additional Notes')}</Label>
                    <textarea
                      id="s-notes"
                      placeholder={t('volunteers.serviceDrawer.additionalNotesPlaceholder', 'Notes on outcome, observations, or follow-ups needed...')}
                      rows={3}
                      value={sForm.notes}
                      onChange={(e) => setSForm({ ...sForm, notes: e.target.value })}
                      className="flex w-full rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-h-[80px]"
                    />
                  </div>

                  <div className="pt-4 flex gap-3 border-t border-border">
                    <Button
                      type="submit"
                      disabled={sSaving}
                      className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                    >
                      {sSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          {t('volunteers.serviceDrawer.saving', 'Saving...')}
                        </>
                      ) : (
                        t('volunteers.serviceDrawer.saveLog', 'Save Service Log')
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closeServiceDrawer}
                      className="h-11 rounded-xl border-border text-foreground font-semibold px-4"
                    >
                      {t('common.cancel', 'Cancel')}
                    </Button>
                  </div>
                </form>
              </ScrollArea>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Volunteer Confirmation Modal */}
      {deactivatingVolunteer && (
        <DeactivateConfirmationModal
          name={deactivatingVolunteer.isOrganization && deactivatingVolunteer.organizationName ? deactivatingVolunteer.organizationName : `${deactivatingVolunteer.firstName || ''} ${deactivatingVolunteer.lastName || ''}`.trim()}
          title={
            deactivatingVolunteer.status === 'INACTIVE'
              ? t('volunteers.deactivate.titleActivate', 'Activate Volunteer Profile?')
              : t('volunteers.deactivate.titleDeactivate', 'Deactivate Volunteer Profile?')
          }
          description={
            deactivatingVolunteer.status === 'INACTIVE'
              ? t('volunteers.deactivate.descActivate', 'Are you sure you want to activate {name}? This will restore their active status in the system.', {
                  name: deactivatingVolunteer.isOrganization && deactivatingVolunteer.organizationName ? deactivatingVolunteer.organizationName : `${deactivatingVolunteer.firstName || ''} ${deactivatingVolunteer.lastName || ''}`.trim(),
                })
              : t('volunteers.deactivate.descDeactivate', 'Are you sure you want to deactivate {name}? This will mark their profile as inactive in the system.', {
                  name: deactivatingVolunteer.isOrganization && deactivatingVolunteer.organizationName ? deactivatingVolunteer.organizationName : `${deactivatingVolunteer.firstName || ''} ${deactivatingVolunteer.lastName || ''}`.trim(),
                })
          }
          confirmLabel={
            deactivatingVolunteer.status === 'INACTIVE'
              ? t('volunteers.deactivate.confirmActivate', 'Activate Now')
              : t('volunteers.deactivate.confirmDeactivate', 'Deactivate Now')
          }
          onConfirm={handleToggleStatus}
          onCancel={() => setDeactivatingVolunteer(null)}
        />
      )}

      {/* Delete Volunteer Confirmation Modal */}
      {deletingVolunteer && (
        <PermanentDeleteModal
          name={deletingVolunteer.isOrganization && deletingVolunteer.organizationName ? deletingVolunteer.organizationName : `${deletingVolunteer.firstName || ''} ${deletingVolunteer.lastName || ''}`.trim()}
          relatedSummary={t('volunteers.delete.related', 'logged services')}
          deleting={deletingInFlight}
          onConfirm={handleDeleteVolunteer}
          onCancel={() => setDeletingVolunteer(null)}
        />
      )}

      {/* Delete Service Record Confirmation Modal */}
      {deletingServiceRecord && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeletingServiceRecord(null)} />
          <div className="relative w-full max-w-md rounded-lg border bg-white dark:bg-neutral-900 dark:border-neutral-700 p-6 shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{t('volunteers.deleteServiceModal.title', 'Delete Service Record')}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('volunteers.deleteServiceModal.description', 'Are you sure you want to delete this service record for {name}? This action cannot be undone.').replace('{name}', deletingServiceRecord.name)}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeletingServiceRecord(null)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDeleteService(deletingServiceRecord.id, deletingServiceRecord.name)}
              >
                {t('volunteers.deleteServiceModal.delete', 'Delete')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* History Dialog Modal */}
      {historyVolunteer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm dark:bg-black/60 transition-opacity" onClick={() => setHistoryVolunteer(null)} />
          <Card className="z-10 w-full max-w-2xl max-h-[85vh] bg-card border border-border shadow-2xl rounded-2xl flex flex-col overflow-hidden">
            <CardHeader className="px-6 py-5 border-b border-border bg-muted/30 flex flex-row items-center justify-between space-y-0">
              <div>
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  {t('volunteers.historyDialog.title', 'Service History')}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('volunteers.historyDialog.subtitle', 'List of services logged for')} <strong className="text-foreground">{historyVolunteer.isOrganization && historyVolunteer.organizationName ? historyVolunteer.organizationName : `${historyVolunteer.firstName || ''} ${historyVolunteer.lastName || ''}`.trim()}</strong>
                </p>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 hover:bg-accent" onClick={() => setHistoryVolunteer(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            <ScrollArea className="flex-1 p-6 overflow-y-auto">
              {historyVolunteer.services && historyVolunteer.services.length > 0 ? (
                <div className="space-y-4">
                  {historyVolunteer.services.map((service) => (
                    <div key={service.id} className="p-4 rounded-xl border border-border bg-muted/20 relative hover:border-border/80 transition-colors">
                      <button
                        title={t('volunteers.historyDialog.deleteRecord', 'Delete record')}
                        onClick={() => setDeletingServiceRecord({ id: service.id, name: historyVolunteer.isOrganization && historyVolunteer.organizationName ? historyVolunteer.organizationName : `${historyVolunteer.firstName || ''} ${historyVolunteer.lastName || ''}`.trim() })}
                        className="absolute top-4 right-4 p-1 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <div className="flex flex-col gap-1.5 pr-8">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground text-base">{service.serviceType}</span>
                          <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50 rounded-lg dark:border-emerald-800 dark:text-emerald-300 dark:bg-emerald-950/40">
                            {service.child
                              ? `${t('volunteers.historyDialog.forChild', 'For Child')}: ${service.child.fullName}`
                              : service.parent
                                ? `${t('volunteers.historyDialog.forParent', 'For Parent')}: ${service.parent.fullName}`
                                : t('volunteers.historyDialog.generalService', 'General Service')}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground font-medium">
                          {t('volunteers.historyDialog.performedOn', 'Performed on')} {new Date(service.serviceDate).toLocaleDateString()}
                        </div>
                        {service.description && (
                          <p className="text-sm text-foreground bg-card p-2.5 rounded-lg border border-border mt-1 shadow-sm whitespace-pre-wrap leading-relaxed">
                            {service.description}
                          </p>
                        )}
                        {service.notes && (
                          <div className="text-xs text-muted-foreground mt-1.5 flex gap-1 items-start bg-blue-50/20 border border-blue-50/40 p-2 rounded-lg dark:bg-blue-950/20 dark:border-blue-950/30">
                            <strong className="shrink-0 text-blue-600 dark:text-blue-400">{t('volunteers.historyDialog.internalNotes', 'Internal notes')}:</strong>
                            <span className="italic">{service.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-3">
                  <Calendar className="h-10 w-10 text-muted-foreground/30" />
                  <p className="font-medium">{t('volunteers.historyDialog.noRecords', 'No service records registered yet.')}</p>
                </div>
              )}
            </ScrollArea>
            <div className="px-6 py-4 border-t border-border flex justify-end">
              <Button onClick={() => setHistoryVolunteer(null)} className="rounded-xl px-5">
                {t('common.close', 'Close')}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
