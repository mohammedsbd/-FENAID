import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { MyAccountClient } from '@/components/dashboard/my-account-client';
import { SystemSettingsClient } from '@/components/dashboard/system-settings-client';

export default function SettingsPage() {
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
  return (
    <div className="space-y-6">
      <SystemSettingsClient role={user.role} />
      <MyAccountClient currentUser={user} />
    </div>
  );
}
