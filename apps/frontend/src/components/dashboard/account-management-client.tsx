'use client';

import { useEffect, useMemo, useState, ChangeEvent } from 'react';
import type { ReactNode } from 'react';
import { format } from 'date-fns';
import {
  BadgeDollarSign,
  Loader2,
  Lock,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  UserMinus,
  LogOut,
  Eye,
  EyeOff,
  X,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import api from '@/lib/api';
import { useLocale } from '@/components/providers/locale-provider';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  AccessLevel,
  AccountRow,
  AuditLogRow,
  PermissionModule,
  PermissionRow,
  SessionRow,
} from '@/types/accounts';

type Props = { currentUser: { id: string; fullName: string; role: string; email?: string } };

type AccountForm = {
  fullName: string;
  email: string;
  photoUrl: string;
  role: 'SUPER_ADMIN' | 'CASE_WORKER';
  password: string;
  sendWelcomeEmail: boolean;
  forceChangeOnNextLogin: boolean;
  isActive: boolean;
};

const emptyForm: AccountForm = {
  fullName: '',
  email: '',
  photoUrl: '',
  role: 'CASE_WORKER',
  password: '',
  sendWelcomeEmail: true,
  forceChangeOnNextLogin: true,
  isActive: true,
};

const modules: PermissionModule[] = [
  'ACCOUNTS',
  'PERMISSIONS',
  'AUDIT_LOGS',
  'PARENTS',
  'CHILDREN',
  'SERVICES',
  'FINANCE',
  'APPOINTMENTS',
  'DOCUMENTS',
  'DASHBOARD',
  'REPORTS',
  'DONATIONS',
  'MY_ACCOUNT',
  'SESSIONS',
];

