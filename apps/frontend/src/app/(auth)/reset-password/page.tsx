'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff, Loader2, Lock, CheckCircle } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLocale } from '@/components/providers/locale-provider';
import api from '../../../lib/api';
import { useToast } from '@/hooks/use-toast';

const resetSchema = z
  .object({
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: '',
    path: ['confirmPassword'],
  });

type ResetFormValues = z.infer<typeof resetSchema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { toast } = useToast();
  const { t } = useLocale();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const onSubmit = async (data: ResetFormValues) => {
    if (!token) return;
    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', { token, ...data });
      setDone(true);
      toast({
        title: t('auth.resetPassword.toastTitle'),
        description: t('auth.resetPassword.toastDescription'),
      });
    } catch (error: any) {
      const message = error.response?.data?.message;
      toast({
        variant: 'destructive',
        title: t('auth.forgotPassword.error'),
        description: message || t('auth.resetPassword.toastError'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-neutral-950">
        <div className="w-full max-w-sm text-center space-y-4">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-neutral-100">{t('auth.resetPassword.invalidTitle')}</h1>
          <p className="text-sm text-gray-500">{t('auth.resetPassword.invalidDescription')}</p>
          <Button variant="outline" asChild>
            <Link href="/forgot-password">{t('auth.resetPassword.requestNew')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-neutral-950">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1.5 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-neutral-100">
            {t('auth.resetPassword.title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400">
            {done ? t('auth.resetPassword.doneTitle') : t('auth.resetPassword.description')}
          </p>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <Button asChild>
              <Link href="/login">{t('auth.resetPassword.signInNewPassword')}</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="newPassword">{t('auth.resetPassword.newPasswordLabel')}</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('auth.resetPassword.passwordPlaceholder')}
                  {...register('newPassword')}
                  className={`h-12 w-full pl-10 pr-10 ${errors.newPassword ? 'border-red-400' : ''}`}
                  disabled={isLoading}
                />
                <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-0 flex h-full w-10 items-center justify-center text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.newPassword && (
                <p className="text-xs font-medium text-red-500">{t('auth.resetPassword.passwordMinLength')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('auth.resetPassword.confirmPasswordLabel')}</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('auth.resetPassword.passwordPlaceholder')}
                  {...register('confirmPassword')}
                  className={`h-12 w-full pl-10 ${errors.confirmPassword ? 'border-red-400' : ''}`}
                  disabled={isLoading}
                />
                <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-400" />
              </div>
              {errors.confirmPassword && (
                <p className="text-xs font-medium text-red-500">{t('auth.resetPassword.passwordsDontMatch')}</p>
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
                  {t('auth.resetPassword.resetting')}
                </span>
              ) : (
                t('auth.resetPassword.resetButton')
              )}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-gray-500 dark:text-neutral-400">
          <Link href="/login" className="text-primary hover:underline">
            {t('auth.resetPassword.backToLogin')}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
