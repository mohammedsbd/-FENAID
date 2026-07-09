'use client';

import type { DataQueryFilters } from '@fikir/types';
import { formatDistanceToNow } from 'date-fns';
import { ChevronLeft, ChevronRight, Pencil, Play, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useLocale } from '@/components/providers/locale-provider';
import { cn } from '@/lib/utils';

export interface SavedQueryItem {
  id: string;
  name: string;
  description?: string | null;
  filters: DataQueryFilters;
  columns: string[];
  dataSubject: string;
  sortBy?: string | null;
  sortDir?: string | null;
  lastRunAt?: string | null;
  lastRunCount?: number | null;
  isOrgWide: boolean;
}

interface SavedQueriesPanelProps {
  mine: SavedQueryItem[];
  orgWide: SavedQueryItem[];
  canSave: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSave: (payload: {
    name: string;
    description?: string;
    isOrgWide: boolean;
  }) => Promise<void>;
  onRun: (query: SavedQueryItem) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, payload: { name: string; description?: string }) => Promise<void>;
}

export function SavedQueriesPanel({
  mine,
  orgWide,
  canSave,
  collapsed,
  onToggleCollapse,
  onSave,
  onRun,
  onDelete,
  onUpdate,
}: SavedQueriesPanelProps) {
  const { t } = useLocale();
  const [tab, setTab] = useState<'mine' | 'org'>('mine');
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isOrgWide, setIsOrgWide] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const list = tab === 'mine' ? mine : orgWide.filter((q) => q.isOrgWide);

  if (collapsed) {
    return (
      <div className="flex h-full min-h-[640px] flex-col items-center justify-start py-3">
        <Button size="icon" variant="ghost" onClick={onToggleCollapse} title={t('savedQueries.expand', 'Expand saved queries')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full min-h-[640px] flex-col">
        <div className="flex items-center justify-between border-b bg-slate-50 dark:bg-neutral-800/50 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-primary">
              {t('dataQuery.savedQueries', 'Saved Queries')}
            </h3>
            <p className="text-xs text-muted-foreground">{t('savedQueries.subtitle', 'Reusable query templates')}</p>
          </div>
          <Button size="icon" variant="ghost" onClick={onToggleCollapse} title={t('savedQueries.collapse', 'Collapse panel')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-3">
          <Button
            className="w-full"
            size="sm"
            disabled={!canSave}
            onClick={() => setShowModal(true)}
          >
            {t('dataQuery.saveQuery', 'Save This Query')}
          </Button>
        </div>

        <div className="flex border-b px-3">
          <button
            type="button"
            className={cn(
              'flex-1 border-b-2 py-2 text-xs font-medium transition-colors',
              tab === 'mine'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setTab('mine')}
          >
            {t('savedQueries.mine', 'Mine')}
          </button>
          <button
            type="button"
            className={cn(
              'flex-1 border-b-2 py-2 text-xs font-medium transition-colors',
              tab === 'org'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setTab('org')}
          >
            {t('savedQueries.org', 'Org')}
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {list.length === 0 && (
            <p className="py-8 text-center text-xs text-muted-foreground">
              {t('savedQueries.empty', 'No saved queries yet')}
            </p>
          )}
          {list.map((query) => (
            <div
              key={query.id}
              className="group rounded-md border bg-white dark:bg-neutral-950 p-3 shadow-sm transition hover:border-primary/30 hover:bg-slate-50 dark:hover:bg-neutral-800"
            >
              {editingId === query.id ? (
                <div className="space-y-2">
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('savedQueries.descriptionPlaceholder', 'Description')}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={async () => {
                        await onUpdate(query.id, { name, description });
                        setEditingId(null);
                      }}
                    >
                      {t('savedQueries.save', 'Save')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      {t('savedQueries.cancel', 'Cancel')}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="line-clamp-2 text-sm font-semibold">{query.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {query.lastRunAt
                      ? formatDistanceToNow(new Date(query.lastRunAt), { addSuffix: true })
                      : t('savedQueries.neverRun', 'Never run')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {query.lastRunCount != null ? `${query.lastRunCount} ${t('savedQueries.results', 'results')}` : '—'}
                  </p>
                  <div className="mt-2 flex gap-1 opacity-100 lg:opacity-0 lg:transition lg:group-hover:opacity-100">
                    <Button size="icon" variant="ghost" onClick={() => onRun(query)} title={t('savedQueries.run', 'Run')}>
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(query.id);
                        setName(query.name);
                        setDescription(query.description ?? '');
                      }}
                      title={t('savedQueries.edit', 'Edit')}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(t('savedQueries.confirmDelete', 'Delete this saved query?'))) onDelete(query.id);
                      }}
                      title={t('savedQueries.delete', 'Delete')}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border bg-white dark:bg-neutral-900 dark:border-neutral-700 p-5 shadow-xl">
            <h3 className="mb-1 text-lg font-semibold text-primary">{t('savedQueries.saveQueryTitle', 'Save Query')}</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {t('savedQueries.saveQueryDesc', 'Store the current filters and columns for quick reuse.')}
            </p>
            <div className="space-y-3">
              <div>
                <Label>{t('savedQueries.name', 'Name')}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label>{t('savedQueries.description', 'Description')}</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={isOrgWide} onCheckedChange={(c) => setIsOrgWide(Boolean(c))} />
                {t('savedQueries.shareWithOrg', 'Share with organization')}
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowModal(false)}>
                {t('savedQueries.cancel', 'Cancel')}
              </Button>
              <Button
                disabled={!name.trim() || saving}
                onClick={async () => {
                  setSaving(true);
                  try {
                    await onSave({ name, description, isOrgWide });
                    setShowModal(false);
                    setName('');
                    setDescription('');
                    setIsOrgWide(false);
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {t('savedQueries.save', 'Save')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
