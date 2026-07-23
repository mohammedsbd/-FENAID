'use client';

import { useState, useEffect, ReactNode } from 'react';
import { format } from 'date-fns';
import { 
  Loader2, 
  Lock, 
  User, 
  Mail, 
  Activity, 
  ShieldCheck, 
  History,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { useLocale } from '@/components/providers/locale-provider';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { AccountRow, AuditLogRow, SessionRow } from '@/types/accounts';

export function MyAccountClient({ tab: activeTab }: { tab?: 'profile' | 'security' | 'sessions' | 'activity' } = {}) {
  const { toast } = useToast();
  const { t } = useLocale();
  const [profile, setProfile] = useState<AccountRow | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [activity, setActivity] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', photoUrl: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

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
        email: me.data.email || '',
        photoUrl: me.data.photoUrl || '',
      });
      setSessions(mySessions.data || []);
      setActivity(myActivity.data || []);
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    setSaving(true);
    try {
      const res = await api.patch('/accounts/me', form);
      toast({ title: t('myAccount.saved', 'Profile saved') });

      window.location.reload();
    } catch (err: any) {
      toast({ variant: 'destructive', title: t('myAccount.saveFailed', 'Save failed'), description: err.response?.data?.message || t('myAccount.saveFailedDesc', 'Unable to save your profile.') });
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ 
        variant: 'destructive', 
        title: t('myAccount.passwordMismatch', 'Passwords do not match'), 
        description: t('myAccount.passwordMismatchDesc', 'New password and confirmation do not match.') 
      });
      return;
    }

    setSaving(true);
    try {
      await api.post('/auth/change-password', passwordForm);
      toast({ title: t('myAccount.passwordChanged', 'Password updated') });
      
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      toast({ 
        variant: 'destructive', 
        title: t('myAccount.passwordFailed', 'Password change failed'), 
        description: err.response?.data?.message || t('myAccount.passwordFailedDesc', 'Unable to change password.') 
      });
    } finally {
      setSaving(false);
    }
  }

  async function terminateSession(sessionId: string) {
    try {
      await api.delete(`/accounts/me/sessions/${sessionId}`);
      await load();
      toast({ title: t('myAccount.sessionTerminated', 'Session terminated') });
    } catch (err: any) {
      toast({ 
        variant: 'destructive', 
        title: t('myAccount.sessionFailed', 'Could not terminate session'), 
        description: err.response?.data?.message || t('myAccount.sessionFailedDesc', 'Unable to terminate the session.') 
      });
    }
  }

  if (loading) return <Skeleton className="h-[500px] w-full rounded-xl" />;

  const tab = activeTab || 'profile';

  return (
    <div className="w-full">
      {tab === 'profile' && (
        <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>{t('myAccount.editProfile', 'Personal Information')}</CardTitle>
            <CardDescription>{t('myAccount.editProfileDesc', 'Update your personal details and public profile.')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="flex flex-col md:flex-row items-center gap-6 pb-6 border-b">
              <Avatar className="w-24 h-24 border-2 border-primary/10 shadow-lg">
                <AvatarImage src={form.photoUrl || undefined} />
                <AvatarFallback className="bg-primary/5 text-primary text-2xl">{form.fullName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="text-center md:text-left space-y-1">
                <h4 className="font-semibold">{t('myAccount.fullName', 'User Profile')}</h4>
                <p className="text-xs text-muted-foreground">{t(`enum.role.${profile?.role?.toLowerCase()}`, profile?.role?.replace(/_/g, ' ') || '')}</p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Field label={t('myAccount.fullName', 'Full name')} icon={<User className="w-4 h-4" />}>
                <Input value={form.fullName} onChange={(e) => setForm((c) => ({ ...c, fullName: e.target.value }))} placeholder={t('myAccount.fullNamePlaceholder', 'John Doe')} />
              </Field>
              <Field label={t('myAccount.email', 'Email Address')} icon={<Mail className="w-4 h-4" />}>
                <Input type="email" value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} placeholder={t('myAccount.emailPlaceholder', 'john@example.com')} />
              </Field>
            </div>
            
            <div className="flex justify-end pt-4">
              <Button onClick={saveProfile} disabled={saving} className="min-w-[120px]">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {t('common.save', 'Save Changes')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'security' && (
        <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>{t('myAccount.changePassword', 'Security & Password')}</CardTitle>
            <CardDescription>{t('myAccount.securityDesc', 'Ensure your account is using a long, random password to stay secure.')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 max-w-2xl">
              <Field label={t('myAccount.currentPassword', 'Current password')}>
                <div className="relative">
                  <Input type={showCurrentPassword ? 'text' : 'password'} value={passwordForm.currentPassword} onChange={(e) => setPasswordForm((c) => ({ ...c, currentPassword: e.target.value }))} />
                  <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground dark:hover:text-neutral-100">
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>
              <Field label={t('myAccount.newPassword', 'New password')}>
                <div className="relative">
                  <Input type={showNewPassword ? 'text' : 'password'} value={passwordForm.newPassword} onChange={(e) => setPasswordForm((c) => ({ ...c, newPassword: e.target.value }))} />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground dark:hover:text-neutral-100">
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <PasswordStrength password={passwordForm.newPassword} />
              </Field>
              <Field label={t('myAccount.confirmPassword', 'Confirm new password')}>
                <Input type={showNewPassword ? 'text' : 'password'} value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm((c) => ({ ...c, confirmPassword: e.target.value }))} />
              </Field>
            </div>
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={changePassword} disabled={saving} className="min-w-[140px]">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {t('common.update', 'Update Password')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'sessions' && (
        <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>{t('myAccount.sessions', 'Active Sessions')}</CardTitle>
            <CardDescription>{t('myAccount.sessionsDesc', 'Devices currently logged into your account.')}</CardDescription>
          </CardHeader>
          <CardContent>
            {sessions.length ? (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 dark:bg-neutral-800/50">
                      <TableHead>{t('myAccount.device', 'Device / Browser')}</TableHead>
                      <TableHead>{t('myAccount.ip', 'IP Address')}</TableHead>
                      <TableHead>{t('myAccount.lastSeen', 'Last seen')}</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell className="font-medium">{session.userAgent || '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{session.ipAddress || '—'}</TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">{session.lastSeenAt ? format(new Date(session.lastSeenAt), 'PPpp') : '—'}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => terminateSession(session.tokenId)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Lock className="h-4 w-4 mr-2" />
                            {t('common.terminate', 'Log out')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : <div className="text-center py-10 text-muted-foreground">{t('myAccount.noSessions', 'No active sessions')}</div>}
          </CardContent>
        </Card>
      )}

      {tab === 'activity' && (
        <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>{t('myAccount.activity', 'Activity History')}</CardTitle>
            <CardDescription>{t('myAccount.activityDesc', 'Review your recent actions and account changes from the last 90 days.')}</CardDescription>
          </CardHeader>
          <CardContent>
            {activity.length ? (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 dark:bg-neutral-800/50">
                      <TableHead className="w-[200px]">{t('myAccount.date', 'Date & Time')}</TableHead>
                      <TableHead>{t('myAccount.action', 'Action')}</TableHead>
                      <TableHead>{t('myAccount.entity', 'Module')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activity.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">{format(new Date(entry.createdAt), 'PPpp')}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-mono text-[10px] uppercase">
                            {entry.action.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{entry.entity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : <div className="text-center py-10 text-muted-foreground">{t('myAccount.noActivity', 'No recent activity')}</div>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-muted-foreground">
        {icon}
        {label}
      </Label>
      {children}
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const { t } = useLocale();
  if (!password) return null;
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  const width = `${Math.min(100, score * 20)}%`;
  const label = score < 2 ? t('myAccount.passwordWeak', 'Weak') : score < 4 ? t('myAccount.passwordMedium', 'Medium') : t('myAccount.passwordStrong', 'Strong');
  const color = score < 2 ? 'bg-rose-500' : score < 4 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="space-y-1.5 mt-2">
      <div className="h-1 rounded-full bg-slate-100 dark:bg-neutral-800 overflow-hidden">
        <div className={cn("h-1 rounded-full transition-all duration-500", color)} style={{ width }} />
      </div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t('myAccount.passwordStrength', '{label} Security', { label })}</p>
    </div>
  );
}
