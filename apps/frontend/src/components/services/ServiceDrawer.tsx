'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [targetType, setTargetType] = useState<'PARENT' | 'CHILD'>('PARENT');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [nameError, setNameError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (service) {
      setName(service.name);
      setCategory(service.category);
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
    setCategory('');
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
    if (!category.trim()) {
      toast({ title: t('common.error', 'Error'), description: t('services.catalog.categoryRequired', 'Category is required'), variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      if (isEdit && service) {
        await updateService(service.id, {
          name: name.trim(),
          category: category.trim(),
          description: description.trim() || null,
          targetType,
          isActive,
        });
      } else {
        await createService({
          name: name.trim(),
          category: category.trim(),
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

  const filteredSuggestions = suggestions.filter(
    (s) => s.toLowerCase().includes(category.toLowerCase()) && s !== category
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

          <div className="space-y-2 relative">
            <Label htmlFor="service-category">{t('services.catalog.category', 'Category')} *</Label>
            <Input
              id="service-category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder={t('services.catalog.categoryPlaceholder', 'e.g. Therapy, Education, Nutrition')}
            />
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-40 overflow-y-auto">
                {filteredSuggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors"
                    onMouseDown={() => {
                      setCategory(s);
                      setShowSuggestions(false);
                    }}
                  >
                    {s}
                  </button>
                ))}
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
                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                    : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800'
                )}                >
                {t('services.catalog.forParents', 'For Parents')}
              </button>
              <button
                type="button"
                onClick={() => setTargetType('CHILD')}
                className={cn(
                  'flex-1 rounded-md border px-4 py-2 text-sm font-medium transition-colors',
                  targetType === 'CHILD'
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800'
                )}                >
                {t('services.catalog.forChildren', 'For Children')}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="service-desc">{t('services.catalog.description', 'Description')} ({t('common.optional', 'Optional')})</Label>
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
