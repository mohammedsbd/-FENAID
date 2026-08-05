'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  HeartHandshake,
  ArrowLeft,
  Pencil,
  Trash2,
  Plus,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Building2,
  User,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  UserPlus,
  UserMinus,
  X,
} from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { DeactivateConfirmationModal } from '@/components/dashboard/deactivate-confirmation-modal';
import { PermanentDeleteModal } from '@/components/dashboard/permanent-delete-modal';
import { ExportButton } from '@/components/dashboard/export-button';
import {
  exportToCSV,
  exportToExcelHTML,
  exportToWordHTML,
  exportToPDF,
  exportProfileToExcel,
  escapeHTML,
  formatEnum,
} from '@/lib/export';

interface VolunteerServiceRow {
  id: string;
  volunteerId: string;
  childId?: string;
  parentId?: string;
  serviceType: string;
  description?: string;
  serviceDate: string;
  notes?: string;
  createdAt: string;
  child?: { id: string; fullName: string; dateOfBirth?: string };
  parent?: { id: string; fullName: string; phone?: string };
}

interface VolunteerDetail {
  id: string;
  isOrganization: boolean;
  organizationName?: string;
  organizationLocation?: string;
  organizationPhone?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  status: 'ACTIVE' | 'INACTIVE';
  serviceTypes?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  services: VolunteerServiceRow[];
}

interface RecipientOption {
  id: string;
  fullName: string;
}

type RecipientType = 'GENERAL' | 'CHILD' | 'PARENT';

