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
  Sparkles,
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
  fullName: string;
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
    fullName: '',
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
      setError(err.response?.data?.message || 'Failed to load volunteers.');
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
        title: 'Error',
        description: 'Failed to load children list for dropdown',
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
      fullName: '',
      email: '',
      phone: '',
      serviceTypes: '',
      notes: '',
      status: 'ACTIVE',
    });
    setDrawerOpen(true);
  };

  const openEditVolunteer = (volunteer: Volunteer) => {
    setEditingVolunteer(volunteer);
    setVForm({
      fullName: volunteer.fullName,
      email: volunteer.email,
      phone: volunteer.phone,
      serviceTypes: volunteer.serviceTypes || '',
      notes: volunteer.notes || '',
      status: volunteer.status,
    });
    setDrawerOpen(true);
  };

  const handleVSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vForm.fullName || !vForm.email || !vForm.phone) {
      toast({
        title: 'Validation Error',
        description: 'Name, email, and phone are required',
        variant: 'destructive',
      });
      return;
    }

    setVSaving(true);
    try {
      if (editingVolunteer) {
        await api.patch(`/volunteers/${editingVolunteer.id}`, vForm);
        toast({
          title: 'Success',
          description: 'Volunteer details updated successfully',
        });
      } else {
        await api.post('/volunteers', vForm);
        toast({
          title: 'Success',
          description: 'Volunteer registered successfully',
        });
      }
      setDrawerOpen(false);
      fetchVolunteers();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to save volunteer details',
        variant: 'destructive',
      });
    } finally {
      setVSaving(false);
    }
  };

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
    setServiceDrawerOpen(true);
  };

  const handleSSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sForm.serviceType || !sForm.serviceDate) {
      toast({
        title: 'Validation Error',
        description: 'Service type and date are required',
        variant: 'destructive',
      });
      return;
    }

    setSSaving(true);
    try {
      await api.post(`/volunteers/${activeVolunteer?.id}/services`, sForm);
      toast({
        title: 'Success',
        description: `Service log added for ${activeVolunteer?.fullName}`,
      });
      setServiceDrawerOpen(false);
      fetchVolunteers();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to save service log',
        variant: 'destructive',
      });
    } finally {
      setSSaving(false);
    }
  };

  // Delete volunteer
  const handleDeleteVolunteer = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove volunteer ${name}?`)) return;

    try {
      await api.delete(`/volunteers/${id}`);
      toast({
        title: 'Success',
        description: 'Volunteer removed successfully',
      });
      fetchVolunteers();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to remove volunteer',
        variant: 'destructive',
      });
    }
  };

  // Delete service log
  const handleDeleteService = async (serviceId: string, volunteerName: string) => {
    if (!confirm('Are you sure you want to delete this service record?')) return;

    try {
      await api.delete(`/volunteers/services/${serviceId}`);
      toast({
        title: 'Success',
        description: 'Service record deleted',
      });
      // Refresh details
      if (historyVolunteer) {
        const res = await api.get(`/volunteers/${historyVolunteer.id}`);
        setHistoryVolunteer(res.data);
      }
      fetchVolunteers();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to delete service record',
        variant: 'destructive',
      });
    }
  };

  const initials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
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
      <Card className="border border-slate-100 bg-white shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-50 bg-slate-50/50 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/60" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}                    placeholder={t('volunteers.searchPlaceholder', 'Search by name, service types, contact...')}
                className="h-11 pl-11 pr-10 text-sm shadow-inner bg-white border-slate-200 focus-visible:ring-primary rounded-xl"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-slate-100 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {search && (
              <Button
                variant="outline"
                onClick={() => setSearch('')}
                className="h-11 gap-1.5 border-slate-200 hover:bg-slate-50 rounded-xl"
              >
                <RotateCcw className="h-4 w-4" />
                {t('common.reset', 'Reset')}
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {error && (
            <div className="m-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <Table>
            <TableHeader className="bg-slate-50/70 border-b border-slate-100">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-semibold text-slate-700 h-12 py-3 px-6">{t('volunteers.table.name', 'Volunteer')}</TableHead>
                <TableHead className="font-semibold text-slate-700 h-12 py-3 px-6">{t('volunteers.table.contact', 'Contact')}</TableHead>                  <TableHead className="font-semibold text-slate-700 h-12 py-3 px-6">{t('volunteers.table.serviceTypes', 'Service Types')}</TableHead>
                <TableHead className="font-semibold text-slate-700 h-12 py-3 px-6">{t('volunteers.table.status', 'Status')}</TableHead>
                <TableHead className="font-semibold text-slate-700 h-12 py-3 px-6">{t('volunteers.table.servicesCount', 'Services Logged')}</TableHead>
                <TableHead className="font-semibold text-slate-700 h-12 py-3 px-6 text-right">{t('volunteers.table.actions', 'Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i} className="border-b border-slate-50">
                    <TableCell colSpan={6} className="py-6 px-6">
                      <div className="h-10 animate-pulse rounded-lg bg-slate-100/80" />
                    </TableCell>
                  </TableRow>
                ))
              ) : volunteers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-56 text-center px-6">
                    <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
                      <HeartHandshake className="h-12 w-12 text-slate-200" />
                      <div>
                        <p className="font-semibold text-base text-slate-700">{t('volunteers.empty.title', 'No Volunteers Found')}</p>
                        <p className="text-sm text-slate-400 mt-1">{t('volunteers.empty.desc', 'Try searching with a different term or register a new volunteer.')}</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                volunteers.map((vol) => (
                  <TableRow key={vol.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <TableCell className="py-4 px-6 font-medium text-slate-900">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-slate-100 shadow-sm bg-primary/5 text-primary">
                          <AvatarFallback className="font-bold bg-transparent">{initials(vol.fullName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-slate-900">{vol.fullName}</div>
                          <div className="text-xs text-muted-foreground">Joined {new Date(vol.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <div className="flex flex-col gap-1 text-sm text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          <span>{vol.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          <span>{vol.phone}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      {vol.serviceTypes ? (
                        <p className="text-sm text-slate-600 max-w-xs truncate" title={vol.serviceTypes}>
                          {vol.serviceTypes}
                        </p>
                      ) : (
                        <span className="text-xs text-slate-400 italic">None specified</span>
                      )}
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <Badge
                        variant={vol.status === 'ACTIVE' ? 'default' : 'secondary'}
                        className={vol.status === 'ACTIVE' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50 rounded-full font-medium' 
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100 rounded-full font-medium'}
                      >
                        {vol.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 font-semibold rounded-lg px-2.5 py-1">
                          {vol.services?.length || 0}
                        </Badge>
                        {(vol.services?.length || 0) > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs font-semibold hover:text-primary hover:bg-primary/5 rounded-lg px-2 gap-1"
                            onClick={() => setHistoryVolunteer(vol)}
                          >
                            View History
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6 text-right">
                      <div className="flex justify-end items-center gap-2">
                        <Button
                          title="Log Service"
                          size="icon"
                          variant="ghost"
                          onClick={() => openServiceLog(vol)}
                          className="h-9 w-9 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                        >
                          <HeartHandshake className="h-4 w-4" />
                        </Button>
                        <Button
                          title="Edit Details"
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditVolunteer(vol)}
                          className="h-9 w-9 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          title="Remove Volunteer"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteVolunteer(vol.id, vol.fullName)}
                          className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
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
      {drawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setDrawerOpen(false)} />
          <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
            <div className="pointer-events-auto w-screen max-w-md transform bg-white shadow-2xl transition-transform duration-300 ease-in-out border-l border-slate-100 flex flex-col h-full">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    {editingVolunteer ? 'Edit Volunteer' : 'Register Volunteer'}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {editingVolunteer ? 'Update active profile details' : 'Create a new volunteer profile'}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 hover:bg-slate-200" onClick={() => setDrawerOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="flex-1 px-6 py-4">
                <form onSubmit={handleVSave} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="v-name" className="text-slate-700 font-semibold">Full Name *</Label>
                    <Input
                      id="v-name"
                      required
                      placeholder="e.g. Abebe Kebede"
                      value={vForm.fullName}
                      onChange={(e) => setVForm({ ...vForm, fullName: e.target.value })}
                      className="rounded-xl border-slate-200 focus-visible:ring-primary h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="v-email" className="text-slate-700 font-semibold">Email Address *</Label>
                    <Input
                      id="v-email"
                      type="email"
                      required
                      placeholder="e.g. abebe@email.com"
                      value={vForm.email}
                      onChange={(e) => setVForm({ ...vForm, email: e.target.value })}
                      className="rounded-xl border-slate-200 focus-visible:ring-primary h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="v-phone" className="text-slate-700 font-semibold">Phone Number *</Label>
                    <Input
                      id="v-phone"
                      required
                      placeholder="e.g. +251 911 000 000"
                      value={vForm.phone}
                      onChange={(e) => setVForm({ ...vForm, phone: e.target.value })}
                      className="rounded-xl border-slate-200 focus-visible:ring-primary h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="v-status" className="text-slate-700 font-semibold">Status</Label>
                    <select
                      id="v-status"
                      value={vForm.status}
                      onChange={(e) => setVForm({ ...vForm, status: e.target.value })}
                      className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="v-serviceTypes" className="text-slate-700 font-semibold">Service Types</Label>
                    <textarea
                      id="v-serviceTypes"
                      placeholder="e.g. Teaching, Health Assessment, Counseling, Home Visit, Fundraising..."
                      rows={3}
                      value={vForm.serviceTypes}
                      onChange={(e) => setVForm({ ...vForm, serviceTypes: e.target.value })}
                      className="flex w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-h-[80px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="v-notes" className="text-slate-700 font-semibold">Internal Notes</Label>
                    <textarea
                      id="v-notes"
                      placeholder="General notes or observations about this volunteer..."
                      rows={3}
                      value={vForm.notes}
                      onChange={(e) => setVForm({ ...vForm, notes: e.target.value })}
                      className="flex w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-h-[80px]"
                    />
                  </div>

                  <div className="pt-4 flex gap-3 border-t border-slate-100">
                    <Button
                      type="submit"
                      disabled={vSaving}
                      className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                    >
                      {vSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Saving...
                        </>
                      ) : (
                        'Save Profile'
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDrawerOpen(false)}
                      className="h-11 rounded-xl border-slate-200 text-slate-700 font-semibold px-4"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </ScrollArea>
            </div>
          </div>
        </div>
      )}

      {/* Log Volunteer Service Slide-over Panel */}
      {serviceDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setServiceDrawerOpen(false)} />
          <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
            <div className="pointer-events-auto w-screen max-w-md transform bg-white shadow-2xl transition-transform duration-300 ease-in-out border-l border-slate-100 flex flex-col h-full">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <HeartHandshake className="h-5 w-5 text-emerald-600" />
                    Log Service Provided
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Record a service activity for <strong className="text-slate-700">{activeVolunteer?.fullName}</strong>
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 hover:bg-slate-200" onClick={() => setServiceDrawerOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="flex-1 px-6 py-4">
                <form onSubmit={handleSSave} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="s-type" className="text-slate-700 font-semibold">Service Type / Activity *</Label>
                    <Input
                      id="s-type"
                      required
                      placeholder="e.g. Special tutoring, Health assessment, Counseling"
                      value={sForm.serviceType}
                      onChange={(e) => setSForm({ ...sForm, serviceType: e.target.value })}
                      className="rounded-xl border-slate-200 focus-visible:ring-primary h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="s-child" className="text-slate-700 font-semibold">Target Recipient</Label>
                    {childrenLoading ? (
                      <div className="h-11 flex items-center justify-center border rounded-xl bg-slate-50">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
                        <span className="text-xs text-muted-foreground">Loading child options...</span>
                      </div>
                    ) : (
                      <select
                        id="s-child"
                        value={sForm.childId}
                        onChange={(e) => setSForm({ ...sForm, childId: e.target.value })}
                        className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      >
                        <option value="">All Children / General Service</option>
                        {children.map((child) => (
                          <option key={child.id} value={child.id}>
                            {child.fullName}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="s-date" className="text-slate-700 font-semibold">Service Date *</Label>
                    <Input
                      id="s-date"
                      type="date"
                      required
                      value={sForm.serviceDate}
                      onChange={(e) => setSForm({ ...sForm, serviceDate: e.target.value })}
                      className="rounded-xl border-slate-200 focus-visible:ring-primary h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="s-desc" className="text-slate-700 font-semibold">Activity Description</Label>
                    <textarea
                      id="s-desc"
                      placeholder="Describe what the volunteer did during this service activity..."
                      rows={4}
                      value={sForm.description}
                      onChange={(e) => setSForm({ ...sForm, description: e.target.value })}
                      className="flex w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="s-notes" className="text-slate-700 font-semibold">Additional Notes</Label>
                    <textarea
                      id="s-notes"
                      placeholder="Notes on outcome, observations, or follow-ups needed..."
                      rows={3}
                      value={sForm.notes}
                      onChange={(e) => setSForm({ ...sForm, notes: e.target.value })}
                      className="flex w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-h-[80px]"
                    />
                  </div>

                  <div className="pt-4 flex gap-3 border-t border-slate-100">
                    <Button
                      type="submit"
                      disabled={sSaving}
                      className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                    >
                      {sSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Saving...
                        </>
                      ) : (
                        'Save Service Log'
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setServiceDrawerOpen(false)}
                      className="h-11 rounded-xl border-slate-200 text-slate-700 font-semibold px-4"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </ScrollArea>
            </div>
          </div>
        </div>
      )}

      {/* History Dialog Modal */}
      {historyVolunteer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setHistoryVolunteer(null)} />
          <Card className="z-10 w-full max-w-2xl max-h-[85vh] bg-white border border-slate-100 shadow-2xl rounded-2xl flex flex-col overflow-hidden">
            <CardHeader className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between space-y-0">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Service History
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  List of services logged for <strong className="text-slate-700">{historyVolunteer.fullName}</strong>
                </p>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 hover:bg-slate-200" onClick={() => setHistoryVolunteer(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            <ScrollArea className="flex-1 p-6 overflow-y-auto">
              {historyVolunteer.services && historyVolunteer.services.length > 0 ? (
                <div className="space-y-4">
                  {historyVolunteer.services.map((service) => (
                    <div key={service.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/40 relative hover:border-slate-200 transition-colors">
                      <button
                        title="Delete record"
                        onClick={() => handleDeleteService(service.id, historyVolunteer.fullName)}
                        className="absolute top-4 right-4 p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <div className="flex flex-col gap-1.5 pr-8">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-950 text-base">{service.serviceType}</span>
                          <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50 rounded-lg">
                            {service.child ? `For Child: ${service.child.fullName}` : 'All Children'}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-400 font-medium">
                          Performed on {new Date(service.serviceDate).toLocaleDateString()}
                        </div>
                        {service.description && (
                          <p className="text-sm text-slate-700 bg-white p-2.5 rounded-lg border border-slate-50 mt-1 shadow-sm whitespace-pre-wrap leading-relaxed">
                            {service.description}
                          </p>
                        )}
                        {service.notes && (
                          <div className="text-xs text-slate-500 mt-1.5 flex gap-1 items-start bg-blue-50/20 border border-blue-50/40 p-2 rounded-lg">
                            <strong className="shrink-0 text-blue-600">Internal notes:</strong>
                            <span className="italic">{service.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 flex flex-col items-center gap-3">
                  <Calendar className="h-10 w-10 text-slate-200" />
                  <p className="font-medium">No service records registered yet.</p>
                </div>
              )}
            </ScrollArea>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
              <Button onClick={() => setHistoryVolunteer(null)} className="rounded-xl px-5">
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
