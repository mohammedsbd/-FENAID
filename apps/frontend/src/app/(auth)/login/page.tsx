'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Cookies from 'js-cookie';
import Image from 'next/image';
import { Eye, EyeOff, Loader2, LogIn, User, Lock, Languages } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLocale } from '@/components/providers/locale-provider';
import api from '../../../lib/api';
import { useToast } from '@/hooks/use-toast';

const defaultLoginImageUrl =
  'https://images.unsplash.com/photo-1661956602116-aa6865609028?q=80&w=2086&auto=format&fit=crop';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t, locale, setLocale } = useLocale();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const loginSchema = z.object({
    email: z.string().email(t('auth.login.emailError', 'Please enter a valid email address')),
    password: z.string().min(1, t('auth.login.passwordRequired', 'Password is required')),
  });

  type LoginFormValues = z.infer<typeof loginSchema>;

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

      // Set secure cookies
      const cookieOptions = {
        expires: rememberMe ? 7 : 1,
        path: '/',
        secure: true,
        sameSite: 'strict' as const,
      };
      Cookies.set('token', accessToken, { ...cookieOptions, httpOnly: false });
      Cookies.set('user', JSON.stringify(user), { ...cookieOptions, httpOnly: false });

      toast({
        title: t('auth.login.loginSuccessful', 'Login Successful'),
        description: t('auth.login.welcomeBack', 'Welcome back, {name}', { name: user.fullName }),
      });

      if (mustChangePassword) {
        router.push('/change-password');
      } else {
        window.location.href = '/dashboard';
      }
    } catch (error: any) {
      let message = t('auth.login.invalidCredentials', 'Invalid email or password');
      if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.code === 'ERR_NETWORK') {
        message = t('auth.login.networkError', 'Network error: Cannot reach server');
      }
      toast({
        variant: 'destructive',
        title: t('auth.login.loginFailed', 'Login Failed'),
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLanguageChange = (value: string) => {
    setLocale(value as 'en' | 'am' | 'om');
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Left Side — Full-Size Background Image with Branding */}
      <div className="hidden lg:relative lg:block lg:w-1/2">
        <img
          src={defaultLoginImageUrl}
          alt="Fikir login background"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/25 to-transparent" />

        <div className="absolute inset-0 flex flex-col items-center justify-between py-16 px-10">
          {/* Top — Logo & Organization Name */}
          <div className="flex flex-col items-center gap-5 text-white">
            <div className="relative h-24 w-24 overflow-hidden rounded-2xl bg-white/15 backdrop-blur-md ring-1 ring-white/20">
              <Image
                src="/fikirlogo.jpg"
                alt="Fikir logo"
                fill
                sizes="96px"
                className="object-cover opacity-90"
              />
            </div>
            <h1 className="text-center text-3xl font-bold tracking-tight">
              {t('auth.login.orgName', 'Ethiopia National Association on Intellectual Disability')}
            </h1>
            <p className="max-w-sm text-center text-base text-white/70">
              {t('auth.login.tagline', 'Empowering Lives, Enabling Futures')}
            </p>
          </div>

          {/* Bottom — Mission Statement */}
          <div className="max-w-md text-center">
            <p className="text-lg font-light leading-relaxed text-white/80 italic">
              &ldquo;{t('auth.login.mission', 'Together we create an inclusive society where every person with intellectual disability can thrive with dignity.')}&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* Right Side — Login Form */}
      <div className="relative flex w-full items-center justify-center bg-white p-8 lg:w-1/2">
        {/* Top Right — Language Selector */}
        <div className="absolute right-6 top-6">
          <Select value={locale} onValueChange={handleLanguageChange}>
            <SelectTrigger
              aria-label={t('auth.login.selectLanguage', 'Select language')}
              className="h-10 w-[130px] rounded-full border border-gray-200 bg-white/90 shadow-sm hover:bg-white"
            >
              <Languages className="mr-2 h-4 w-4 text-primary" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="am">አማርኛ</SelectItem>
              <SelectItem value="om">Afaan Oromoo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-full max-w-sm space-y-8">
          {/* Mobile Logo (visible only on small screens) */}
          <div className="flex flex-col items-center gap-3 lg:hidden">
            <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-primary/10">
              <Image
                src="/fikirlogo.jpg"
                alt="Fikir logo"
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>
            <p className="text-center text-xs font-semibold text-primary">
              {t('auth.login.orgName', 'Ethiopia National Association on Intellectual Disability')}
            </p>
          </div>

          {/* Header */}
          <div className="space-y-1.5">
            <h2 className="text-3xl font-semibold tracking-tight text-gray-900">
              {t('auth.login.welcome', 'Welcome back')}
            </h2>
            <p className="text-gray-500">
              {t('auth.login.signInPrompt', 'Sign in to your account to continue')}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                {t('auth.login.emailLabel', 'Email Address')}
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder={t('auth.login.emailPlaceholder', 'name@fikir.org')}
                  {...register('email')}
                  className={`h-12 w-full border-gray-200 bg-gray-50 pl-10 text-gray-900 transition-colors focus:bg-white focus:ring-2 focus:ring-primary/20 ${errors.email ? 'border-red-400' : ''}`}
                  disabled={isLoading}
                />
                <User className="absolute left-3.5 top-3.5 h-5 w-5 text-gray-400" />
              </div>
              {errors.email && (
                <p className="text-xs font-medium text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                {t('auth.login.passwordLabel', 'Password')}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('auth.login.passwordPlaceholder', '••••••••')}
                  {...register('password')}
                  className={`h-12 w-full border-gray-200 bg-gray-50 pl-10 pr-10 text-gray-900 transition-colors focus:bg-white focus:ring-2 focus:ring-primary/20 ${errors.password ? 'border-red-400' : ''}`}
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
              {errors.password && (
                <p className="text-xs font-medium text-red-500">{errors.password.message}</p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  className="border-gray-300"
                  disabled={isLoading}
                />
                <span className="text-sm font-normal text-gray-600">
                  {t('auth.login.rememberMe', 'Remember me')}
                </span>
              </label>
              <button
                type="button"
                className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                onClick={() => router.push('/forgot-password')}
              >
                {t('auth.login.forgotPassword', 'Forgot password?')}
              </button>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isLoading}
              className="h-12 w-full bg-primary text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/25 active:bg-primary/80"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {t('auth.login.loggingIn', 'Logging in...')}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  {t('auth.login.loginButton', 'Login')}
                </span>
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400">
            {t('auth.login.footer', '© 2026 FIKIR Ethiopia. All rights reserved.')}
          </p>
        </div>
      </div>
    </div>
  );
}
