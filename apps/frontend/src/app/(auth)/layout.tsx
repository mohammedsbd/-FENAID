import type { ReactNode } from 'react';
import Image from 'next/image';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="relative h-28 w-28 overflow-hidden rounded-full border-2 border-primary bg-slate-200">
            <Image
              src="/fikirlogo.jpg"
              alt="Fikir logo"
              fill
              sizes="112px"
              className="object-cover"
              priority
            />
          </div>
          <p className="text-center text-xs font-semibold leading-tight text-primary">
            Ethiopia National Association on Intellectual Disability
          </p>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
