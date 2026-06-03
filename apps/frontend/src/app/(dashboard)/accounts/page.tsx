import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AccountManagementClient } from '@/components/dashboard/account-management-client';

export default function AccountsPage() {
  const cookieStore = cookies();
  const userCookie = cookieStore.get('user')?.value;
  if (!userCookie) {
    redirect('/login');
  }

  let user;
  try {
    user = JSON.parse(userCookie);
  } catch {
    redirect('/login');
  }
  if (user.role !== 'SUPER_ADMIN') {
    redirect('/dashboard');
  }

  return <AccountManagementClient currentUser={user} />;
}
