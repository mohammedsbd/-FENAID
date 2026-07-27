'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Loader2, Mail, CheckCircle } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLocale } from '@/components/providers/locale-provider';
import api from '../../../lib/api';
import { useToast } from '@/hooks/use-toast';

const forgotSchema = z.object({
  email: z.string().email(),
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const { t } = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotFormValues) => {
    setIsLoading(true);
    try {
      await api.post('/auth/forgot-password', data);
      setSent(true);
    } catch {
      toast({
        variant: 'destructive',
        title: t('auth.forgotPassword.error'),
        description: t('auth.forgotPassword.errorDescription'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-neutral-950">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1.5 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-neutral-100">
            {t('auth.forgotPassword.title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400">
            {sent
              ? t('auth.forgotPassword.sentTitle')
              : t('auth.forgotPassword.description')}
          </p>
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <p className="text-center text-sm text-gray-600 dark:text-neutral-400">
              {t('auth.forgotPassword.sentDescription')}
            </p>
            <Button variant="outline" asChild className="mt-2">
              <Link href="/login">{t('auth.forgotPassword.backToLogin')}</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.forgotPassword.emailLabel')}</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder={t('auth.forgotPassword.emailPlaceholder')}
                  {...register('email')}
                  className={`h-12 w-full pl-10 ${errors.email ? 'border-red-400' : ''}`}
                  disabled={isLoading}
                />
                <Mail className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-400" />
              </div>
              {errors.email && (
                <p className="text-xs font-medium text-red-500">{t('auth.forgotPassword.emailError')}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="h-12 w-full"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {t('auth.forgotPassword.sending')}
                </span>
              ) : (
                t('auth.forgotPassword.sendButton')
              )}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-gray-500 dark:text-neutral-400">
          <Link href="/login" className="inline-flex items-center gap-1 text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" />
            {t('auth.forgotPassword.backToLogin')}
          </Link>
        </p>
      </div>
    </div>
  );
}
