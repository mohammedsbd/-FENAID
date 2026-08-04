'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Upload, Loader2, FileText, FileSpreadsheet, Image as ImageIcon, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/components/providers/locale-provider';

interface DocumentUploadDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  parentId?: string;
  childId?: string;
}

export function DocumentUploadDrawer({ open, onClose, onSuccess, parentId, childId }: DocumentUploadDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { t } = useLocale();

  useEffect(() => {
    if (open) {
      setMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
    } else {
      setVisible(false);
      const timer = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setTitle('');
      setCategory('');
      setFile(null);
    }
  }, [open]);

  const handleFileChange = (selectedFile: File | null) => {
    setFile(selectedFile);
    if (selectedFile && !title.trim()) {
      const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, '');
      const formattedTitle = nameWithoutExt.replace(/[-_]/g, ' ');
      setTitle(formattedTitle);
    }
  };

  const getFileIcon = (fileName?: string) => {
    if (!fileName) return <FileText className="h-8 w-8 text-primary" />;
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['xls', 'xlsx', 'csv', 'ods'].includes(ext || '')) {
      return <FileSpreadsheet className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />;
    }
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
      return <ImageIcon className="h-8 w-8 text-purple-600 dark:text-purple-400" />;
    }
    if (['pdf'].includes(ext || '')) {
      return <FileText className="h-8 w-8 text-red-600 dark:text-red-400" />;
    }
    if (['doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext || '')) {
      return <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />;
    }
    return <File className="h-8 w-8 text-slate-600 dark:text-slate-400" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast({ title: t('documentUpload.error', 'Error'), description: t('documentUpload.selectFile', 'Please select a file to upload.'), variant: 'destructive' });
      return;
    }
    if (!title.trim()) {
      toast({ title: t('documentUpload.error', 'Error'), description: t('documentUpload.enterTitle', 'Please enter a document title.'), variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title.trim());
      formData.append('name', title.trim());
      if (category) formData.append('category', category);
      if (parentId) formData.append('parentId', parentId);
      if (childId) formData.append('childId', childId);

      await api.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast({ title: t('documentUpload.success', 'Success'), description: t('documentUpload.uploaded', 'Document uploaded successfully.') });
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || t('documentUpload.uploadFailed', 'Failed to upload document.');
      toast({ title: t('documentUpload.error', 'Error'), description: msg, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  }

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 !mt-0">
      <div className={`fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ease-out ${visible ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <div className={`fixed inset-y-0 right-0 w-full max-w-lg bg-background shadow-xl flex flex-col transition-transform duration-300 ease-out ${visible ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{t('documentUpload.title', 'Upload Document')}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-2">
            <Label>{t('documentUpload.file', 'File')} *</Label>
            <div
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 cursor-pointer hover:bg-muted/50 transition-colors"
            >
              {file ? (
                <div className="flex items-center gap-3">
                  {getFileIcon(file.name)}
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setFile(null); }}>{t('documentUpload.remove', 'Remove')}</Button>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">{t('documentUpload.clickToUpload', 'Click to select file')}</p>
                  <p className="text-xs text-muted-foreground mt-1 text-center">
                    {t('documentUpload.supportedFormats', 'PDF, Word (doc, docx), Excel (xls, xlsx, csv), Text, Images, and more')}
                  </p>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc-title">{t('documentUpload.title', 'Document Title')} *</Label>
            <Input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('documentUpload.titlePlaceholder', 'e.g. Medical Report')} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc-category">{t('documentUpload.category', 'Category')}</Label>
            <select
              id="doc-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">{t('documentUpload.selectCategory', '-- Select Category --')}</option>
              {['MEDICAL', 'EDUCATION', 'IDENTITY', 'FINANCIAL', 'LEGAL', 'OTHER'].map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </form>

        <div className="p-4 border-t flex space-x-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>{t('common.cancel', 'Cancel')}</Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={uploading || !file || !title.trim()}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
            {uploading ? t('documentUpload.uploading', 'Uploading...') : t('documentUpload.upload', 'Upload')}
          </Button>
        </div>
      </div>
    </div>
  );
}
