'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/components/providers/locale-provider';
import { createService, updateService, getServices, type ServiceDto as SvcDto } from '@/lib/services-api';
import { cn } from '@/lib/utils';

interface ServiceDrawerProps {
  open: boolean;
  service: SvcDto | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ServiceDrawer({ open, service, onClose, onSaved }: ServiceDrawerProps) {
  const { t } = useLocale();
  const { toast } = useToast();
  const isEdit = !!service;
  const [name, setName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [description, setDescription] = useState('');
  const [targetType, setTargetType] = useState<'PARENT' | 'CHILD' | 'ALL'>('PARENT');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [nameError, setNameError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (service) {
      setName(service.name);
      const defaultOptions = ['Therapy & Rehabilitation', 'Education & Skill Development', 'Health & Counseling', 'Nutrition & Support', 'Family & Social Support'];
      if (suggestions.includes(service.category) || defaultOptions.includes(service.category)) {
        setSelectedCategory(service.category);
        setCustomCategory('');
      } else {
        setSelectedCategory('OTHER');
        setCustomCategory(service.category);
      }
      setDescription(service.description ?? '');
      setTargetType(service.targetType);
      setIsActive(service.isActive);
    } else {
      resetForm();
    }
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchCategories();
    }
  }, [service, open]);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
        });
      });
      return () => cancelAnimationFrame(frame);
    } else {
      setVisible(false);
      const timer = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  function resetForm() {
    setName('');
    setSelectedCategory('');
    setCustomCategory('');
    setDescription('');
    setTargetType('PARENT');
    setIsActive(true);
    setNameError('');
  }

  async function fetchCategories() {
    try {
      const allSvcs = await getServices({ isActive: undefined });
      const cats = [...new Set(allSvcs.map((s: SvcDto) => s.category))];
      setSuggestions(cats);
    } catch {
      // ignore
    }
  }

  async function checkNameUnique(val: string) {
    if (!val || isEdit) return;
    try {
      const svcList: SvcDto[] = await getServices({ search: val });
      let found = false;
      for (let i = 0; i < svcList.length; i++) {
        if (svcList[i].name.toLowerCase() === val.toLowerCase()) {
          found = true;
          break;
        }
      }
      setNameError(found ? t('services.catalog.duplicateName', 'A service with this name already exists') : '');
    } catch {
      // ignore
    }
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setNameError(t('services.catalog.nameRequired', 'Service name is required'));
      return;
    }
    const finalCategory = selectedCategory === 'OTHER' ? (customCategory.trim() || 'Other') : selectedCategory.trim();
    if (!selectedCategory) {
      toast({ title: t('common.error', 'Error'), description: t('services.catalog.categoryRequired', 'Category is required'), variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      if (isEdit && service) {
        await updateService(service.id, {
          name: name.trim(),
          category: finalCategory,
          description: description.trim() || null,
          targetType,
          isActive,
        });
      } else {
        await createService({
          name: name.trim(),
          category: finalCategory,
          description: description.trim() || null,
          targetType,
          isActive,
        });
      }
      toast({
        title: isEdit ? t('services.catalog.updated', 'Service updated') : t('services.catalog.created', 'Service created'),
        description: isEdit
          ? t('services.catalog.updatedDesc', '"{name}" has been updated successfully.', { name: name.trim() })
          : t('services.catalog.createdDesc', '"{name}" has been created successfully.', { name: name.trim() }),
      });
      onSaved();
    } catch (err: any) {
      const msg = err?.response?.data?.message || t('services.error.save', 'Failed to save service');
      toast({ title: t('common.error', 'Error'), description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  if (!mounted) return null;

  const allCategoryOptions = Array.from(
    new Set([
      ...suggestions,
      'Therapy & Rehabilitation',
      'Education & Skill Development',
      'Health & Counseling',
      'Nutrition & Support',
      'Family & Social Support',
    ])
  );

  return (
    <div className="fixed inset-0 z-50 !mt-0">
      <div className={`fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ease-out ${
        visible ? 'opacity-100' : 'opacity-0'
      }`} onClick={onClose} />
      <div className={`fixed inset-y-0 right-0 z-50 !mt-0 w-full max-w-2xl bg-white dark:bg-neutral-900 shadow-xl flex flex-col transition-transform duration-300 ease-out ${
        visible ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">
            {isEdit ? t('services.catalog.edit', 'Edit Service') : t('services.catalog.add', 'Add Service')}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="service-name">{t('services.catalog.name', 'Name')} *</Label>
            <Input
              id="service-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError('');
              }}
              onBlur={() => checkNameUnique(name)}
              placeholder={t('services.catalog.namePlaceholder', 'e.g. Physical Therapy')}
              className={nameError ? 'border-red-500' : ''}
            />
            {nameError && (
              <p className="text-xs text-red-500">{nameError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="service-category">{t('services.catalog.category', 'Category')} *</Label>
            <select
              id="service-category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">{t('services.catalog.selectCategory', '-- Select Category --')}</option>
              {allCategoryOptions.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
              <option value="OTHER">{t('common.other', 'Other (Specify Custom Category)')}</option>
            </select>

            {selectedCategory === 'OTHER' && (
              <div className="space-y-2 mt-3">
                <Label className="text-xs font-semibold text-muted-foreground">{t('services.catalog.customCategoryLabel', 'Custom Category Name')} {t('common.optional', '(Optional)')}</Label>
                <Input
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder={t('services.catalog.customCategoryPlaceholder', 'e.g. Vocational Training, Special Advocacy... (Leave empty for "Other")')}
                  className="h-10 border-input focus-visible:ring-primary"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t('services.catalog.targetType', 'Target Type')} *</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTargetType('PARENT')}
                className={cn(
                  'flex-1 rounded-md border px-4 py-2 text-sm font-medium transition-colors',
                  targetType === 'PARENT'
                    ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300 font-semibold'
                    : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800'
                )}
              >
                {t('services.catalog.forParents', 'For Parents')}
              </button>
              <button
                type="button"
                onClick={() => setTargetType('CHILD')}
                className={cn(
                  'flex-1 rounded-md border px-4 py-2 text-sm font-medium transition-colors',
                  targetType === 'CHILD'
                    ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300 font-semibold'
                    : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800'
                )}
              >
                {t('services.catalog.forChildren', 'For Children')}
              </button>
              <button
                type="button"
                onClick={() => setTargetType('ALL')}
                className={cn(
                  'flex-1 rounded-md border px-4 py-2 text-sm font-medium transition-all shadow-sm',
                  targetType === 'ALL'
                    ? 'bg-emerald-600 border-emerald-700 text-white dark:bg-emerald-600 dark:border-emerald-500 font-semibold ring-2 ring-emerald-400/50'
                    : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-neutral-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-neutral-800'
                )}
              >
                {t('services.catalog.forAll', 'For All')}
              </button>
            </div>
            {targetType === 'ALL' && (
              <div className="mt-2 flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800">
                <Badge className="bg-emerald-600 text-white font-semibold text-[11px] px-2 py-0.5 rounded">
                  {t('services.catalog.tagForAll', 'Tag: For All')}
                </Badge>
                <span className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                  {t('services.catalog.tagForAllDesc', 'This service is marked for all beneficiaries (parents, children, and families).')}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="service-desc">{t('services.catalog.description', 'Description')} {t('common.optional', '(Optional)')}</Label>
            <textarea
              id="service-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('services.catalog.descPlaceholder', 'Describe this service...')}
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">{t('services.catalog.active', 'Active')}</Label>
              <p className="text-xs text-muted-foreground">{t('services.catalog.inactiveDesc', 'Inactive services cannot be assigned')}</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>

        <div className="border-t px-6 py-4 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose}>{t('services.catalog.cancel', 'Cancel')}</Button>
          <Button onClick={handleSubmit} disabled={saving || !!nameError}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? t('services.catalog.save', 'Save Changes') : t('services.catalog.create', 'Create Service')}
          </Button>
        </div>
      </div>
    </div>
  );
}
