import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AccountManagementClient } from '@/components/dashboard/account-management-client';

type SessionCookie = {
  id: string;
  fullName: string;
  role: string;
  email?: string;
};

// The backend writes this on login as a non-httpOnly `session` cookie so the
// server components can read the role without another round trip.
function readSession(raw: string): SessionCookie | null {
  for (const candidate of [raw, safeDecode(raw)]) {
    try {
      return JSON.parse(candidate) as SessionCookie;
    } catch {
      // try the next form
    }
  }
  return null;
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default function AccountsPage() {
  const sessionCookie = cookies().get('session')?.value;
  if (!sessionCookie) {
    redirect('/login');
  }

  const user = readSession(sessionCookie);
  if (!user) {
    redirect('/login');
  }
  if (user.role !== 'SUPER_ADMIN') {
    redirect('/dashboard');
  }

  return <AccountManagementClient currentUser={user} />;
}
