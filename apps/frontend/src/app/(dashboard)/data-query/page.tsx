'use client';

import type { DataQueryFilters, DataQueryResponse } from '@fikir/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FilterBuilder } from '@/components/data-query/filter-builder';
import { ResultsPanel } from '@/components/data-query/results-panel';
import {
  SavedQueriesPanel,
  type SavedQueryItem,
} from '@/components/data-query/saved-queries-panel';
import { StatisticsOverview } from '@/components/data-query/statistics-overview';
import {
  DEFAULT_COLUMNS,
  emptyFilters,
} from '@/components/data-query/constants';
import {
  exportQueryExcel,
  exportQueryPdf,
} from '@/components/data-query/export-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import api from '@/lib/api';
import { getSession } from '@/lib/auth';
import { useLocale } from '@/components/providers/locale-provider';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type DataSubject = 'CHILD' | 'PARENT' | 'PARENT_CHILD_PAIR';
type Tab = 'builder' | 'statistics';

export default function DataQueryPage() {
  const session = getSession();
  const { t } = useLocale();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('builder');
  const [filterWidth, setFilterWidth] = useState(300);
  const resizing = useRef(false);
  const [dataSubject, setDataSubject] = useState<DataSubject>('CHILD');
  const [filters, setFilters] = useState<DataQueryFilters>(emptyFilters());
  const [columns, setColumns] = useState<string[]>(DEFAULT_COLUMNS.CHILD);
  const [sortBy, setSortBy] = useState('fullName');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [anonymize, setAnonymize] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [result, setResult] = useState<DataQueryResponse | null>(null);
  const [savedMine, setSavedMine] = useState<SavedQueryItem[]>([]);
  const [savedOrg, setSavedOrg] = useState<SavedQueryItem[]>([]);
  const [savedCollapsed, setSavedCollapsed] = useState(false);
  const [canExportIdentified, setCanExportIdentified] = useState(false);

  const isSuperAdmin = session?.role === 'SUPER_ADMIN';

  const loadSaved = useCallback(async () => {
    const res = await api.get('/data-query/saved');
    setSavedMine(res.data.mine ?? []);
    setSavedOrg(res.data.orgWide ?? []);
  }, []);

  useEffect(() => {
    void loadSaved();
    void api.get('/data-query/permissions').then((res) => {
      setCanExportIdentified(Boolean(res.data.canExportIdentified));
    });
  }, [loadSaved]);

  const buildPayload = useCallback(
    (overridePage?: number) => ({
      dataSubject,
      filters,
      columns,
      anonymize,
      sortBy,
      sortDir,
      page: overridePage ?? page,
      pageSize: 25,
    }),
    [anonymize, columns, dataSubject, filters, page, sortBy, sortDir],
  );

  const runQuery = useCallback(
    async (overridePage?: number) => {
      setLoading(true);
      setHasRun(true);
      try {
        const res = await api.post(
          '/data-query/run',
          buildPayload(overridePage),
        );
        setResult(res.data);
        if (overridePage) setPage(overridePage);
      } finally {
        setLoading(false);
      }
    },
    [buildPayload],
  );

  const handleDataSubjectChange = (subject: DataSubject) => {
    setDataSubject(subject);
    setColumns(DEFAULT_COLUMNS[subject]);
    setSortBy(subject === 'PARENT' ? 'parentFullName' : 'fullName');
  };

  const handleClear = () => {
    setFilters(emptyFilters());
    setAnonymize(false);
    setResult(null);
    setHasRun(false);
    setPage(1);
  };

  const handleExport = async (format: 'excel' | 'pdf' | 'anonymized_excel') => {
    setExporting(true);
    try {
      const res = await api.post('/data-query/export', {
        ...buildPayload(),
        format,
        anonymize: format === 'anonymized_excel' ? true : anonymize,
      });
      const payload = res.data;
      if (format === 'pdf') {
        exportQueryPdf('Custom Data Query', payload.results, payload.columns);
      } else {
        exportQueryExcel(payload);
      }
    } finally {
      setExporting(false);
    }
  };

  const handleSaveQuery = async (data: {
    name: string;
    description?: string;
    isOrgWide: boolean;
  }) => {
    await api.post('/data-query/saved', {
      ...data,
      dataSubject,
      filters,
      columns,
      sortBy,
      sortDir,
    });
    await loadSaved();
  };

  const handleRunSaved = async (query: SavedQueryItem) => {
    setDataSubject(query.dataSubject as DataSubject);
    setFilters(query.filters);
    setColumns(query.columns);
    setSortBy(query.sortBy ?? 'fullName');
    setSortDir((query.sortDir as 'asc' | 'desc') ?? 'asc');
    setLoading(true);
    setHasRun(true);
    try {
      const res = await api.post(`/data-query/saved/${query.id}/run`, {
        page: 1,
        pageSize: 25,
      });
      setResult(res.data);
      setPage(1);
      await loadSaved();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="shrink-0 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            {t('dataQuery.title', 'Data Query & Export Center')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(
              'dataQuery.subtitle',
              'Build custom queries and export reports',
            )}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            variant={activeTab === 'builder' ? 'default' : 'outline'}
            onClick={() => setActiveTab('builder')}
          >
            {t('dataQuery.tabBuilder', 'Query Builder')}
          </Button>
          <Button
            variant={activeTab === 'statistics' ? 'default' : 'outline'}
            onClick={() => setActiveTab('statistics')}
          >
            {t('dataQuery.tabStats', 'Statistics Overview')}
          </Button>
        </div>
      </div>

      {activeTab === 'statistics' ? (
        <div className="flex-1 min-h-0">
          <StatisticsOverview />
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 gap-0">
          <div style={{ width: filterWidth, minWidth: 220, maxWidth: 500 }} className="shrink-0">
            <Card className="flex flex-col h-full overflow-hidden rounded-r-none border-r-0">
              <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                <div className="border-b bg-slate-50 dark:bg-neutral-800/50 px-4 py-3">
                  <h2 className="text-sm font-semibold text-primary">{t('dataQuery.filtersTitle', 'Filters')}</h2>
                  <p className="text-xs text-muted-foreground">
                    {t('dataQuery.filtersDesc', 'Define criteria, then run your query')}
                  </p>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  <FilterBuilder
                    dataSubject={dataSubject}
                    onDataSubjectChange={handleDataSubjectChange}
                    filters={filters}
                    onFiltersChange={setFilters}
                    columns={columns}
                    onColumnsChange={setColumns}
                    sortBy={sortBy}
                    onSortByChange={setSortBy}
                    sortDir={sortDir}
                    onSortDirChange={setSortDir}
                    anonymize={anonymize}
                    onAnonymizeChange={setAnonymize}
                    onRun={() => void runQuery(1)}
                    onClear={handleClear}
                    running={loading}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div
            className="w-1.5 cursor-col-resize shrink-0 bg-transparent hover:bg-primary/20 active:bg-primary/30 transition-colors relative"
            onMouseDown={(e) => {
              e.preventDefault();
              resizing.current = true;
              const startX = e.clientX;
              const startWidth = filterWidth;

              function onMouseMove(ev: MouseEvent) {
                if (!resizing.current) return;
                const newWidth = Math.max(220, Math.min(500, startWidth + ev.clientX - startX));
                setFilterWidth(newWidth);
              }

              function onMouseUp() {
                resizing.current = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
              }

              document.addEventListener('mousemove', onMouseMove);
              document.addEventListener('mouseup', onMouseUp);
              document.body.style.cursor = 'col-resize';
              document.body.style.userSelect = 'none';
            }}
          />

          <Card className="flex flex-1 min-w-0 flex-col overflow-hidden rounded-l-none">
            <CardContent className="flex min-h-0 flex-1 flex-col p-0">
              <div className="border-b bg-slate-50 dark:bg-neutral-800/50 px-4 py-3">
                <h2 className="text-sm font-semibold text-primary">{t('dataQuery.resultsTitle', 'Results')}</h2>
                <p className="text-xs text-muted-foreground">
                  {t('dataQuery.resultsDesc', 'Matching members and export options')}
                </p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <ResultsPanel
                  dataSubject={dataSubject}
                  loading={loading}
                  hasRun={hasRun}
                  result={result}
                  columns={columns}
                  canExportIdentified={canExportIdentified}
                  isSuperAdmin={isSuperAdmin}
                  onSort={(col) => {
                    if (sortBy === col) {
                      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy(col);
                      setSortDir('asc');
                    }
                    void runQuery(1);
                  }}
                  onPageChange={(p) => void runQuery(p)}
                  onExport={handleExport}
                  exporting={exporting}
                />
              </div>
            </CardContent>
          </Card>

          {savedCollapsed ? (
            <div className="w-10 shrink-0">
              <Card className="flex flex-col h-full overflow-hidden p-0">
                <SavedQueriesPanel
                  mine={savedMine}
                  orgWide={savedOrg}
                  canSave={hasRun && Boolean(result)}
                  collapsed={savedCollapsed}
                  onToggleCollapse={() => setSavedCollapsed(!savedCollapsed)}
                  onSave={handleSaveQuery}
                  onRun={handleRunSaved}
                  onDelete={async (id) => {
                    await api.delete(`/data-query/saved/${id}`);
                    await loadSaved();
                    toast({ title: t('dataQuery.queryDeleted', 'Query deleted'), description: t('dataQuery.queryDeletedDesc', 'The saved query has been deleted.') });
                  }}
                  onUpdate={async (id, payload) => {
                    await api.put(`/data-query/saved/${id}`, payload);
                    await loadSaved();
                  }}
                />
              </Card>
            </div>
          ) : (
            <div className="w-60 shrink-0">
              <Card className="flex flex-col h-full overflow-hidden p-0">
                <SavedQueriesPanel
                  mine={savedMine}
                  orgWide={savedOrg}
                  canSave={hasRun && Boolean(result)}
                  collapsed={savedCollapsed}
                  onToggleCollapse={() => setSavedCollapsed(!savedCollapsed)}
                  onSave={handleSaveQuery}
                  onRun={handleRunSaved}
                  onDelete={async (id) => {
                    await api.delete(`/data-query/saved/${id}`);
                    await loadSaved();
                    toast({ title: t('dataQuery.queryDeleted', 'Query deleted'), description: t('dataQuery.queryDeletedDesc', 'The saved query has been deleted.') });
                  }}
                  onUpdate={async (id, payload) => {
                    await api.put(`/data-query/saved/${id}`, payload);
                    await loadSaved();
                  }}
                />
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
