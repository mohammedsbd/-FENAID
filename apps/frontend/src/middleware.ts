import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_ROUTES = ['/dashboard', '/data-query'];

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));

  if (isProtected) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3101';
      const res = await fetch(`${apiUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('token');
        response.cookies.delete('user');
        return response;
      }
    } catch {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('token');
      response.cookies.delete('user');
      return response;
    }
  }

  if ((pathname === '/login' || pathname === '/') && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