export default function VolunteerProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLocale();

  const [volunteer, setVolunteer] = useState<VolunteerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Active tab: 'overview' | 'services'
  const [activeTab, setActiveTab] = useState<'overview' | 'services'>('overview');

  // Edit Drawer state
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
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

  // Log Service Drawer state
  const [serviceDrawerOpen, setServiceDrawerOpen] = useState(false);
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

  // Status & Delete confirmation modals
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingInFlight, setDeletingInFlight] = useState(false);
  const [deletingServiceRecord, setDeletingServiceRecord] = useState<{ id: string; name: string } | null>(null);

  const canPermanentlyDelete = getSession()?.role === 'SUPER_ADMIN';

  // Fetch volunteer details
  const fetchVolunteer = async () => {
    if (!params.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/volunteers/${params.id}`);
      setVolunteer(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || t('volunteers.profile.errorLoad', 'Failed to load volunteer profile.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVolunteer();
  }, [params.id]);

  // Fetch recipients dropdown options
  const fetchRecipients = async () => {
    setRecipientsLoading(true);
    try {
      const [cRes, pRes] = await Promise.all([
        api.get('/children', { params: { limit: 1000 } }),
        api.get('/parents', { params: { limit: 1000 } }),
      ]);
      const childData = (cRes.data?.data || []).map((c: any) => ({
        id: c.id,
        fullName: c.fullName || `${c.firstName || ''} ${c.lastName || ''}`.trim(),
      }));
      const parentData = (pRes.data?.data || []).map((p: any) => ({
        id: p.id,
        fullName: p.fullName || `${p.firstName || ''} ${p.lastName || ''}`.trim(),
      }));
      setChildren(childData);
      setParents(parentData);
    } catch (err) {
      toast({
        title: t('common.error', 'Error'),
        description: t('volunteers.toast.loadRecipientsFailed', 'Failed to load recipients list'),
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

  // Open Edit Drawer
  const openEditDrawer = () => {
    if (!volunteer) return;
    setVForm({
      isOrganization: volunteer.isOrganization || false,
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
    setEditDrawerOpen(true);
  };

  // Save Volunteer Edits
  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!volunteer) return;

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
      await api.patch(`/volunteers/${volunteer.id}`, payload);
      toast({
        title: t('common.success', 'Success'),
        description: t('volunteers.toast.updated', 'Volunteer details updated successfully'),
      });
      setEditDrawerOpen(false);
      fetchVolunteer();
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

  // Log Service Activity
  const handleSSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!volunteer) return;

    setSSaving(true);
    try {
      await api.post(`/volunteers/${volunteer.id}/services`, {
        serviceType: sForm.serviceType,
        childId: sForm.recipientType === 'CHILD' ? sForm.childId : undefined,
        parentId: sForm.recipientType === 'PARENT' ? sForm.parentId : undefined,
        description: sForm.description,
        serviceDate: sForm.serviceDate,
        notes: sForm.notes,
      });
      toast({
        title: t('common.success', 'Success'),
        description: t('volunteers.toast.serviceSaved', 'Service log saved successfully'),
      });
      setServiceDrawerOpen(false);
      setSForm({
        serviceType: '',
        recipientType: 'GENERAL',
        childId: '',
        parentId: '',
        description: '',
        serviceDate: new Date().toISOString().split('T')[0],
        notes: '',
      });
      fetchVolunteer();
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

  // Toggle status
  const handleToggleStatus = async () => {
    if (!volunteer) return;
    const isActivating = volunteer.status === 'INACTIVE';
    try {
      await api.patch(`/volunteers/${volunteer.id}`, {
        status: isActivating ? 'ACTIVE' : 'INACTIVE',
      });
      setShowDeactivateModal(false);
      toast({
        title: isActivating
          ? t('volunteers.toast.activated', 'Volunteer Activated')
          : t('volunteers.toast.deactivated', 'Volunteer Deactivated'),
        description: t('volunteers.toast.statusDescription', '{name} is now {status}.', {
          name: getDisplayName(volunteer),
          status: isActivating
            ? t('volunteers.form.active', 'ACTIVE')
            : t('volunteers.form.inactive', 'INACTIVE'),
        }),
      });
      fetchVolunteer();
    } catch (err: any) {
      toast({
        title: t('common.error', 'Error'),
        description: err.response?.data?.message || t('volunteers.toast.statusFailed', 'Failed to update volunteer status'),
        variant: 'destructive',
      });
    }
  };

  // Delete Volunteer Permanently
  const handleDeleteVolunteer = async () => {
    if (!volunteer) return;
    setDeletingInFlight(true);
    try {
      await api.delete(`/volunteers/${volunteer.id}/permanent`);
      setShowDeleteModal(false);
      toast({
        title: t('common.success', 'Success'),
        description: t('volunteers.toast.deletedPermanently', '{name} has been permanently removed.', { name: getDisplayName(volunteer) }),
      });
      router.push('/dashboard/volunteers');
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

  // Delete Service Record
  const handleDeleteService = async (serviceId: string) => {
    try {
      await api.delete(`/volunteers/services/${serviceId}`);
      toast({
        title: t('common.success', 'Success'),
        description: t('volunteers.toast.serviceDeleted', 'Service record deleted successfully'),
      });
      setDeletingServiceRecord(null);
      fetchVolunteer();
    } catch (err: any) {
      toast({
        title: t('common.error', 'Error'),
        description: err.response?.data?.message || t('volunteers.toast.serviceDeleteFailed', 'Failed to delete service record'),
        variant: 'destructive',
      });
    }
  };

  // Helper for volunteer display name
  const getDisplayName = (v: VolunteerDetail | null) => {
    if (!v) return 'Volunteer';
    if (v.isOrganization && v.organizationName) return v.organizationName;
    return [v.firstName, v.lastName].filter(Boolean).join(' ') || 'Volunteer';
  };

  // Helper for initials
  const initials = (first?: string, last?: string) => {
    const f = (first || 'V')[0];
    const l = (last || 'O')[0];
    return (f + l).toUpperCase();
  };

  // Export Volunteer Profile
  const handleExport = async (formatType: 'pdf' | 'csv' | 'excel' | 'docx') => {
    if (!volunteer) return;
    setExporting(true);

    try {
      const displayName = getDisplayName(volunteer);
      const filename = `volunteer-${displayName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-profile`;
      const title = `${displayName} - Volunteer Profile`;

      const overviewFields: [string, string][] = [
        [t('volunteers.profile.export.name', 'Volunteer / Organization Name'), displayName],
        [t('volunteers.profile.export.type', 'Type'), volunteer.isOrganization ? t('volunteers.type.organization', 'Organization') : t('volunteers.type.individual', 'Individual Volunteer')],
        [t('volunteers.profile.export.status', 'Status'), volunteer.status],
        [t('volunteers.profile.export.email', 'Email Address'), volunteer.email || 'N/A'],
        [t('volunteers.profile.export.phone', 'Phone Number'), volunteer.phone || volunteer.organizationPhone || 'N/A'],
        [t('volunteers.profile.export.location', 'Location / Address'), volunteer.organizationLocation || 'N/A'],
        [t('volunteers.profile.export.registeredDate', 'Registered Date'), volunteer.createdAt ? new Date(volunteer.createdAt).toLocaleDateString() : 'N/A'],
        [t('volunteers.profile.export.serviceTypes', 'Service Types Offered'), volunteer.serviceTypes || 'None specified'],
      ];

      if (volunteer.isOrganization && (volunteer.firstName || volunteer.lastName)) {
        overviewFields.splice(2, 0, [t('volunteers.table.contactPerson', 'Contact Person'), [volunteer.firstName, volunteer.lastName].filter(Boolean).join(' ')]);
      }

      const serviceHeaders = [
        t('volunteers.export.csv.serviceType', 'Service / Activity'),
        t('volunteers.export.csv.recipient', 'Target Recipient'),
        t('volunteers.export.csv.serviceDate', 'Service Date'),
        t('volunteers.export.csv.description', 'Description'),
        t('volunteers.export.csv.notes', 'Notes'),
      ];

      const serviceRows = (volunteer.services || []).map((s) => {
        const recipient = s.child
          ? `Child: ${s.child.fullName}`
          : s.parent
            ? `Parent: ${s.parent.fullName}`
            : 'General Service';
        return [
          s.serviceType,
          recipient,
          s.serviceDate ? new Date(s.serviceDate).toLocaleDateString() : '',
          s.description || '',
          s.notes || '',
        ];
      });

      if (formatType === 'csv') {
        const headers = ['Category', 'Field', 'Value'];
        const rows: string[][] = overviewFields.map(([k, v]) => ['Profile Overview', k, v]);
        (volunteer.services || []).forEach((s, idx) => {
          const recipient = s.child
            ? `Child: ${s.child.fullName}`
            : s.parent
              ? `Parent: ${s.parent.fullName}`
              : 'General Service';
          rows.push([`Service #${idx + 1}`, 'Activity', s.serviceType]);
          rows.push([`Service #${idx + 1}`, 'Recipient', recipient]);
          rows.push([`Service #${idx + 1}`, 'Date', s.serviceDate ? new Date(s.serviceDate).toLocaleDateString() : '']);
          rows.push([`Service #${idx + 1}`, 'Description', s.description || '']);
        });
        exportToCSV(headers, rows, `${filename}.csv`);
      } else if (formatType === 'excel') {
        exportProfileToExcel(
          title,
          [
            { title: 'Volunteer Information', fields: overviewFields },
          ],
          `${filename}.xls`
        );
      } else if (formatType === 'docx') {
        let serviceRowsHTML = '';
        (volunteer.services || []).forEach((s) => {
          const recipient = s.child
            ? `Child: ${escapeHTML(s.child.fullName)}`
            : s.parent
              ? `Parent: ${escapeHTML(s.parent.fullName)}`
              : 'General Service';
          serviceRowsHTML += `
            <tr>
              <td><b>${escapeHTML(s.serviceType)}</b></td>
              <td>${recipient}</td>
              <td>${s.serviceDate ? new Date(s.serviceDate).toLocaleDateString() : ''}</td>
              <td>${escapeHTML(s.description || '')}</td>
            </tr>
          `;
        });

        let fieldsHTML = '';
        overviewFields.forEach(([k, v]) => {
          fieldsHTML += `<tr><td style="font-weight:bold; width: 30%; bg-color:#f8fafc;">${escapeHTML(k)}</td><td>${escapeHTML(v)}</td></tr>`;
        });

        const docHTML = `
          <h2>Profile Overview</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;"><tbody>${fieldsHTML}</tbody></table>
          <h2>Service Activities History</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <thead><tr><th>Service / Activity</th><th>Target Recipient</th><th>Date</th><th>Description</th></tr></thead>
            <tbody>${serviceRowsHTML || '<tr><td colspan="4">No services logged yet.</td></tr>'}</tbody>
          </table>
        `;
        exportToWordHTML(title, docHTML, `${filename}.doc`);
      } else if (formatType === 'pdf') {
        let fieldsHTML = '';
        overviewFields.forEach(([k, v]) => {
          fieldsHTML += `
            <div style="display: flex; border-bottom: 1px solid #e2e8f0; padding: 8px 0;">
              <span style="font-weight: 600; width: 40%; color: #475569;">${escapeHTML(k)}</span>
              <span style="width: 60%; color: #0f172a;">${escapeHTML(v)}</span>
            </div>
          `;
        });

        let serviceTableHTML = `
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <thead>
              <tr style="background-color: #f1f5f9;">
                <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Activity</th>
                <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Recipient</th>
                <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Date</th>
                <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Description</th>
              </tr>
            </thead>
            <tbody>
        `;
        (volunteer.services || []).forEach((s) => {
          const recipient = s.child
            ? `Child: ${escapeHTML(s.child.fullName)}`
            : s.parent
              ? `Parent: ${escapeHTML(s.parent.fullName)}`
              : 'General Service';
          serviceTableHTML += `
            <tr>
              <td style="border: 1px solid #e2e8f0; padding: 8px;"><b>${escapeHTML(s.serviceType)}</b></td>
              <td style="border: 1px solid #e2e8f0; padding: 8px;">${recipient}</td>
              <td style="border: 1px solid #e2e8f0; padding: 8px;">${s.serviceDate ? new Date(s.serviceDate).toLocaleDateString() : ''}</td>
              <td style="border: 1px solid #e2e8f0; padding: 8px;">${escapeHTML(s.description || '')}</td>
            </tr>
          `;
        });
        serviceTableHTML += `</tbody></table>`;

        const pdfHTML = `
          <h2 style="color: #0284c7; border-bottom: 2px solid #0284c7; padding-bottom: 5px;">Profile Summary</h2>
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
            ${fieldsHTML}
          </div>
          <h2 style="color: #0284c7; border-bottom: 2px solid #0284c7; padding-bottom: 5px; margin-top: 20px;">Logged Service History (${volunteer.services?.length || 0})</h2>
          ${serviceTableHTML}
        `;
        exportToPDF(title, pdfHTML);
      }
    } catch (err) {
      toast({
        title: t('common.error', 'Error'),
        description: t('volunteers.toast.exportFailed', 'Failed to export volunteer profile'),
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">{t('common.loading', 'Loading details...')}</p>
      </div>
    );
  }

  if (error || !volunteer) {
    return (
      <div className="m-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-destructive mb-3" />
        <h3 className="text-lg font-bold text-destructive">{t('volunteers.profile.notFoundTitle', 'Volunteer Profile Not Found')}</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">{error || t('volunteers.profile.notFoundDesc', 'The requested volunteer profile does not exist or has been removed.')}</p>
        <Link href="/dashboard/volunteers">
          <Button variant="outline" className="gap-2 rounded-xl">
            <ArrowLeft className="h-4 w-4" />
            {t('volunteers.profile.backToDirectory', 'Back to Volunteers Directory')}
          </Button>
        </Link>
      </div>
    );
  }

  const displayName = getDisplayName(volunteer);
  const totalServices = volunteer.services?.length || 0;
  const childServices = (volunteer.services || []).filter((s) => s.childId).length;
  const parentServices = (volunteer.services || []).filter((s) => s.parentId).length;
  const generalServices = totalServices - childServices - parentServices;

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col gap-4">
        <div>
          <Link
            href="/dashboard/volunteers"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('volunteers.profile.backToDirectory', 'Back to Volunteers Directory')}
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className={`h-16 w-16 border-2 border-border shadow-md ${volunteer.isOrganization ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' : 'bg-primary/10 text-primary'}`}>
                <AvatarFallback className="text-xl font-bold bg-transparent">
                  {volunteer.isOrganization ? <Building2 className="h-8 w-8" /> : initials(volunteer.firstName, volunteer.lastName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">{displayName}</h1>
                  <Badge className={volunteer.isOrganization ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200' : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200'}>
                    {volunteer.isOrganization ? t('volunteers.type.organization', 'Organization / Partner') : t('volunteers.type.individual', 'Individual Volunteer')}
                  </Badge>
                  <Badge variant={volunteer.status === 'ACTIVE' ? 'default' : 'secondary'} className={volunteer.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200' : 'bg-muted text-muted-foreground'}>
                    {volunteer.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                  <span>{t('volunteers.joined', 'Joined')}: {new Date(volunteer.createdAt).toLocaleDateString()}</span>
                  {volunteer.organizationLocation && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {volunteer.organizationLocation}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <ExportButton onExport={handleExport} loading={exporting} />
              <Button onClick={() => setServiceDrawerOpen(true)} className="h-10 gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm">
                <HeartHandshake className="h-4 w-4" />
                {t('volunteers.logService', 'Log Service')}
              </Button>
              <Button variant="outline" onClick={openEditDrawer} className="h-10 gap-2 rounded-xl border-border">
                <Pencil className="h-4 w-4" />
                {t('common.edit', 'Edit')}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDeactivateModal(true)}
                className={`h-10 gap-1.5 rounded-xl border-border ${volunteer.status === 'INACTIVE' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-amber-600 hover:bg-amber-50'}`}
              >
                {volunteer.status === 'INACTIVE' ? <UserPlus className="h-4 w-4" /> : <UserMinus className="h-4 w-4" />}
                {volunteer.status === 'INACTIVE' ? t('volunteers.activate', 'Activate') : t('volunteers.deactivate', 'Deactivate')}
              </Button>
              {canPermanentlyDelete && (
                <Button variant="ghost" size="icon" onClick={() => setShowDeleteModal(true)} className="h-10 w-10 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-border bg-card shadow-sm rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <HeartHandshake className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('volunteers.profile.statTotalServices', 'Total Services Logged')}</p>
              <h3 className="text-2xl font-extrabold text-foreground mt-0.5">{totalServices}</h3>
            </div>
          </div>
        </Card>

        <Card className="border border-border bg-card shadow-sm rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <User className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('volunteers.profile.statChildServices', 'Child Recipients')}</p>
              <h3 className="text-2xl font-extrabold text-foreground mt-0.5">{childServices}</h3>
            </div>
          </div>
        </Card>

        <Card className="border border-border bg-card shadow-sm rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('volunteers.profile.statParentServices', 'Parent Recipients')}</p>
              <h3 className="text-2xl font-extrabold text-foreground mt-0.5">{parentServices}</h3>
            </div>
          </div>
        </Card>

        <Card className="border border-border bg-card shadow-sm rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('volunteers.profile.statGeneralServices', 'General Activities')}</p>
              <h3 className="text-2xl font-extrabold text-foreground mt-0.5">{generalServices}</h3>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs Control */}
      <div className="flex border-b border-border gap-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'overview' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          {t('volunteers.profile.tabOverview', 'Profile Overview')}
        </button>
        <button
          onClick={() => setActiveTab('services')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'services' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <span>{t('volunteers.profile.tabServices', 'Service History')}</span>
          <Badge variant="secondary" className="rounded-full px-2 text-[11px] font-bold">{totalServices}</Badge>
        </button>
      </div>

      {/* TAB 1: Profile Overview */}
      {activeTab === 'overview' && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Card 1: Primary Details */}
          <Card className="border border-border bg-card shadow-sm rounded-2xl">
            <CardHeader className="border-b border-border bg-muted/20 py-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                {t('volunteers.profile.detailsTitle', 'Primary Details')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2 border-b border-border pb-3">
                <span className="font-semibold text-muted-foreground">{t('volunteers.type.label', 'Volunteer Type')}</span>
                <span className="text-foreground font-medium">{volunteer.isOrganization ? t('volunteers.type.organization', 'Organization / Partner') : t('volunteers.type.individual', 'Individual Volunteer')}</span>
              </div>
              {volunteer.isOrganization && (
                <div className="grid grid-cols-2 gap-2 border-b border-border pb-3">
                  <span className="font-semibold text-muted-foreground">{t('volunteers.form.organizationName', 'Organization Name')}</span>
                  <span className="text-foreground font-semibold">{volunteer.organizationName || 'N/A'}</span>
                </div>
              )}
              {volunteer.isOrganization && (volunteer.firstName || volunteer.lastName) && (
                <div className="grid grid-cols-2 gap-2 border-b border-border pb-3">
                  <span className="font-semibold text-muted-foreground">{t('volunteers.table.contactPerson', 'Contact Person')}</span>
                  <span className="text-foreground font-medium">{[volunteer.firstName, volunteer.lastName].filter(Boolean).join(' ')}</span>
                </div>
              )}
              {!volunteer.isOrganization && (
                <div className="grid grid-cols-2 gap-2 border-b border-border pb-3">
                  <span className="font-semibold text-muted-foreground">{t('volunteers.form.fullName', 'Full Name')}</span>
                  <span className="text-foreground font-semibold">{[volunteer.firstName, volunteer.lastName].filter(Boolean).join(' ')}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 border-b border-border pb-3">
                <span className="font-semibold text-muted-foreground">{t('volunteers.table.status', 'Status')}</span>
                <div>
                  <Badge variant={volunteer.status === 'ACTIVE' ? 'default' : 'secondary'} className={volunteer.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200' : 'bg-muted text-muted-foreground'}>
                    {volunteer.status}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 border-b border-border pb-3">
                <span className="font-semibold text-muted-foreground">{t('volunteers.profile.registeredDate', 'Registered Date')}</span>
                <span className="text-foreground font-medium">{new Date(volunteer.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span className="font-semibold text-muted-foreground">{t('volunteers.profile.lastUpdated', 'Last Updated')}</span>
                <span className="text-foreground font-medium">{new Date(volunteer.updatedAt).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Contact & Location Info */}
          <Card className="border border-border bg-card shadow-sm rounded-2xl">
            <CardHeader className="border-b border-border bg-muted/20 py-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                {t('volunteers.profile.contactTitle', 'Contact & Location Info')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2 border-b border-border pb-3">
                <span className="font-semibold text-muted-foreground">{t('volunteers.form.email', 'Email Address')}</span>
                <span className="text-foreground font-medium">{volunteer.email || <span className="text-muted-foreground italic">Not provided</span>}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 border-b border-border pb-3">
                <span className="font-semibold text-muted-foreground">{t('volunteers.form.phone', 'Phone Number')}</span>
                <span className="text-foreground font-medium">{volunteer.phone || volunteer.organizationPhone || <span className="text-muted-foreground italic">Not provided</span>}</span>
              </div>
              {volunteer.isOrganization && (
                <div className="grid grid-cols-2 gap-2 border-b border-border pb-3">
                  <span className="font-semibold text-muted-foreground">{t('volunteers.form.organizationPhone', 'Organization Phone')}</span>
                  <span className="text-foreground font-medium">{volunteer.organizationPhone || <span className="text-muted-foreground italic">Not provided</span>}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <span className="font-semibold text-muted-foreground">{t('volunteers.form.organizationLocation', 'Location / Address')}</span>
                <span className="text-foreground font-medium">{volunteer.organizationLocation || <span className="text-muted-foreground italic">Not provided</span>}</span>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Service Capabilities & Notes */}
          <Card className="border border-border bg-card shadow-sm rounded-2xl md:col-span-2">
            <CardHeader className="border-b border-border bg-muted/20 py-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                {t('volunteers.profile.serviceInfoTitle', 'Service Types & Internal Notes')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 grid gap-6 md:grid-cols-2 text-sm">
              <div>
                <h4 className="font-semibold text-foreground mb-2">{t('volunteers.form.serviceTypes', 'Service Types Offered')}</h4>
                {volunteer.serviceTypes ? (
                  <div className="p-3 bg-muted/30 rounded-xl border border-border text-foreground leading-relaxed whitespace-pre-wrap">
                    {volunteer.serviceTypes}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">{t('volunteers.noneSpecified', 'No service types specified.')}</p>
                )}
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">{t('volunteers.form.internalNotes', 'Internal Notes')}</h4>
                {volunteer.notes ? (
                  <div className="p-3 bg-muted/30 rounded-xl border border-border text-foreground leading-relaxed whitespace-pre-wrap">
                    {volunteer.notes}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">{t('volunteers.noNotes', 'No internal notes added.')}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: Service History */}
      {activeTab === 'services' && (
        <Card className="border border-border bg-card shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-border bg-muted/20 py-4 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-600" />
              {t('volunteers.profile.serviceHistoryTitle', 'Logged Service Activities')} ({totalServices})
            </CardTitle>
            <Button size="sm" onClick={() => setServiceDrawerOpen(true)} className="h-9 gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
              <HeartHandshake className="h-4 w-4" />
              {t('volunteers.logService', 'Log Service')}
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {volunteer.services && volunteer.services.length > 0 ? (
              <Table>
                <TableHeader className="bg-muted/30 border-b border-border">
                  <TableRow>
                    <TableHead className="font-semibold text-foreground h-12 py-3 px-6">{t('volunteers.table.serviceType', 'Service / Activity')}</TableHead>
                    <TableHead className="font-semibold text-foreground h-12 py-3 px-6">{t('volunteers.table.recipient', 'Target Recipient')}</TableHead>
                    <TableHead className="font-semibold text-foreground h-12 py-3 px-6">{t('volunteers.table.date', 'Service Date')}</TableHead>
                    <TableHead className="font-semibold text-foreground h-12 py-3 px-6">{t('volunteers.table.description', 'Description')}</TableHead>
                    <TableHead className="font-semibold text-foreground h-12 py-3 px-6 text-right">{t('volunteers.table.actions', 'Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {volunteer.services.map((service) => (
                    <TableRow key={service.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <TableCell className="py-4 px-6 font-semibold text-foreground">
                        {service.serviceType}
                      </TableCell>
                      <TableCell className="py-4 px-6">
                        <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50 rounded-lg dark:border-emerald-800 dark:text-emerald-300 dark:bg-emerald-950/40">
                          {service.child
                            ? `Child: ${service.child.fullName}`
                            : service.parent
                              ? `Parent: ${service.parent.fullName}`
                              : 'General Service'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 px-6 text-sm text-muted-foreground">
                        {new Date(service.serviceDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="py-4 px-6 max-w-xs">
                        <p className="text-sm text-foreground truncate" title={service.description}>
                          {service.description || <span className="text-muted-foreground italic">No description</span>}
                        </p>
                      </TableCell>
                      <TableCell className="py-4 px-6 text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeletingServiceRecord({ id: service.id, name: service.serviceType })}
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
                <HeartHandshake className="h-12 w-12 text-muted-foreground/30" />
                <p className="font-medium text-base text-foreground">{t('volunteers.noServicesTitle', 'No Service Activities Registered')}</p>
                <p className="text-sm">{t('volunteers.noServicesDesc', 'Record the support this volunteer or partner organization provided.')}</p>
                <Button size="sm" onClick={() => setServiceDrawerOpen(true)} className="mt-2 h-10 gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">
                  <HeartHandshake className="h-4 w-4" />
                  {t('volunteers.logService', 'Log Service')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Volunteer Slide-over Drawer */}
      {editDrawerOpen && (
        <div className="fixed inset-0 z-50 !mt-0">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditDrawerOpen(false)} />
          <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
            <div className="pointer-events-auto w-screen max-w-xl bg-background shadow-2xl flex flex-col h-full">
              <div className="px-6 py-5 border-b border-border bg-muted/30 flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Pencil className="h-5 w-5 text-primary" />
                  {t('volunteers.drawer.editTitle', 'Edit Volunteer Details')}
                </h2>
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8" onClick={() => setEditDrawerOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="flex-1 px-6 py-4">
                <form onSubmit={handleEditSave} className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-foreground font-semibold">{t('volunteers.form.typeLabel', 'Volunteer Type')}</Label>
                    <div className="grid grid-cols-2 gap-3 p-1.5 rounded-xl border border-border bg-muted/20">
                      <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${!vForm.isOrganization ? 'border-primary bg-primary/5 text-primary font-bold' : 'border-transparent text-muted-foreground'}`}>
                        <input
                          type="radio"
                          name="vType"
                          checked={!vForm.isOrganization}
                          onChange={() => setVForm({ ...vForm, isOrganization: false })}
                          className="sr-only"
                        />
                        <User className="h-4 w-4" />
                        <span className="text-xs">{t('volunteers.type.individual', 'Individual Volunteer')}</span>
                      </label>
                      <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${vForm.isOrganization ? 'border-purple-600 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 font-bold' : 'border-transparent text-muted-foreground'}`}>
                        <input
                          type="radio"
                          name="vType"
                          checked={vForm.isOrganization}
                          onChange={() => setVForm({ ...vForm, isOrganization: true })}
                          className="sr-only"
                        />
                        <Building2 className="h-4 w-4" />
                        <span className="text-xs">{t('volunteers.type.organization', 'Organization / Partner')}</span>
                      </label>
                    </div>
                  </div>

                  {vForm.isOrganization ? (
                    <div className="space-y-4 p-4 rounded-xl border border-purple-200/80 bg-purple-50/30 dark:border-purple-900/50 dark:bg-purple-950/20">
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
                      className="flex h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                    >
                      <option value="ACTIVE">{t('volunteers.form.active', 'ACTIVE')}</option>
                      <option value="INACTIVE">{t('volunteers.form.inactive', 'INACTIVE')}</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="v-serviceTypes" className="text-foreground font-semibold">{t('volunteers.form.serviceTypes', 'Service Types')}</Label>
                    <textarea
                      id="v-serviceTypes"
                      placeholder={t('volunteers.form.serviceTypesPlaceholder', 'e.g. Teaching, Health Assessment, Counseling...')}
                      rows={3}
                      value={vForm.serviceTypes}
                      onChange={(e) => setVForm({ ...vForm, serviceTypes: e.target.value })}
                      className="flex w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-primary min-h-[80px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="v-notes" className="text-foreground font-semibold">{t('volunteers.form.internalNotes', 'Internal Notes')}</Label>
                    <textarea
                      id="v-notes"
                      placeholder={t('volunteers.form.internalNotesPlaceholder', 'Add notes...')}
                      rows={3}
                      value={vForm.notes}
                      onChange={(e) => setVForm({ ...vForm, notes: e.target.value })}
                      className="flex w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-primary min-h-[80px]"
                    />
                  </div>

                  <div className="pt-4 flex gap-3 border-t border-border">
                    <Button type="submit" disabled={vSaving} className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                      {vSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : t('common.saveChanges', 'Save Changes')}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setEditDrawerOpen(false)} className="h-11 rounded-xl border-border px-4">
                      {t('common.cancel', 'Cancel')}
                    </Button>
                  </div>
                </form>
              </ScrollArea>
            </div>
          </div>
        </div>
      )}

      {/* Log Service Slide-over Drawer */}
      {serviceDrawerOpen && (
        <div className="fixed inset-0 z-50 !mt-0">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setServiceDrawerOpen(false)} />
          <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
            <div className="pointer-events-auto w-screen max-w-xl bg-background shadow-2xl flex flex-col h-full">
              <div className="px-6 py-5 border-b border-border bg-muted/30 flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <HeartHandshake className="h-5 w-5 text-emerald-600" />
                  {t('volunteers.serviceDrawer.title', 'Log Service Provided')}
                </h2>
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8" onClick={() => setServiceDrawerOpen(false)}>
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
                      placeholder={t('volunteers.serviceDrawer.serviceTypePlaceholder', 'e.g. Special tutoring, Health assessment')}
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
                      className="flex h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
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
                            className="flex h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
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
                            className="flex h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
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
                      placeholder={t('volunteers.serviceDrawer.activityDescriptionPlaceholder', 'Describe what the volunteer did...')}
                      rows={4}
                      value={sForm.description}
                      onChange={(e) => setSForm({ ...sForm, description: e.target.value })}
                      className="flex w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-primary min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="s-notes" className="text-foreground font-semibold">{t('volunteers.serviceDrawer.additionalNotes', 'Additional Notes')}</Label>
                    <textarea
                      id="s-notes"
                      placeholder={t('volunteers.serviceDrawer.additionalNotesPlaceholder', 'Notes...')}
                      rows={3}
                      value={sForm.notes}
                      onChange={(e) => setSForm({ ...sForm, notes: e.target.value })}
                      className="flex w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-primary min-h-[80px]"
                    />
                  </div>

                  <div className="pt-4 flex gap-3 border-t border-border">
                    <Button type="submit" disabled={sSaving} className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                      {sSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : t('volunteers.serviceDrawer.saveLog', 'Save Service Log')}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setServiceDrawerOpen(false)} className="h-11 rounded-xl border-border px-4">
                      {t('common.cancel', 'Cancel')}
                    </Button>
                  </div>
                </form>
              </ScrollArea>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Modal */}
      {showDeactivateModal && (
        <DeactivateConfirmationModal
          name={displayName}
          title={
            volunteer.status === 'INACTIVE'
              ? t('volunteers.deactivate.titleActivate', 'Activate Volunteer Profile?')
              : t('volunteers.deactivate.titleDeactivate', 'Deactivate Volunteer Profile?')
          }
          description={
            volunteer.status === 'INACTIVE'
              ? t('volunteers.deactivate.descActivate', 'Are you sure you want to activate {name}?', { name: displayName })
              : t('volunteers.deactivate.descDeactivate', 'Are you sure you want to deactivate {name}?', { name: displayName })
          }
          confirmLabel={
            volunteer.status === 'INACTIVE'
              ? t('volunteers.deactivate.confirmActivate', 'Activate Now')
              : t('volunteers.deactivate.confirmDeactivate', 'Deactivate Now')
          }
          onConfirm={handleToggleStatus}
          onCancel={() => setShowDeactivateModal(false)}
        />
      )}

      {/* Permanent Delete Modal */}
      {showDeleteModal && (
        <PermanentDeleteModal
          name={displayName}
          relatedSummary={t('volunteers.delete.related', 'logged services')}
          deleting={deletingInFlight}
          onConfirm={handleDeleteVolunteer}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      {/* Delete Single Service Record Modal */}
      {deletingServiceRecord && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeletingServiceRecord(null)} />
          <div className="relative w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">{t('volunteers.deleteServiceModal.title', 'Delete Service Record')}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('volunteers.deleteServiceModal.description', 'Are you sure you want to delete this service record ({name})? This action cannot be undone.').replace('{name}', deletingServiceRecord.name)}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeletingServiceRecord(null)} className="rounded-xl">
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button variant="destructive" onClick={() => handleDeleteService(deletingServiceRecord.id)} className="rounded-xl">
                {t('volunteers.deleteServiceModal.delete', 'Delete')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
