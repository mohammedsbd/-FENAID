'use client';

import { useEffect, useState } from 'react';
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
  ChevronRight,
  AlertTriangle,
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
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

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
}

interface Volunteer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  serviceTypes?: string;
  notes?: string;
  createdAt: string;
  services: VolunteerServiceRow[];
}

interface ChildOption {
  id: string;
  fullName: string;
}

export default function VolunteersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLocale();

  // List and search state
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Volunteer Drawer (Add/Edit)
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingVolunteer, setEditingVolunteer] = useState<Volunteer | null>(null);
  const [vForm, setVForm] = useState({
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
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [childrenLoading, setChildrenLoading] = useState(false);
  const [sForm, setSForm] = useState({
    serviceType: '',
    childId: '',
    description: '',
    serviceDate: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [sSaving, setSSaving] = useState(false);

  // History Dialog state
  const [historyVolunteer, setHistoryVolunteer] = useState<Volunteer | null>(null);

  // Delete confirmation state
  const [deletingVolunteer, setDeletingVolunteer] = useState<Volunteer | null>(null);
  const [deletingServiceRecord, setDeletingServiceRecord] = useState<{ id: string; name: string } | null>(null);

  // Drawer animation state
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [serviceDrawerVisible, setServiceDrawerVisible] = useState(false);
  const [serviceDrawerMounted, setServiceDrawerMounted] = useState(false);

  // Handle search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
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
        params: { search: debouncedSearch || undefined },
      });
      setVolunteers(res.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || t('volunteers.errorLoad', 'Failed to load volunteers.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVolunteers();
  }, [debouncedSearch]);

  // Fetch children list for the service dropdown
  const fetchChildren = async () => {
    setChildrenLoading(true);
    try {
      const res = await api.get('/children', { params: { limit: 1000 } });
      setChildren(res.data?.data || []);
    } catch {
      toast({
        title: t('common.error', 'Error'),
        description: t('volunteers.toast.errorLoadChildren', 'Failed to load children list for dropdown'),
        variant: 'destructive',
      });
    } finally {
      setChildrenLoading(false);
    }
  };

  useEffect(() => {
    if (serviceDrawerOpen) {
      fetchChildren();
    }
  }, [serviceDrawerOpen]);

  // Manage Volunteer Creation/Update
  const openNewVolunteer = () => {
    setEditingVolunteer(null);
    setVForm({
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
      firstName: volunteer.firstName,
      lastName: volunteer.lastName,
      email: volunteer.email,
      phone: volunteer.phone,
      serviceTypes: volunteer.serviceTypes || '',
      notes: volunteer.notes || '',
      status: volunteer.status,
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
    if (!vForm.firstName || !vForm.lastName || !vForm.email || !vForm.phone) {
      toast({
        title: t('common.validationError', 'Validation Error'),
        description: t('volunteers.toast.requiredFields', 'First name, last name, email, and phone are required'),
        variant: 'destructive',
      });
      return;
    }

    setVSaving(true);
    try {
      if (editingVolunteer) {
        await api.patch(`/volunteers/${editingVolunteer.id}`, vForm);
        toast({
          title: t('common.success', 'Success'),
          description: t('volunteers.toast.updated', 'Volunteer details updated successfully'),
        });
      } else {
        await api.post('/volunteers', vForm);
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
      childId: '',
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

    setSSaving(true);
    try {
      await api.post(`/volunteers/${activeVolunteer?.id}/services`, sForm);
      toast({
        title: t('common.success', 'Success'),
        description: t('volunteers.toast.serviceSaved', 'Service log added for {name}').replace('{name}', `${activeVolunteer?.firstName} ${activeVolunteer?.lastName}`),
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

  // Delete volunteer
  const handleDeleteVolunteer = async (id: string, name: string) => {
    setDeletingVolunteer(null);
    try {
      await api.delete(`/volunteers/${id}`);
      toast({
        title: t('common.success', 'Success'),
        description: t('volunteers.toast.deleted', 'Volunteer removed successfully'),
      });
      fetchVolunteers();
    } catch (err: any) {
      toast({
        title: t('common.error', 'Error'),
        description: err.response?.data?.message || t('volunteers.toast.deleteFailed', 'Failed to remove volunteer'),
        variant: 'destructive',
      });
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
        <Button
          onClick={openNewVolunteer}
          className="h-11 gap-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 shadow-sm transition-all duration-150 active:scale-95 shrink-0"
        >
          <Plus className="h-5 w-5" />
          {t('volunteers.registerBtn', 'Register Volunteer')}
        </Button>
      </div>

      {/* Main card with table */}
      <Card className="border border-border bg-card shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-border bg-muted/30 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/60" />
              <Input
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
            {search && (
              <Button
                variant="outline"
                onClick={() => setSearch('')}
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
                volunteers.map((vol) => (
                  <TableRow key={vol.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <TableCell className="py-4 px-6 font-medium text-foreground">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-border shadow-sm bg-primary/5 text-primary">
                          <AvatarFallback className="font-bold bg-transparent">{initials(vol.firstName, vol.lastName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-foreground">{vol.firstName} {vol.lastName}</div>
                          <div className="text-xs text-muted-foreground">{t('volunteers.joined', 'Joined')} {new Date(vol.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground/60" />
                          <span>{vol.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground/60" />
                          <span>{vol.phone}</span>
                        </div>
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
                ))
              )}
            </TableBody>
          </Table>
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
                    <Label htmlFor="v-email" className="text-foreground font-semibold">{t('volunteers.form.email', 'Email Address')} *</Label>
                    <Input
                      id="v-email"
                      type="email"
                      required
                      placeholder={t('volunteers.form.emailPlaceholder', 'e.g. abebe@email.com')}
                      value={vForm.email}
                      onChange={(e) => setVForm({ ...vForm, email: e.target.value })}
                      className="rounded-xl border-border focus-visible:ring-primary h-11"
                    />
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
                    {t('volunteers.serviceDrawer.subtitle', 'Record a service activity for')} <strong className="text-foreground">{activeVolunteer?.firstName} {activeVolunteer?.lastName}</strong>
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
                    <Label htmlFor="s-child" className="text-foreground font-semibold">{t('volunteers.serviceDrawer.targetRecipient', 'Target Recipient')}</Label>
                    {childrenLoading ? (
                      <div className="h-11 flex items-center justify-center border rounded-xl bg-muted/30">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
                        <span className="text-xs text-muted-foreground">{t('volunteers.serviceDrawer.loadingChildren', 'Loading child options...')}</span>
                      </div>
                    ) : (
                      <select
                        id="s-child"
                        value={sForm.childId}
                        onChange={(e) => setSForm({ ...sForm, childId: e.target.value })}
                        className="flex h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      >
                        <option value="">{t('volunteers.serviceDrawer.allChildren', 'All Children / General Service')}</option>
                        {children.map((child) => (
                          <option key={child.id} value={child.id}>
                            {child.fullName}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

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

      {/* Delete Volunteer Confirmation Modal */}
      {deletingVolunteer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeletingVolunteer(null)} />
          <div className="relative w-full max-w-md rounded-lg border bg-white dark:bg-neutral-900 dark:border-neutral-700 p-6 shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{t('volunteers.deleteModal.title', 'Remove Volunteer')}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('volunteers.deleteModal.description', 'Are you sure you want to remove {name}? This action cannot be undone.').replace('{name}', `${deletingVolunteer.firstName} ${deletingVolunteer.lastName}`)}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeletingVolunteer(null)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDeleteVolunteer(deletingVolunteer.id, `${deletingVolunteer.firstName} ${deletingVolunteer.lastName}`)}
              >
                {t('volunteers.deleteModal.remove', 'Remove')}
              </Button>
            </div>
          </div>
        </div>
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
                  {t('volunteers.historyDialog.subtitle', 'List of services logged for')} <strong className="text-foreground">{historyVolunteer.firstName} {historyVolunteer.lastName}</strong>
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
                        onClick={() => setDeletingServiceRecord({ id: service.id, name: `${historyVolunteer.firstName} ${historyVolunteer.lastName}` })}
                        className="absolute top-4 right-4 p-1 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <div className="flex flex-col gap-1.5 pr-8">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground text-base">{service.serviceType}</span>
                          <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50 rounded-lg dark:border-emerald-800 dark:text-emerald-300 dark:bg-emerald-950/40">
                            {service.child ? `${t('volunteers.historyDialog.forChild', 'For Child')}: ${service.child.fullName}` : t('volunteers.historyDialog.allChildren', 'All Children')}
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
