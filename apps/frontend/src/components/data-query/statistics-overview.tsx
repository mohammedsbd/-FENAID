'use client';

import {
  Baby,
  HandCoins,
  Users,
  GraduationCap,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';
import { exportToPDF } from '@/lib/export';
import { useLocale } from '@/components/providers/locale-provider';

const COLORS = ['#1e3a5f', '#f59e0b', '#10b981', '#8b5cf6'];

export function StatisticsOverview() {
  const { t } = useLocale();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/data-query/statistics')
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  const handleExportPdf = async () => {
    const res = await api.get('/data-query/statistics/export');
    const stats = res.data;
    const body = `
      <h2>{t('stats.keyMetrics', 'Key Metrics')}</h2>
      <ul>
        <li>${t('stats.activeChildren', 'Active Children')}: ${stats.totalActiveChildren}</li>
        <li>${t('stats.activeParents', 'Active Parents')}: ${stats.totalActiveParents}</li>
        <li>${t('stats.fundsDisbursed', 'Funds Disbursed')}: ETB ${Number(stats.fundsDisbursedThisYear).toLocaleString()}</li>
        <li>${t('stats.workshopAttendance', 'Workshop Attendance')}: ${stats.workshopAttendanceRate}%</li>
        <li>${t('stats.milestoneAchievement', 'Milestone Achievement')}: ${stats.milestoneAchievementRate}%</li>
      </ul>
    `;
    exportToPDF('Organizational Snapshot', body);
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const genderChildren = [
    { name: t('stats.male', 'Male'), value: data.genderBreakdownChildren?.male ?? 0 },
    { name: t('stats.female', 'Female'), value: data.genderBreakdownChildren?.female ?? 0 },
  ];
  const genderParents = [
    { name: t('stats.male', 'Male'), value: data.genderBreakdownParents?.male ?? 0 },
    { name: t('stats.female', 'Female'), value: data.genderBreakdownParents?.female ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.activeChildren', 'Active Children')}</CardTitle>
            <Baby className="h-4 w-4 text-blue-700 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalActiveChildren}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.activeParents', 'Active Parents')}</CardTitle>
            <Users className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalActiveParents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.fundsDisbursed', 'Funds Disbursed (YTD)')}</CardTitle>
            <HandCoins className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ETB {Number(data.fundsDisbursedThisYear).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.workshopAttendance', 'Workshop Attendance')}</CardTitle>
            <GraduationCap className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.workshopAttendanceRate}%</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('stats.childrenByDisability', 'Children by Disability Type')}</CardTitle>
          </CardHeader>
          <CardContent className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.childrenByDisabilityType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', color: 'hsl(var(--foreground))' }} />
                <Bar dataKey="count" fill="#1e3a5f" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('stats.childrenBySeverity', 'Children by Severity')}</CardTitle>
          </CardHeader>
          <CardContent className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.childrenBySeverity} dataKey="count" nameKey="level" outerRadius={80}>
                  {data.childrenBySeverity.map((_: unknown, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', color: 'hsl(var(--foreground))' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('stats.childrenByAge', 'Children by Age Group')}</CardTitle>
          </CardHeader>
          <CardContent className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.childrenByAgeGroup}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="group" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', color: 'hsl(var(--foreground))' }} />
                <Bar dataKey="count" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('stats.membersBySubcity', 'Members by Sub-city (Top 10)')}</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.membersBySubcity} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="subcity" width={100} tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', color: 'hsl(var(--foreground))' }} />
                <Bar dataKey="childCount" fill="#1e3a5f" name="Children" />
                <Bar dataKey="parentCount" fill="#f59e0b" name="Parents" />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('stats.newRegistrations', 'New Registrations (12 months)')}</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.newRegistrationsPerMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', color: 'hsl(var(--foreground))' }} />
                <Line type="monotone" dataKey="children" stroke="#1e3a5f" name="Children" />
                <Line type="monotone" dataKey="parents" stroke="#f59e0b" name="Parents" />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('stats.genderBreakdown', 'Gender Breakdown')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <div className="h-[140px]">
              <p className="mb-1 text-center text-xs text-muted-foreground">{t('stats.children', 'Children')}</p>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={genderChildren} dataKey="value" nameKey="name" innerRadius={30} outerRadius={50}>
                    {genderChildren.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="h-[140px]">
              <p className="mb-1 text-center text-xs text-muted-foreground">{t('stats.parents', 'Parents')}</p>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={genderParents} dataKey="value" nameKey="name" innerRadius={30} outerRadius={50}>
                    {genderParents.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('stats.servicesDelivered', 'Services Delivered')}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-around py-8">
            <div className="text-center">
              <p className="text-3xl font-bold">{data.servicesDeliveredThisYear}</p>
              <p className="text-xs text-muted-foreground">{t('stats.thisYear', 'This year')}</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-muted-foreground">
                {data.servicesDeliveredLastYear}
              </p>
              <p className="text-xs text-muted-foreground">{t('stats.lastYear', 'Last year')}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('stats.milestoneAchievement', 'Milestone Achievement')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full border-8 border-primary/20 text-xl font-bold text-primary"
              style={{
                borderTopColor: '#1e3a5f',
                transform: `rotate(${(data.milestoneAchievementRate / 100) * 360}deg)`,
              }}
            >
              {data.milestoneAchievementRate}%
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleExportPdf}>
          {t('dataQuery.exportSnapshot', 'Export Organizational Snapshot as PDF')}
        </Button>
      </div>
    </div>
  );
}
