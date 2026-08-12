import { redirect } from 'next/navigation';

import { Sidebar } from '@/components/Sidebar';
import { getCurrentAdmin } from '@/lib/auth';

/**
 * Shell for every authenticated page.
 *
 * `proxy.ts` already redirects anonymous requests, but the check is repeated here so a
 * misconfigured matcher can never render admin data.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect('/login');

  return (
    <div className="flex min-h-screen flex-col bg-ink-950 lg:flex-row">
      <Sidebar admin={{ name: admin.name, email: admin.email, role: admin.role }} />
      <main className="min-w-0 flex-1 px-5 py-7 sm:px-8 lg:px-10">{children}</main>
    </div>
  );
}
