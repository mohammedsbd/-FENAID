import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { MyAccountClient } from '@/components/dashboard/my-account-client';

export default function SettingsPage() {
  const cookieStore = cookies();
  const userCookie = cookieStore.get('user')?.value;
  if (!userCookie) {
    redirect('/login');
  }

  let user;
  try {
    user = JSON.parse(decodeURIComponent(userCookie));
  } catch {
    redirect('/login');
  }
  return <MyAccountClient currentUser={user} />;
}
