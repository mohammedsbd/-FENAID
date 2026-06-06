'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Cookies from 'js-cookie';
import { Loader2, CheckCircle2, Circle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '../../../lib/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '../../../lib/utils';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export default function ChangePasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
  });

  const newPassword = watch('newPassword', '');

  const passwordRequirements = useMemo(() => [
    { label: 'At least 8 characters', met: newPassword.length >= 8 },
    { label: 'At least one uppercase letter', met: /[A-Z]/.test(newPassword) },
    { label: 'At least one lowercase letter', met: /[a-z]/.test(newPassword) },
    { label: 'At least one number', met: /[0-9]/.test(newPassword) },
  ], [newPassword]);

  const strength = useMemo(() => {
    const metCount = passwordRequirements.filter(req => req.met).length;
    if (metCount === 0) return { label: 'None', color: 'bg-slate-200', width: '0%' };
    if (metCount <= 2) return { label: 'Weak', color: 'bg-destructive', width: '33%' };
    if (metCount === 3) return { label: 'Fair', color: 'bg-amber-500', width: '66%' };
    return { label: 'Strong', color: 'bg-emerald-500', width: '100%' };
  }, [passwordRequirements]);

  const onSubmit = async (data: ChangePasswordFormValues) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      });

      const { user } = response.data;
      
      // Update local user cookie with root path
      Cookies.set('user', JSON.stringify(user), { expires: 7, path: '/' });

      toast({
        title: 'Password Updated',
        description: 'Your password has been successfully changed.',
      });
      
      // Use hard reload to ensure all layouts/sidebar refresh with new state
      window.location.href = '/dashboard';
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update password',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Welcome to Fikir</h2>
        <p className="text-sm text-muted-foreground">Please set your new password to continue.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="currentPassword">Current Password</Label>
          <Input
            id="currentPassword"
            type="password"
            {...register('currentPassword')}
            className={errors.currentPassword ? 'border-destructive' : ''}
            disabled={isLoading}
          />
          {errors.currentPassword && (
            <p className="text-xs text-destructive">{errors.currentPassword.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="newPassword">New Password</Label>
          <Input
            id="newPassword"
            type="password"
            {...register('newPassword')}
            className={errors.newPassword ? 'border-destructive' : ''}
            disabled={isLoading}
          />
          
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-[10px] uppercase font-bold text-muted-foreground">
              <span>Strength: {strength.label}</span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100">
              <div 
                className={cn("h-full transition-all duration-300", strength.color)} 
                style={{ width: strength.width }}
              />
            </div>
          </div>

          <div className="mt-3 space-y-1.5">
            {passwordRequirements.map((req, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                {req.met ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Circle className="h-3.5 w-3.5 text-slate-300" />
                )}
                <span className={req.met ? 'text-foreground' : 'text-muted-foreground'}>
                  {req.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            {...register('confirmPassword')}
            className={errors.confirmPassword ? 'border-destructive' : ''}
            disabled={isLoading}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            'Set New Password'
          )}
        </Button>
      </form>
    </div>
  );
}
