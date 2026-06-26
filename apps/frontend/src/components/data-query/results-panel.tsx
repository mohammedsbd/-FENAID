'use client';

import type { DataQueryResponse } from '@fikir/types';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Link from 'next/link';
import { Lock, Search, SearchCheck, X } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatEnum } from '@/lib/export';
import { useLocale } from '@/components/providers/locale-provider';

const COLORS = ['#1e3a5f', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444'];

function translateCellValue(col: string, value: unknown, t: (key: string, fallback?: string) => string, dataSubject: string): string {
  const str = String(value ?? '');
  if (!str) return '';

  const enumMap: Record<string, string> = {
    gender: 'enum.gender',
    disabilityType: 'enum.disabilityType',
    severityLevel: 'enum.severity',
    communicationAbility: 'enum.communication',
    schoolEnrollmentStatus: 'enum.schoolStatus',
    financialBracket: 'enum.financialBracket',
    allocationStatus: 'enum.allocationStatus',
    employmentStatus: 'enum.employmentStatus',
    maritalStatus: 'enum.maritalStatus',
  };

  if (col === 'status') {
    const prefix = dataSubject === 'PARENT' ? 'enum.parentStatus' : 'enum.childStatus';
    return t(`${prefix}.${str.toLowerCase()}`, str);
  }

  if (col === 'disabilityCategory') {
    const catMap: Record<string, string> = {
      'autism': 'autism',
      'down syndrome': 'downSyndrome',
      'mobility impairment': 'mobilityImpairment',
      'visual impairment': 'visualImpairment',
      'hearing impairment': 'hearingImpairment',
      'speech impairment': 'speechImpairment',
      'developmental delay': 'developmentalDelay',
      'other': 'other',
    };
    const catKey = catMap[str.toLowerCase()];
    if (catKey) return t(`enum.disabilityCategory.${catKey}`, str);
    return str;
  }

  const prefix = enumMap[col];
  if (prefix) {
    const key = str.replace(/[\s-]+/g, '_').toLowerCase();
    return t(`${prefix}.${key}`, str);
  }

  return str;
}

interface ResultsPanelProps {
  dataSubject: string;
  loading: boolean;
  hasRun: boolean;
  result: DataQueryResponse | null;
  columns: string[];
  canExportIdentified: boolean;
  isSuperAdmin: boolean;
  onSort: (column: string) => void;
  onPageChange: (page: number) => void;
  onExport: (format: 'excel' | 'pdf' | 'anonymized_excel') => void;
  exporting?: boolean;
}

export function ResultsPanel({
  dataSubject,
  loading,
  hasRun,
  result,
  columns,
  canExportIdentified,
  isSuperAdmin,
  onSort,
  onPageChange,
  onExport,
  exporting,
}: ResultsPanelProps) {
  const { t } = useLocale();
  const [showCharts, setShowCharts] = useState(false);
  const [selectedRow, setSelectedRow] = useState<Record<
    string,
    unknown
  > | null>(null);

  if (!hasRun) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
        <SearchCheck className="mb-4 h-16 w-16 opacity-30" />
        <h3 className="text-lg font-semibold text-foreground">
          {t('dataQuery.buildTitle', 'Build your query')}
        </h3>
        <p className="mt-2 max-w-md text-sm">
          {t(
            'dataQuery.buildSubtitle',
            'Use the filters on the left to define your criteria, then click Run Query.',
          )}
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!result || result.total === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
        <Search className="mb-4 h-16 w-16 opacity-30" />
        <h3 className="text-lg font-semibold text-foreground">
          {t('dataQuery.noResultsTitle', 'No members match your filters')}
        </h3>
        <p className="mt-2 max-w-md text-sm">
          {t(
            'dataQuery.noResultsSubtitle',
            'Try adjusting or removing some filters to broaden your search.',
          )}
        </p>
      </div>
    );
  }

  const subjectLabel = dataSubject === 'CHILD'
    ? t('dataQuery.children', 'children')
    : dataSubject === 'PARENT'
      ? t('dataQuery.parents', 'parents')
      : t('dataQuery.pairs', 'pairs');

  const chartData = {
    disability: result.summary.byDisabilityType ?? [],
    gender: [
      { name: t('enum.gender.male', 'Male'), value: result.summary.byGender?.male ?? 0 },
      { name: t('enum.gender.female', 'Female'), value: result.summary.byGender?.female ?? 0 },
    ],
    subcity: result.summary.bySubcity ?? [],
    severity: result.summary.bySeverity ?? [],
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="bg-slate-50">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-lg font-bold">
            {t('dataQuery.found', 'Found')} {result.total} {subjectLabel}
          </p>
          <div className="flex flex-wrap gap-2">
            {result.summary.byGender && (
              <>
                <Badge variant="outline">
                  {result.summary.byGender.male} {t('enum.gender.male', 'Male')}
                </Badge>
                <Badge variant="outline">
                  {result.summary.byGender.female} {t('enum.gender.female', 'Female')}
                </Badge>
              </>
            )}
            {result.summary.byStatus?.slice(0, 4).map((s) => (
              <Badge key={s.status} variant="outline">
                {s.count} {translateCellValue('status', s.status, t, dataSubject)}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button
        variant="ghost"
        size="sm"
        className="w-fit"
        onClick={() => setShowCharts(!showCharts)}
      >
        {showCharts ? t('dataQuery.hideCharts', 'Hide charts') + ' ▲' : t('dataQuery.showCharts', 'Show charts') + ' ▼'}
      </Button>

      {showCharts && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {chartData.disability.length > 0 && (
            <Card>
              <CardContent className="h-[200px] p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.disability}>
                    <XAxis dataKey="type" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#1e3a5f" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="h-[200px] p-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.gender}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={70}
                  >
                    {chartData.gender.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="h-[200px] p-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData.subcity.slice(0, 8)}
                  layout="vertical"
                >
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis
                    type="category"
                    dataKey="subcity"
                    width={80}
                    tick={{ fontSize: 9 }}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          {chartData.severity.length > 0 && (
            <Card>
              <CardContent className="h-[200px] p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.severity}>
                    <XAxis dataKey="level" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="overflow-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={col}
                  className="cursor-pointer whitespace-nowrap"
                  onClick={() => onSort(col)}
                >
                  {t('column.' + col, formatEnum(col))}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.results.map((row, idx) => (
              <TableRow
                key={idx}
                className="cursor-pointer hover:bg-slate-50"
                onClick={() => setSelectedRow(row)}
              >
                {columns.map((col) => (
                  <TableCell key={col} className="whitespace-nowrap text-sm">
                    {translateCellValue(col, row[col], t, dataSubject)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {t('dataQuery.page', 'Page')} {result.page} {t('dataQuery.of', 'of')} {result.pages}
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={result.page <= 1}
            onClick={() => onPageChange(result.page - 1)}
          >
            {t('dataQuery.previous', 'Previous')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={result.page >= result.pages}
            onClick={() => onPageChange(result.page + 1)}
          >
            {t('dataQuery.next', 'Next')}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-white p-3">
        <p className="text-xs text-muted-foreground">
          {t('dataQuery.exportIncludes', 'Export includes all')} {result.total} {t('dataQuery.recordsNotJustPage', 'records, not just this page')}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {(isSuperAdmin || canExportIdentified) && (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={exporting}
                onClick={() => onExport('excel')}
              >
                {t('export.excel', 'Export Excel')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={exporting}
                onClick={() => onExport('pdf')}
              >
                {t('export.pdf', 'Export PDF')}
              </Button>
            </>
          )}
          <Button
            size="sm"
            disabled={exporting}
            onClick={() => onExport('anonymized_excel')}
          >
            {t('export.anonymizedExcel', 'Export Anonymized Excel')}
          </Button>
          {!isSuperAdmin && !canExportIdentified && (
            <span
              className="flex items-center gap-1 text-xs text-muted-foreground"
              title={t('dataQuery.contactAdmin', 'Contact your admin to enable full data exports')}
            >
              <Lock className="h-3 w-3" />
              {t('dataQuery.identifiedExportsLocked', 'Identified exports locked')}
            </span>
          )}
        </div>
      </div>

      {selectedRow && (
        <div className="fixed inset-y-0 right-0 z-40 w-full max-w-sm border-l bg-white p-4 shadow-2xl">
          <div className="mb-4 flex items-start justify-between">
            <h3 className="font-semibold">{t('dataQuery.memberSummary', 'Member Summary')}</h3>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setSelectedRow(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2 text-sm">
            {columns.slice(0, 6).map((col) => (
              <div key={col}>
                <p className="text-xs text-muted-foreground">
                  {t('column.' + col, formatEnum(col))}
                </p>
                <p>{translateCellValue(col, selectedRow[col], t, dataSubject)}</p>
              </div>
            ))}
          </div>
          {typeof selectedRow._childId === 'string' && (
            <Link
              href={`/dashboard/children/${selectedRow._childId}`}
              className="mt-4 inline-flex text-sm font-medium text-primary"
            >
              {t('dataQuery.viewFullProfile', 'View Full Profile')} →
            </Link>
          )}
          {typeof selectedRow._parentId === 'string' &&
            !selectedRow._childId && (
              <Link
                href={`/dashboard/parents/${selectedRow._parentId}`}
                className="mt-4 inline-flex text-sm font-medium text-primary"
              >
                {t('dataQuery.viewFullProfile', 'View Full Profile')} →
              </Link>
            )}
        </div>
      )}
    </div>
  );
}
