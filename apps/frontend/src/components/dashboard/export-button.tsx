import { useEffect, useRef, useState } from 'react';
import { ChevronDown, FileDown, FileSpreadsheet, FileText, Image, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ExportFormat = 'pdf' | 'csv' | 'excel' | 'docx';

interface ExportButtonProps {
  onExport: (format: ExportFormat) => void;
  loading?: boolean;
  className?: string;
}

export function ExportButton({ onExport, loading = false, className }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const options = [
    {
      format: 'pdf' as ExportFormat,
      label: 'Export to PDF',
      description: 'Printable document layout',
      icon: Printer,
      colorClass: 'text-rose-500 bg-rose-50',
    },
    {
      format: 'csv' as ExportFormat,
      label: 'Export to CSV',
      description: 'Comma separated data table',
      icon: FileText,
      colorClass: 'text-amber-500 bg-amber-50',
    },
    {
      format: 'excel' as ExportFormat,
      label: 'Export to Excel',
      description: 'Rich styled XLS spreadsheet',
      icon: FileSpreadsheet,
      colorClass: 'text-emerald-600 bg-emerald-50',
    },
    {
      format: 'docx' as ExportFormat,
      label: 'Export to Word',
      description: 'Word-compatible DOC format',
      icon: FileText,
      colorClass: 'text-blue-500 bg-blue-50',
    },
  ];

  return (
    <div className={cn('relative inline-block text-left', className)} ref={dropdownRef}>
      <Button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="flex items-center gap-2 shadow-sm"
      >
        <FileDown className="h-4 w-4" />
        <span>{loading ? 'Exporting...' : 'Export'}</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")} />
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 origin-top-right rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Choose Export Format
          </div>
          <div className="space-y-0.5">
            {options.map((opt) => (
              <button
                key={opt.format}
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onExport(opt.format);
                }}
                className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50"
              >
                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", opt.colorClass)}>
                  <opt.icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-slate-800">{opt.label}</div>
                  <div className="text-[11px] text-slate-400 font-medium">{opt.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
