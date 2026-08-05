'use client';

import { Pencil, Users, Baby } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useLocale } from '@/components/providers/locale-provider';
import type { ServiceDto } from '@/lib/services-api';
import { cn } from '@/lib/utils';

interface ServiceCardProps {
  service: ServiceDto;
  isSuperAdmin: boolean;
  onEdit: (service: ServiceDto) => void;
  onToggleActive: (service: ServiceDto) => void;
}

export function ServiceCard({ service, isSuperAdmin, onEdit, onToggleActive }: ServiceCardProps) {
  const { t } = useLocale();
  const isForParents = service.targetType === 'PARENT';
  const isForAll = service.targetType === 'ALL';
  const stripColor = isForAll ? 'bg-emerald-500' : isForParents ? 'bg-amber-500' : 'bg-blue-500';

  return (
    <div className="relative">
      {!service.isActive && (
        <div className="absolute -right-2 -top-2 z-10">
          <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-300 text-[10px] px-2 py-0.5 rotate-12">
            {t('services.catalog.inactive', 'Inactive')}
          </Badge>
        </div>
      )}
      <Card
        className={cn(
          'overflow-hidden transition-all duration-200 hover:shadow-md',
          !service.isActive && 'opacity-60'
        )}
      >
        {/* Top color strip */}
        <div className={`h-1.5 ${stripColor}`} />

        <div className="p-4 space-y-3">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-[16px] leading-tight truncate">
                {service.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-[10px] px-2 py-0 bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-300 font-medium">
                  {t('services.catalog.categoryLabel', 'Category')}: {service.category}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] px-2 py-0 font-semibold',
                    isForAll
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                      : isForParents
                      ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                      : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                  )}
                >
                  {isForAll
                    ? t('services.catalog.forAll', 'For All')
                    : isForParents
                    ? t('services.catalog.forParents', 'For Parents')
                    : t('services.catalog.forChildren', 'For Children')}
                </Badge>
              </div>
            </div>
          </div>

          {/* Description */}
          {service.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {service.description}
            </p>
          )}

          {/* Bottom row */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-neutral-700">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {isForParents ? (
                <Users className="h-3.5 w-3.5" />
              ) : (
                <Baby className="h-3.5 w-3.5" />
              )}
              <span>{t('services.catalog.activeAssignments', '{count} active', { count: service.activeAssignmentCount ?? 0 })}</span>
            </div>

            {isSuperAdmin && (
              <div className="flex items-center gap-1">
                <Switch
                  checked={service.isActive}
                  onCheckedChange={() => onToggleActive(service)}
                  className="scale-75"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onEdit(service)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
