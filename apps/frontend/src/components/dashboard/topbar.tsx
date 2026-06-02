'use client';

import { usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function Topbar() {
  const pathname = usePathname();

  // Helper to generate dynamic title from pathname
  const getPageTitle = () => {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length === 0) return 'Dashboard';
    
    const lastPart = parts[parts.length - 1];
    return lastPart.charAt(0).toUpperCase() + lastPart.slice(1).replace(/-/g, ' ');
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div className="flex flex-col">
        <h2 className="text-lg font-semibold tracking-tight">
          {getPageTitle()}
        </h2>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>Home</span>
          {pathname.split('/').filter(Boolean).map((part, i, arr) => (
            <span key={part} className="flex items-center gap-1">
              <span>/</span>
              <span className={i === arr.length - 1 ? 'font-medium text-foreground' : ''}>
                {part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ')}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <Badge className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent p-0 text-[10px] text-accent-foreground">
            3
          </Badge>
        </Button>
      </div>
    </header>
  );
}
