export interface UserSession {
  id: string;
  fullName: string;
  email?: string;
  role: string;
  phone?: string;
  photoUrl?: string;
  mustChangePassword?: boolean;
}

export function getSession(): UserSession | null {
  try {
    const raw = document.cookie.split('; ').find((c) => c.startsWith('session='));
    if (!raw) return null;
    return JSON.parse(decodeURIComponent(raw.slice(8)));
  } catch {
    return null;
  }
}

export async function fetchSession(): Promise<UserSession | null> {
  try {
    const { default: api } = await import('./api');
    const res = await api.get('/auth/me');
    return res.data;
  } catch {
    return null;
  }
}

export function logout() {
  const { default: api } = require('./api');
  api.post('/auth/logout').catch(() => {});
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}
