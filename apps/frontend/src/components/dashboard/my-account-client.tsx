'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { format } from 'date-fns';
import { Loader2, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import api from '@/lib/api';
import { t } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { AccountRow, AuditLogRow, SessionRow } from '@/types/accounts';

type Props = { currentUser: { id: string; fullName: string; email: string; role: string } };

export function MyAccountClient({ currentUser }: Props) {
  const { toast } = useToast();
  const [profile, setProfile] = useState<AccountRow | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [activity, setActivity] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'profile' | 'security' | 'sessions' | 'notifications' | 'activity'>('profile');
  const [form, setForm] = useState({ fullName: '', phone: '', photoUrl: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [prefs, setPrefs] = useState({ email: true, sms: false, inApp: true });

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [me, mySessions, myActivity] = await Promise.all([
        api.get('/accounts/me'),
        api.get('/accounts/me/sessions'),
        api.get('/accounts/me/activity'),
      ]);
      setProfile(me.data);
      setForm({
        fullName: me.data.fullName || '',
        phone: me.data.phone || '',
        photoUrl: me.data.photoUrl || '',
      });
      setPrefs(me.data.notificationPreferences || { email: true, sms: false, inApp: true });
      setSessions(mySessions.data || []);
      setActivity(myActivity.data || []);
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    setSaving(true);
    try {
      await api.patch('/accounts/me', { ...form, notificationPreferences: prefs });
      toast({ title: t('myAccount.saved', 'Profile saved') });
      await load();
    } catch (err: any) {
      toast({ variant: 'destructive', title: t('myAccount.saveFailed', 'Save failed'), description: err.response?.data?.message || t('myAccount.saveFailedDesc', 'Unable to save your profile.') });
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    setSaving(true);
    try {
      await api.post('/auth/change-password', passwordForm);
      toast({ title: t('myAccount.passwordChanged', 'Password updated') });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: t('myAccount.passwordFailed', 'Password change failed'), description: err.response?.data?.message || t('myAccount.passwordFailedDesc', 'Unable to change password.') });
    } finally {
      setSaving(false);
    }
  }

  async function terminateSession(sessionId: string) {
    try {
      await api.delete(`/accounts/me/sessions/${sessionId}`);
      await load();
    } catch (err: any) {
      toast({ variant: 'destructive', title: t('myAccount.sessionFailed', 'Could not terminate session'), description: err.response?.data?.message || t('myAccount.sessionFailedDesc', 'Unable to terminate the session.') });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('myAccount.title', 'My Account')}</h1>
        <p className="text-sm text-muted-foreground">{profile?.email || currentUser.email}</p>
      </div>
      <div className="flex gap-2">
        {(['profile', 'security', 'sessions', 'notifications', 'activity'] as const).map((item) => (
          <Button key={item} variant={tab === item ? 'default' : 'outline'} onClick={() => setTab(item)}>{t(`myAccount.tab.${item}`, item)}</Button>
        ))}
      </div>

      {loading ? <Skeleton className="h-96 w-full" /> : (
        <>
          {tab === 'profile' && (
            <Card>
              <CardHeader><CardTitle>{t('myAccount.editProfile', 'Edit profile')}</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <Field label={t('myAccount.fullName', 'Full name')}><Input value={form.fullName} onChange={(e) => setForm((c) => ({ ...c, fullName: e.target.value }))} /></Field>
                <Field label={t('myAccount.phone', 'Phone')}><Input value={form.phone} onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))} /></Field>
                <Field label={t('myAccount.photoUrl', 'Photo URL')}><Input value={form.photoUrl} onChange={(e) => setForm((c) => ({ ...c, photoUrl: e.target.value }))} /></Field>
                <Field label={t('myAccount.emailPrefs', 'Email notifications')}>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={prefs.email} onChange={(e) => setPrefs((c) => ({ ...c, email: e.target.checked }))} />{t('myAccount.enabled', 'Enabled')}</label>
                </Field>
              </CardContent>
              <div className="flex justify-end p-4"><Button onClick={saveProfile} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t('common.save', 'Save')}</Button></div>
            </Card>
          )}

          {tab === 'security' && (
            <Card>
              <CardHeader><CardTitle>{t('myAccount.changePassword', 'Change password')}</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <Field label={t('myAccount.currentPassword', 'Current password')}><Input type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm((c) => ({ ...c, currentPassword: e.target.value }))} /></Field>
                <Field label={t('myAccount.newPassword', 'New password')}>
                  <Input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm((c) => ({ ...c, newPassword: e.target.value }))} />
                  <PasswordStrength password={passwordForm.newPassword} />
                </Field>
                <Field label={t('myAccount.confirmPassword', 'Confirm password')}><Input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm((c) => ({ ...c, confirmPassword: e.target.value }))} /></Field>
              </CardContent>
              <div className="flex justify-end p-4"><Button onClick={changePassword} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t('common.update', 'Update')}</Button></div>
            </Card>
          )}

          {tab === 'sessions' && (
            <Card>
              <CardHeader><CardTitle>{t('myAccount.sessions', 'Active sessions')}</CardTitle></CardHeader>
              <CardContent>
                {sessions.length ? (
                  <Table>
                    <TableHeader><TableRow><TableHead>{t('myAccount.device', 'Device')}</TableHead><TableHead>{t('myAccount.ip', 'IP')}</TableHead><TableHead>{t('myAccount.lastSeen', 'Last seen')}</TableHead><TableHead /></TableRow></TableHeader>
                    <TableBody>
                      {sessions.map((session) => (
                        <TableRow key={session.id}>
                          <TableCell>{session.userAgent || '—'}</TableCell>
                          <TableCell>{session.ipAddress || '—'}</TableCell>
                          <TableCell>{session.lastSeenAt ? format(new Date(session.lastSeenAt), 'PPpp') : '—'}</TableCell>
                          <TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => terminateSession(session.tokenId)}><Lock className="h-4 w-4" />{t('common.terminate', 'Terminate')}</Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : <p className="text-sm text-muted-foreground">{t('myAccount.noSessions', 'No active sessions')}</p>}
              </CardContent>
            </Card>
          )}

          {tab === 'notifications' && (
            <Card>
              <CardHeader><CardTitle>{t('myAccount.notifications', 'Notification preferences')}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {(['email', 'sms', 'inApp'] as const).map((key) => (
                  <label key={key} className="flex items-center gap-2">
                    <input type="checkbox" checked={prefs[key]} onChange={(e) => setPrefs((c) => ({ ...c, [key]: e.target.checked }))} />
                    {key}
                  </label>
                ))}
                <Button onClick={saveProfile} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t('common.save', 'Save')}</Button>
              </CardContent>
            </Card>
          )}

          {tab === 'activity' && (
            <Card>
              <CardHeader><CardTitle>{t('myAccount.activity', 'Last 90 days')}</CardTitle></CardHeader>
              <CardContent>
                {activity.length ? (
                  <Table>
                    <TableHeader><TableRow><TableHead>{t('myAccount.date', 'Date')}</TableHead><TableHead>{t('myAccount.action', 'Action')}</TableHead><TableHead>{t('myAccount.entity', 'Entity')}</TableHead></TableRow></TableHeader>
                    <TableBody>{activity.map((entry) => <TableRow key={entry.id}><TableCell>{format(new Date(entry.createdAt), 'PPpp')}</TableCell><TableCell>{entry.action}</TableCell><TableCell>{entry.entity}</TableCell></TableRow>)}</TableBody>
                  </Table>
                ) : <p className="text-sm text-muted-foreground">{t('myAccount.noActivity', 'No recent activity')}</p>}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function PasswordStrength({ password }: { password: string }) {
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  const width = `${Math.min(100, score * 20)}%`;
  const label = score < 2 ? 'Weak' : score < 4 ? 'Medium' : 'Strong';

  return (
    <div className="space-y-1">
      <div className="h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-primary transition-all" style={{ width }} />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
