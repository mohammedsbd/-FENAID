'use client';

import { useEffect, useState } from 'react';
import {
  Users,
  Baby,
  HandCoins,
  HeartHandshake,
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/components/providers/locale-provider';
import api from '../../../lib/api';
import { getSession } from '../../../lib/auth';
import { format } from 'date-fns';
import { cn } from '../../../lib/utils';
import Link from 'next/link';

const COLORS = ['#1e3a5f', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444'];

export default function AdminDashboard() {
  const { t } = useLocale();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      const session = getSession();
      const endpoint =
        session?.role === 'SUPER_ADMIN' ? '/dashboard/admin' : '/dashboard/staff';
      try {
        const res = await api.get(endpoint);
        setData(res.data);
      } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch dashboard', err);
        setError(
          err.response?.data?.message || t('dashboard.failedToLoad', 'Failed to load dashboard data'),
        );
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) return <DashboardSkeleton />;

  if (error || !data) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          {error || t('dashboard.noData', 'No dashboard data available.')}
        </p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          {t('dashboard.retryButton', 'Retry')}
        </Button>
      </div>
    );
  }

  if (!data.stats) {
    return <StaffDashboardView data={data} />;
  }

  return <AdminDashboardView data={data} />;
}

function AdminDashboardView({ data }: { data: any }) {
  const { t } = useLocale();
  return (
    <div className="space-y-8">
      {/* Row 1: Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title={t('dashboard.totalParents', 'Total Parents')}
          value={data.stats.totalParents}
          subtitle={t('dashboard.totalParentsActive', '{count} active', { count: data.stats.activeParents })}
          icon={Users}
          color="text-blue-600 dark:text-blue-400"
          bg="bg-blue-50 dark:bg-blue-950/50"
        />
        <StatCard
          title={t('dashboard.totalChildren', 'Total Children')}
          value={data.stats.totalChildren}
          subtitle={t('dashboard.totalChildrenActive', '{count} active', { count: data.stats.activeChildren })}
          icon={Baby}
          color="text-amber-600 dark:text-amber-400"
          bg="bg-amber-50 dark:bg-amber-950/50"
        />
        <StatCard
          title={t('dashboard.allocatedFunds', 'Allocated Funds')}
          value={`${Number(data.stats.totalFundsAllocated).toLocaleString()} ETB`}
          subtitle={t('dashboard.allocatedFundsSubtitle', 'Total support committed')}
          icon={HandCoins}
          color="text-blue-600 dark:text-blue-400"
          bg="bg-blue-50 dark:bg-blue-950/50"
        />
        <StatCard
          title={t('dashboard.disbursedFunds', 'Disbursed Funds')}
          value={`${Number(data.stats.totalFundsDisbursed).toLocaleString()} ETB`}
          subtitle={t('dashboard.disbursedFundsSubtitle', 'Total support delivered')}
          icon={HandCoins}
          color="text-emerald-600 dark:text-emerald-400"
          bg="bg-emerald-50 dark:bg-emerald-950/50"
        />
        <StatCard
          title={t('dashboard.totalDonations', 'Total Donations')}
          value={`${Number(data.stats.totalDonationsThisYear).toLocaleString()} ETB`}
          subtitle={t('dashboard.totalDonationsSubtitle', 'This year')}
          icon={HeartHandshake}
          color="text-purple-600 dark:text-purple-400"
          bg="bg-purple-50 dark:bg-purple-950/50"
        />
      </div>

      {/* Row 2: Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-medium">{t('dashboard.childrenByDisability', 'Children by Disability Type')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.childrenByDisabilityType}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="type"
                  >
                    {data.childrenByDisabilityType.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', color: 'hsl(var(--foreground))' }} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-medium">{t('dashboard.caseWorkerWorkload', 'Case Worker Workload')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.caseWorkerWorkload} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="staffName" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', color: 'hsl(var(--foreground))' }} />
                  <Legend verticalAlign="top" align="right" height={36} />
                  <Bar dataKey="parentCount" name={t('dashboard.parentsChart', 'Parents')} stackId="a" fill="#1e3a5f" />
                  <Bar dataKey="childCount" name={t('dashboard.childrenChart', 'Children')} stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Operational Panels */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left: Appointments */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold">{t('dashboard.weeklyAppointments', 'Weekly Appointments')}</CardTitle>
            <Badge variant="outline" className="font-mono">{data.upcomingAppointmentsThisWeek.length}</Badge>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-4">
              {data.upcomingAppointmentsThisWeek.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">{t('dashboard.noAppointments', 'No appointments scheduled')}</p>
              ) : (
                data.upcomingAppointmentsThisWeek.slice(0, 6).map((app: any) => (
                  <div key={app.id} className="flex items-start gap-3 rounded-lg border p-2 text-xs hover:bg-slate-50 dark:hover:bg-neutral-800 dark:hover:bg-neutral-800">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 flex-col items-center justify-center rounded bg-slate-100 font-bold text-slate-600 dark:bg-neutral-800 dark:text-neutral-300">
                      <span>{format(new Date(app.scheduledAt), 'dd')}</span>
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="font-semibold line-clamp-1">{app.title}</p>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{format(new Date(app.scheduledAt), 'hh:mm aa')}</span>
                      </div>
                    </div>
                    <Badge className="text-[9px] h-fit px-1.5 py-0 capitalize" variant="secondary">{app.type.toLowerCase()}</Badge>
                  </div>
                ))
              )}
            </div>
            {data.upcomingAppointmentsThisWeek.length > 6 && (
              <Button variant="ghost" size="sm" className="mt-4 w-full text-xs text-primary" asChild>
                <Link href="/dashboard/appointments">{t('dashboard.viewAllAppointments', 'View all appointments')} <ChevronRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Middle: Overdue Progress Notes */}
        <Card className="flex flex-col border-amber-100 bg-amber-50/20 dark:border-amber-900/50 dark:bg-amber-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-amber-900 dark:text-amber-300">{t('dashboard.overdueNotes', 'Overdue Progress Notes')}</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-3">
              {data.overdueProgressNotes.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">{t('dashboard.allReportsUpToDate', 'All reports are up to date')}</p>
              ) : (
                data.overdueProgressNotes.slice(0, 5).map((child: any) => (
                  <div key={child.id} className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-white p-3 text-xs shadow-sm dark:border-amber-800 dark:bg-neutral-900">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-slate-900 dark:text-neutral-100">{child.fullName}</span>
                      <span className="text-[10px] text-muted-foreground">{t('dashboard.staffLabel', 'Staff: {name}', { name: child.assignedStaff.fullName })}</span>
                    </div>
                    <Button size="sm" variant="outline" className="h-7 border-amber-200 bg-amber-50 px-2 text-[10px] text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-900" asChild>
                       <Link href={`/dashboard/children/${child.id}`}>{t('dashboard.logNoteButton', 'Log Note')}</Link>
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right: Pending Disbursements */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold">{t('dashboard.pendingDisbursements', 'Pending Disbursements')}</CardTitle>
            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">{data.pendingFundDisbursements.length}</Badge>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-3">
              {data.pendingFundDisbursements.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">{t('dashboard.noPendingDisbursements', 'No pending disbursements')}</p>
              ) : (
                data.pendingFundDisbursements.slice(0, 5).map((alloc: any) => (
                  <div key={alloc.id} className="flex items-center justify-between rounded-lg border p-3 text-xs hover:bg-slate-50 dark:hover:bg-neutral-800 dark:hover:bg-neutral-800">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold">{alloc.parent.fullName}</span>
                      <span className="text-[10px] text-muted-foreground">{format(new Date(alloc.allocationDate), 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900 dark:text-neutral-100">{Number(alloc.amount).toLocaleString()} ETB</div>
                      <Badge variant="ghost" className="text-[9px] text-emerald-600 px-0 h-fit">{t('dashboard.readyStatus', 'Ready')}</Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
            {data.pendingFundDisbursements.length > 5 && (
              <Button variant="ghost" size="sm" className="mt-4 w-full text-xs text-primary" asChild>
                <Link href="/dashboard/funds">{t('dashboard.manageAllocations', 'Manage allocations')} <ChevronRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Recent Registrations */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">{t('dashboard.recentParents', 'Recent Parents')}</CardTitle>
            <Button variant="ghost" size="sm" className="h-8 text-xs px-2" asChild>
               <Link href="/dashboard/parents">{t('dashboard.viewAll', 'View All')}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10px] uppercase font-bold">{t('dashboard.fullName', 'Full Name')}</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold">{t('dashboard.date', 'Date')}</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentRegistrations.parents.map((p: any) => (
                  <TableRow key={p.id} className="text-xs">
                    <TableCell className="font-medium">{p.fullName}</TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(p.createdAt), 'MMM dd')}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                        <Link href={`/dashboard/parents/${p.id}`}><ExternalLink className="h-3 w-3" /></Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">{t('dashboard.recentChildren', 'Recent Children')}</CardTitle>
            <Button variant="ghost" size="sm" className="h-8 text-xs px-2" asChild>
               <Link href="/dashboard/children">{t('dashboard.viewAll', 'View All')}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10px] uppercase font-bold">{t('dashboard.fullName', 'Full Name')}</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold">{t('dashboard.date', 'Date')}</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentRegistrations.children.map((c: any) => (
                  <TableRow key={c.id} className="text-xs">
                    <TableCell className="font-medium">{c.fullName}</TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(c.createdAt), 'MMM dd')}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                        <Link href={`/dashboard/children/${c.id}`}><ExternalLink className="h-3 w-3" /></Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StaffDashboardView({ data }: { data: any }) {
  const { t } = useLocale();
  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title={t('dashboard.myParents', 'My Parents')}
          value={data.myParents}
          subtitle={t('dashboard.assignedToYou', 'Assigned to you')}
          icon={Users}
          color="text-blue-600 dark:text-blue-400"
          bg="bg-blue-50 dark:bg-blue-950/50"
        />
        <StatCard
          title={t('dashboard.myChildren', 'My Children')}
          value={data.myChildren}
          subtitle={t('dashboard.underYourCare', 'Under your care')}
          icon={Baby}
          color="text-amber-600 dark:text-amber-400"
          bg="bg-amber-50 dark:bg-amber-950/50"
        />
        <StatCard
          title={t('dashboard.overdueNotesTitle', 'Overdue Notes')}
          value={data.myChildrenWithOverdueNotes.length}
          subtitle={t('dashboard.needAttention', 'Need attention')}
          icon={AlertCircle}
          color="text-red-600 dark:text-red-400"
          bg="bg-red-50 dark:bg-red-950/50"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">{t('dashboard.myUpcomingAppointments', 'My Upcoming Appointments')}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.myUpcomingAppointments.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">{t('dashboard.noUpcomingAppointments', 'No upcoming appointments')}</p>
            ) : (
              <div className="space-y-3">
                {data.myUpcomingAppointments.slice(0, 6).map((app: any) => (
                  <div key={app.id} className="flex items-start gap-3 rounded-lg border p-2 text-xs hover:bg-slate-50 dark:hover:bg-neutral-800 dark:hover:bg-neutral-800">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 flex-col items-center justify-center rounded bg-slate-100 font-bold text-slate-600 dark:bg-neutral-800 dark:text-neutral-300">
                      <span>{format(new Date(app.scheduledAt), 'dd')}</span>
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="font-semibold line-clamp-1">{app.title}</p>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{format(new Date(app.scheduledAt), 'hh:mm aa')}</span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[9px] h-fit px-1.5 py-0 capitalize">
                      {app.type.toLowerCase()}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">{t('dashboard.myPendingAssignments', 'My Pending Service Assignments')}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.myPendingServiceAssignments.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">{t('dashboard.noPendingAssignments', 'No pending assignments')}</p>
            ) : (
              <div className="space-y-3">
                {data.myPendingServiceAssignments.slice(0, 6).map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between rounded-lg border p-3 text-xs dark:border-neutral-700">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold">{a.service.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {a.parent?.fullName || a.child?.fullName}
                      </span>
                    </div>
                    <Badge variant="outline" className="capitalize">{a.frequency.toLowerCase().replace('_', ' ')}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon: Icon, color, bg }: any) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            <p className="text-[10px] text-muted-foreground">{subtitle}</p>
          </div>
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', bg)}>
            <Icon className={cn('h-6 w-6', color)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-[380px] w-full rounded-xl" />
        <Skeleton className="h-[380px] w-full rounded-xl" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-[400px] w-full rounded-xl" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    </div>
  );
}