export function AccountManagementClient({ currentUser }: Props) {
  const { toast } = useToast();
  const { t } = useLocale();
  const [tab, setTab] = useState<'accounts' | 'permissions' | 'sessions' | 'audit'>('accounts');
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<AccountRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accountForm, setAccountForm] = useState<AccountForm>(emptyForm);
  const [showDelete, setShowDelete] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [showPromote, setShowPromote] = useState(false);
  const [securityPassword, setSecurityPassword] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const [reassignToStaffId, setReassignToStaffId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [notifyUser, setNotifyUser] = useState(true);
  const [forceChange, setForceChange] = useState(true);
  const [auditFilters, setAuditFilters] = useState({ staffId: '', action: '', from: '', to: '' });
  const [permissionRole, setPermissionRole] = useState<'CASE_WORKER'>('CASE_WORKER');
  const [permissionDraft, setPermissionDraft] = useState<Record<PermissionModule, AccessLevel>>({} as Record<PermissionModule, AccessLevel>);
  const [activeSessionStaffId, setActiveSessionStaffId] = useState('');
  
  // Visibility toggles
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  useEffect(() => {
    void loadAccounts();
  }, [page, search, role, status]);

  useEffect(() => {
    if (tab === 'permissions') {
      void loadPermissions();
    }
    if (tab === 'sessions') {
      void loadSessions();
    }
    if (tab === 'audit') {
      void loadLogs();
    }
  }, [tab]);

  useEffect(() => {
    if (tab !== 'permissions' || !permissions.length) return;
    const draft: Record<PermissionModule, AccessLevel> = {} as Record<PermissionModule, AccessLevel>;
    modules.forEach((module) => {
      const row = permissions.find((item) => item.role === permissionRole && item.module === module);
      draft[module] = row?.accessLevel || (module === 'MY_ACCOUNT' || module === 'SESSIONS' ? 'READ_ONLY' : module === 'ACCOUNTS' || module === 'PERMISSIONS' || module === 'AUDIT_LOGS' ? 'NO_ACCESS' : 'FULL');
    });
    setPermissionDraft(draft);
  }, [permissionRole, permissions, tab]);

  const filteredAccounts = useMemo(() => accounts, [accounts]);

  async function loadAccounts() {
    setLoading(true);
    try {
      const res = await api.get('/accounts', {
        params: {
          page,
          search: search || undefined,
          role: role || undefined,
          status: status || undefined,
        },
      });
      setAccounts(res.data.data || []);
    } catch (err: any) {
      toast({ variant: 'destructive', title: t('accounts.loadFailed', 'Failed to load accounts'), description: err.response?.data?.message || t('accounts.loadFailedDesc', 'Unable to fetch accounts.') });
    } finally {
      setLoading(false);
    }
  }

  async function loadPermissions() {
    const res = await api.get('/accounts/permissions');
    const rows = (res.data || []) as PermissionRow[];
    setPermissions(rows);
    const draft: Record<PermissionModule, AccessLevel> = {} as Record<PermissionModule, AccessLevel>;
    modules.forEach((module) => {
      const row = rows.find((item) => item.role === permissionRole && item.module === module);
      draft[module] = row?.accessLevel || (module === 'MY_ACCOUNT' || module === 'SESSIONS' ? 'READ_ONLY' : module === 'ACCOUNTS' || module === 'PERMISSIONS' || module === 'AUDIT_LOGS' ? 'NO_ACCESS' : 'FULL');
    });
    setPermissionDraft(draft);
  }

  async function loadSessions() {
    const res = await api.get('/accounts/sessions', { params: activeSessionStaffId ? { staffId: activeSessionStaffId } : {} });
    setSessions(res.data || []);
  }

  async function loadLogs() {
    const res = await api.get('/accounts/audit-logs', { params: auditFilters });
    setLogs(res.data?.data || []);
  }

  function openCreate() {
    setSelected(null);
    setAccountForm({ ...emptyForm });
    setDrawerOpen(true);
  }

  function openEdit(account: AccountRow) {
    setSelected(account);
    setAccountForm({
      fullName: account.fullName,
      email: account.email,
      photoUrl: account.photoUrl || '',
      role: account.role,
      password: '',
      sendWelcomeEmail: false,
      forceChangeOnNextLogin: account.mustChangePassword,
      isActive: account.isActive,
    });
    setDrawerOpen(true);
  }

  async function saveAccount() {
    setSaving(true);
    try {
      if (selected) {
        await api.patch(`/accounts/${selected.id}`, {
          fullName: accountForm.fullName,
          email: accountForm.email,
          photoUrl: accountForm.photoUrl,
          role: accountForm.role,
          isActive: accountForm.isActive,
        });
      } else {
        await api.post('/accounts', {
          fullName: accountForm.fullName,
          email: accountForm.email,
          photoUrl: accountForm.photoUrl,
          role: accountForm.role,
          password: accountForm.password || undefined,
          sendWelcomeEmail: accountForm.sendWelcomeEmail,
          forceChangeOnNextLogin: accountForm.forceChangeOnNextLogin,
        });
      }
      setDrawerOpen(false);
      await loadAccounts();
      toast({ title: t('accounts.saved', 'Account saved'), description: t('accounts.savedDesc', 'The account has been updated successfully.') });
    } catch (err: any) {
      toast({ variant: 'destructive', title: t('accounts.saveFailed', 'Save failed'), description: err.response?.data?.message || t('accounts.saveFailedDesc', 'Unable to save the account.') });
    } finally {
      setSaving(false);
    }
  }

  async function toggleAccountStatus(account: AccountRow) {
    try {
      await api.patch(`/accounts/${account.id}/status`, { isActive: !account.isActive });
      await loadAccounts();
      toast({
        title: account.isActive ? t('accounts.deactivated', 'Account deactivated') : t('accounts.activated', 'Account activated'),
        description: account.fullName,
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: t('accounts.statusFailed', 'Status update failed'), description: err.response?.data?.message || t('accounts.statusFailedDesc', 'Unable to update account status.') });
    }
  }

  async function resetPassword() {
    if (!selected) return;
    try {
      await api.post(`/accounts/${selected.id}/reset-password`, {
        newPassword: newPassword || undefined,
        forceChangeOnNextLogin: forceChange,
        notifyUser,
      });
      setShowReset(false);
      setNewPassword('');
      toast({ title: t('accounts.passwordReset', 'Password reset'), description: t('accounts.passwordResetDesc', 'The password was updated.') });
    } catch (err: any) {
      toast({ variant: 'destructive', title: t('accounts.passwordResetFailed', 'Password reset failed'), description: err.response?.data?.message || t('accounts.passwordResetFailedDesc', 'Unable to reset password.') });
    }
  }

  async function promote() {
    try {
      await api.post('/accounts/promote', { currentPassword: securityPassword, targetEmail });
      setShowPromote(false);
      setSecurityPassword('');
      setTargetEmail('');
      await loadAccounts();
      toast({ title: t('accounts.promoted', 'Promoted to Super Admin'), description: targetEmail });
    } catch (err: any) {
      toast({ variant: 'destructive', title: t('accounts.promoteFailed', 'Promotion failed'), description: err.response?.data?.message || t('accounts.promoteFailedDesc', 'Unable to promote the user.') });
    }
  }

  async function deleteAccount() {
    if (!selected) return;
    try {
      await api.delete(`/accounts/${selected.id}`, {
        data: {
          currentPassword: securityPassword,
          reassignToStaffId: reassignToStaffId || undefined,
        },
      });
      setShowDelete(false);
      setSecurityPassword('');
      setReassignToStaffId('');
      setSelected(null);
      await loadAccounts();
      toast({ title: t('accounts.deleted', 'Account deleted'), description: t('accounts.deletedDesc', 'The account was soft deleted.') });
    } catch (err: any) {
      toast({ variant: 'destructive', title: t('accounts.deleteFailed', 'Delete failed'), description: err.response?.data?.message || t('accounts.deleteFailedDesc', 'Unable to delete the account.') });
    }
  }

  async function savePermissions() {
    try {
      await api.patch('/accounts/permissions', {
        role: permissionRole,
        modules: modules.map((module) => ({ module, accessLevel: permissionDraft[module] })),
      });
      await loadPermissions();
      toast({ title: t('accounts.permissionsSaved', 'Permissions saved'), description: t('accounts.permissionsSavedDesc', 'Role permissions were updated globally.') });
    } catch (err: any) {
      toast({ variant: 'destructive', title: t('accounts.permissionsFailed', 'Permissions update failed'), description: err.response?.data?.message || t('accounts.permissionsFailedDesc', 'Unable to save permissions.') });
    }
  }

  async function terminateSession(sessionId: string) {
    try {
      await api.delete(`/accounts/sessions/${sessionId}`);
      await loadSessions();
      toast({ title: t('accounts.sessionTerminated', 'Session terminated') });
    } catch (err: any) {
      toast({ variant: 'destructive', title: t('accounts.sessionFailed', 'Session termination failed'), description: err.response?.data?.message || t('accounts.sessionFailedDesc', 'Unable to terminate the session.') });
    }
  }

  async function exportAudit() {
    const rows = logs.map((log) => [log.createdAt, log.staff?.fullName || '', log.action, log.entity, log.entityId, log.ipAddress || '']);
    const csv = ['Date,Staff,Action,Entity,Entity ID,IP', ...rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'audit-log.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('accounts.title', 'Account Management')}</h1>
          <p className="text-sm text-muted-foreground">{t('accounts.subtitle', 'Manage staff, permissions, sessions, and audit logs.')}</p>
            <p className="text-xs text-muted-foreground">{currentUser.fullName}</p>
          </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPromote(true)}><ShieldCheck className="h-4 w-4" />{t('accounts.promote', 'Promote')}</Button>
          <Button onClick={openCreate}><Plus className="h-4 w-4" />{t('accounts.create', 'Create Account')}</Button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b">
        {(['accounts', 'permissions', 'sessions', 'audit'] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={cn(
              'whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors',
              tab === item ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t(`accounts.tab.${item}`, item)}
          </button>
        ))}
      </div>

      {tab === 'accounts' && (
        <Card>
          <CardHeader>
            <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('accounts.search', 'Search by name, email')} />
              </div>
              <select className="h-10 rounded-md border bg-background px-3 text-sm" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="">{t('accounts.allRoles', 'All roles')}</option>
                <option value="SUPER_ADMIN">{t('accounts.superAdmin', 'Super Admin')}</option>
                <option value="CASE_WORKER">{t('accounts.staff', 'Staff')}</option>
              </select>
              <select className="h-10 rounded-md border bg-background px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">{t('accounts.allStatus', 'All status')}</option>
                <option value="active">{t('accounts.active', 'Active')}</option>
                <option value="inactive">{t('accounts.inactive', 'Inactive')}</option>
                <option value="deleted">{t('accounts.deleted', 'Deleted')}</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : filteredAccounts.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('accounts.name', 'Name')}</TableHead>
                    <TableHead>{t('accounts.role', 'Role')}</TableHead>
                    <TableHead>{t('accounts.status', 'Status')}</TableHead>
                    <TableHead>{t('accounts.sessions', 'Sessions')}</TableHead>
                    <TableHead className="text-right">{t('accounts.actions', 'Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8"><AvatarImage src={account.photoUrl || undefined} /><AvatarFallback>{initials(account.fullName)}</AvatarFallback></Avatar>
                          <div>
                            <div className="font-medium">{account.fullName}</div>
                            <div className="text-xs text-muted-foreground">{account.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{t(`enum.role.${account.role.toLowerCase()}`, account.role.replace('_', ' '))}</Badge></TableCell>
                      <TableCell>{account.deletedAt ? <Badge variant="destructive">{t('accounts.deleted', 'Deleted')}</Badge> : account.isActive ? <Badge className="bg-emerald-50 text-emerald-700">{t('accounts.active', 'Active')}</Badge> : <Badge variant="secondary">{t('accounts.inactive', 'Inactive')}</Badge>}</TableCell>
                      <TableCell>{account._count?.sessions || 0}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(account)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => { setSelected(account); setShowReset(true); }}><Lock className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => { setSelected(account); setShowDelete(true); }}><Trash2 className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => toggleAccountStatus(account)}>{account.isActive ? <UserMinus className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState title={t('accounts.empty', 'No accounts found')} description={t('accounts.emptyDesc', 'Try another search or create a new account.')} />
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'permissions' && (
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <select className="h-10 rounded-md border bg-background px-3 text-sm" value={permissionRole} onChange={(e) => setPermissionRole(e.target.value as any)}>
                <option value="CASE_WORKER">{t('accounts.staff', 'Staff')}</option>
              </select>
              <Button variant="outline" onClick={loadPermissions}><RefreshCcw className="h-4 w-4" />{t('accounts.reload', 'Reload')}</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('accounts.module', 'Module')}</TableHead>
                  <TableHead>{t('accounts.access', 'Access')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modules.map((module) => (
                  <TableRow key={module}>
                    <TableCell>{t(`accounts.module.${module.toLowerCase()}`, module.replace('_', ' '))}</TableCell>
                    <TableCell>
                      <select className="h-9 rounded-md border bg-background px-3 text-sm" value={permissionDraft[module] || 'READ_ONLY'} onChange={(e) => setPermissionDraft((current) => ({ ...current, [module]: e.target.value as AccessLevel }))}>
                        <option value="FULL">{t('accounts.fullAccess', 'Full Access')}</option>
                        <option value="READ_ONLY">{t('accounts.readOnly', 'Read Only')}</option>
                        <option value="NO_ACCESS">{t('accounts.noAccess', 'No Access')}</option>
                      </select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button onClick={savePermissions}>{t('accounts.savePermissions', 'Save Permissions')}</Button>
          </CardContent>
        </Card>
      )}

      {tab === 'sessions' && (
        <Card>
          <CardHeader className="space-y-3">
            <Input placeholder={t('accounts.filterSessions', 'Filter by staff id')} value={activeSessionStaffId} onChange={(e) => setActiveSessionStaffId(e.target.value)} />
            <Button variant="outline" onClick={loadSessions}><BadgeDollarSign className="h-4 w-4" />{t('accounts.refreshSessions', 'Refresh Sessions')}</Button>
          </CardHeader>
          <CardContent>
            {sessions.length ? (
              <Table>
                <TableHeader><TableRow><TableHead>{t('accounts.user', 'User')}</TableHead><TableHead>{t('accounts.ip', 'IP')}</TableHead><TableHead>{t('accounts.lastSeen', 'Last Seen')}</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>{session.staff.fullName}</TableCell>
                      <TableCell>{session.ipAddress || '—'}</TableCell>
                      <TableCell>{session.lastSeenAt ? format(new Date(session.lastSeenAt), 'PPpp') : '—'}</TableCell>
                      <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => terminateSession(session.tokenId)}><LogOut className="h-4 w-4" />{t('accounts.terminate', 'Terminate')}</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : <EmptyState title={t('accounts.noSessions', 'No active sessions')} description={t('accounts.noSessionsDesc', 'Active sessions will appear here.')} />}
          </CardContent>
        </Card>
      )}

      {tab === 'audit' && (
        <Card>
          <CardHeader className="space-y-3">
            <div className="grid gap-3 md:grid-cols-4">
              <Input placeholder={t('accounts.staffId', 'Staff ID')} value={auditFilters.staffId} onChange={(e) => setAuditFilters((c) => ({ ...c, staffId: e.target.value }))} />
              <Input placeholder={t('accounts.action', 'Action')} value={auditFilters.action} onChange={(e) => setAuditFilters((c) => ({ ...c, action: e.target.value }))} />
              <CalendarDatePicker value={auditFilters.from} onChange={(value) => setAuditFilters((c) => ({ ...c, from: value }))} placeholder={t('accounts.fromDate', 'From date')} />
              <CalendarDatePicker value={auditFilters.to} onChange={(value) => setAuditFilters((c) => ({ ...c, to: value }))} placeholder={t('accounts.toDate', 'To date')} />
            </div>
            <div className="flex gap-2">
              <Button onClick={loadLogs}><RefreshCcw className="h-4 w-4" />{t('accounts.searchLogs', 'Search Logs')}</Button>
              <Button variant="outline" onClick={exportAudit}><ShieldCheck className="h-4 w-4" />{t('accounts.exportCsv', 'Export CSV')}</Button>
            </div>
          </CardHeader>
          <CardContent>
            {logs.length ? (
              <Table>
                <TableHeader><TableRow><TableHead>{t('accounts.date', 'Date')}</TableHead><TableHead>{t('accounts.staff', 'Staff')}</TableHead><TableHead>{t('accounts.action', 'Action')}</TableHead><TableHead>{t('accounts.entity', 'Entity')}</TableHead><TableHead>{t('accounts.ip', 'IP')}</TableHead></TableRow></TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{format(new Date(log.createdAt), 'PPpp')}</TableCell>
                      <TableCell>{log.staff?.fullName || '—'}</TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell>{log.entity}</TableCell>
                      <TableCell>{log.ipAddress || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : <EmptyState title={t('accounts.noLogs', 'No audit entries')} description={t('accounts.noLogsDesc', 'Audit entries will appear here and cannot be edited.')} />}
          </CardContent>
        </Card>
      )}

      <Overlay open={drawerOpen} title={selected ? t('accounts.edit', 'Edit Account') : t('accounts.create', 'Create Account')} onClose={() => setDrawerOpen(false)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t('accounts.fullName', 'Full name')}><Input value={accountForm.fullName} onChange={(e) => setAccountForm((c) => ({ ...c, fullName: e.target.value }))} /></Field>
            <Field label={t('accounts.email', 'Email')}><Input value={accountForm.email} onChange={(e) => setAccountForm((c) => ({ ...c, email: e.target.value }))} /></Field>
            <div className="space-y-2">
              <Label>{t('accounts.userProfile', 'User Profile')}</Label>
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12"><AvatarImage src={accountForm.photoUrl || undefined} /><AvatarFallback>{initials(accountForm.fullName)}</AvatarFallback></Avatar>
                <p className="text-xs text-muted-foreground italic">{t('accounts.photoDisabled', 'Profile photo uploads are disabled.')}</p>
              </div>
            </div>
            <Field label={t('accounts.role', 'Role')}>
              <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={accountForm.role} onChange={(e) => setAccountForm((c) => ({ ...c, role: e.target.value as any }))}>
                <option value="SUPER_ADMIN">{t('accounts.superAdmin', 'Super Admin')}</option>
                <option value="CASE_WORKER">{t('accounts.staff', 'Staff')}</option>
              </select>
            </Field>
            <Field label={t('accounts.status', 'Status')}>
              <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={String(accountForm.isActive)} onChange={(e) => setAccountForm((c) => ({ ...c, isActive: e.target.value === 'true' }))}>
                <option value="true">{t('accounts.active', 'Active')}</option>
                <option value="false">{t('accounts.inactive', 'Inactive')}</option>
              </select>
            </Field>
            {!selected && (
              <>
                <Field label={t('accounts.password', 'Password')}>
                  <div className="relative">
                    <Input type={showFormPassword ? 'text' : 'password'} value={accountForm.password} onChange={(e) => setAccountForm((c) => ({ ...c, password: e.target.value }))} />
                    <button type="button" onClick={() => setShowFormPassword(!showFormPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showFormPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </Field>
                <Field label={t('accounts.sendWelcomeEmail', 'Send welcome email')}>
                  <input type="checkbox" checked={accountForm.sendWelcomeEmail} onChange={(e) => setAccountForm((c) => ({ ...c, sendWelcomeEmail: e.target.checked }))} />
                </Field>
              </>
            )}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
            <Button onClick={saveAccount} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t('common.save', 'Save')}</Button>
          </div>
        </Overlay>

      <Overlay open={showReset && !!selected} title={t('accounts.resetPassword', 'Reset Password')} onClose={() => setShowReset(false)}>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{selected?.fullName}</p>
            <Field label={t('accounts.newPassword', 'New password (optional)')}>
              <div className="relative">
                <Input type={showResetPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                <button type="button" onClick={() => setShowResetPassword(!showResetPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showResetPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={forceChange} onChange={(e) => setForceChange(e.target.checked)} />{t('accounts.forceChange', 'Force change on next login')}</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={notifyUser} onChange={(e) => setNotifyUser(e.target.checked)} />{t('accounts.notifyUser', 'Notify user')}</label>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowReset(false)}>{t('common.cancel', 'Cancel')}</Button><Button onClick={resetPassword}>{t('common.confirm', 'Confirm')}</Button></div>
          </div>
        </Overlay>

      <Overlay open={showPromote} title={t('accounts.promote', 'Promote to Super Admin')} onClose={() => setShowPromote(false)}>
          <div className="space-y-4">
            <Field label={t('accounts.currentPassword', 'Your password')}>
              <div className="relative">
                <Input type={showAdminPassword ? 'text' : 'password'} value={securityPassword} onChange={(e) => setSecurityPassword(e.target.value)} />
                <button type="button" onClick={() => setShowAdminPassword(!showAdminPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showAdminPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>
            <Field label={t('accounts.targetEmail', 'Target email')}><Input value={targetEmail} onChange={(e) => setTargetEmail(e.target.value)} /></Field>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowPromote(false)}>{t('common.cancel', 'Cancel')}</Button><Button onClick={promote}>{t('common.confirm', 'Confirm')}</Button></div>
          </div>
        </Overlay>

      <Overlay open={showDelete && !!selected} title={t('accounts.delete', 'Delete Account')} onClose={() => setShowDelete(false)}>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{selected?.fullName}</p>
            <Field label={t('accounts.currentPassword', 'Your password')}>
              <div className="relative">
                <Input type={showAdminPassword ? 'text' : 'password'} value={securityPassword} onChange={(e) => setSecurityPassword(e.target.value)} />
                <button type="button" onClick={() => setShowAdminPassword(!showAdminPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showAdminPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>
            <Field label={t('accounts.reassignTo', 'Reassign members to staff id (required if assigned members exist)')}><Input value={reassignToStaffId} onChange={(e) => setReassignToStaffId(e.target.value)} /></Field>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowDelete(false)}>{t('common.cancel', 'Cancel')}</Button><Button variant="destructive" onClick={deleteAccount}>{t('common.delete', 'Delete')}</Button></div>
          </div>
        </Overlay>

    </div>
  );
}

function Overlay({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
        });
      });
    } else {
      setVisible(false);
      const timer = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 !mt-0">
      <div className={`fixed inset-0 bg-slate-950/30 backdrop-blur-sm transition-opacity duration-300 ease-out ${
        visible ? 'opacity-100' : 'opacity-0'
      }`} onClick={onClose} />
      <div className={`fixed inset-y-0 right-0 w-full max-w-2xl bg-white dark:bg-neutral-900 shadow-xl flex flex-col transition-transform duration-300 ease-out ${
        visible ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="font-semibold">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="rounded-lg border border-dashed p-8 text-center"><p className="font-medium">{title}</p><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>;
}

function initials(name: string) {
  return name.split(' ').map((part) => part[0]).join('').toUpperCase().slice(0, 2);
}
