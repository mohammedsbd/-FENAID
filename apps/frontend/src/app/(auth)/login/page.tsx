'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Cookies from 'js-cookie';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '../../../lib/api';
import { useToast } from '@/hooks/use-toast';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Clear any existing stale auth data when arriving at login page
  useState(() => {
    if (typeof window !== 'undefined') {
      Cookies.remove('token', { path: '/' });
      Cookies.remove('user', { path: '/' });
      localStorage.removeItem('user');
    }
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', data);
      const { accessToken, user, mustChangePassword } = response.data;

      // Ensure fresh state by clearing old data first
      Cookies.remove('token');
      Cookies.remove('user');
      localStorage.removeItem('user');

      // Set cookies (standardize expiry to 1 day)
      Cookies.set('token', accessToken, { expires: 1, path: '/' });
      Cookies.set('user', JSON.stringify(user), { expires: 1, path: '/' });
      
      // Also sync to localStorage for redundancy (used in some components)
      localStorage.setItem('user', JSON.stringify(user));

      toast({
        title: 'Login Successful',
        description: `Welcome back, ${user.fullName}`,
      });

      if (mustChangePassword) {
        router.push('/change-password');
      } else {
        // Use window.location for a hard reload to ensure all contexts/layouts refresh with new user data
        window.location.href = '/dashboard';
      }
    } catch (error: any) {
      console.error('Login error:', error);
      let message = 'Invalid email or password';
      
      if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.code === 'ERR_NETWORK') {
        message = 'Network error: Cannot reach server';
      }

      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: message,
      });
      // Data is retained in form automatically by react-hook-form as long as we don't call reset()
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@fikir.org"
            {...register('email')}
            className={errors.email ? 'border-destructive' : ''}
            disabled={isLoading}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              {...register('password')}
              className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Logging in...
            </>
          ) : (
            'Login'
          )}
        </Button>
      </form>
      
      <div className="mt-6 text-center text-xs text-muted-foreground">
        <p>Empowering Lives, Enabling Futures</p>
      </div>
    </div>
  );
}
