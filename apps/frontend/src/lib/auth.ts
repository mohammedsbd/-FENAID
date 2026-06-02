import Cookies from 'js-cookie';

export interface UserSession {
  id: string;
  fullName: string;
  email: string;
  role: string;
  mustChangePassword: boolean;
}

export function getSession(): UserSession | null {
  const user = Cookies.get('user');
  if (!user) return null;
  try {
    return JSON.parse(user);
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!Cookies.get('token');
}

export function logout() {
  Cookies.remove('token');
  Cookies.remove('user');
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}
