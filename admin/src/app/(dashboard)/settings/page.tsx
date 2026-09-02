import type { Metadata } from 'next';

import { Card, EmptyRow, PageHeader } from '@/components/ui';
import { PasswordForm, SettingsForm } from '@/components/SettingsForms';
import { requireAdmin } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Settings' };
export const dynamic = 'force-dynamic';

const GROUP_LABELS: Record<string, { title: string; description: string }> = {
  auth: { title: 'Authentication', description: 'How users get into the app.' },
  player: { title: 'Player defaults', description: 'Suggested defaults for new installs.' },
};

export default async function SettingsPage() {
  const admin = await requireAdmin();

  const [settings, auditLogs, adminRecord] = await Promise.all([
    prisma.setting.findMany({
      where: { group: { notIn: ['analytics', 'general'] } },
      orderBy: [{ group: 'asc' }, { key: 'asc' }],
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 15,
      include: { admin: { select: { name: true, email: true } } },
    }),
    prisma.admin.findUnique({ where: { id: admin.sub } }),
  ]);

  const groups = [...new Set(settings.map((s) => s.group))].sort();

  return (
    <>
      <PageHeader
        title="Settings management"
        description="Values marked public are served to the mobile app; the rest stay server-side."
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <SettingsForm
            groups={groups.map((group) => ({
              key: group,
              title: GROUP_LABELS[group]?.title ?? group,
              description: GROUP_LABELS[group]?.description ?? '',
              settings: settings
                .filter((s) => s.group === group)
                .map((s) => ({
                  key: s.key,
                  value: s.value,
                  type: s.type,
                  label: s.label || s.key,
                  description: s.description,
                  isPublic: s.isPublic,
                })),
            }))}
          />

          <Card title="Recent admin activity" description="Last 15 audited actions">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <tbody className="divide-y divide-ink-800">
                  {auditLogs.length === 0 ? (
                    <EmptyRow colSpan={2} message="Nothing recorded yet." />
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="td">
                          <span className="block font-mono text-xs text-mist-200">
                            {log.action}
                          </span>
                          <span className="block truncate text-xs text-mist-500">
                            {log.target || '—'}
                          </span>
                        </td>
                        <td className="td text-right text-xs whitespace-nowrap text-mist-500">
                          {formatDateTime(log.createdAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Your account" description={adminRecord?.email ?? admin.email}>
            <dl className="space-y-2.5 border-b border-ink-700 px-5 py-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-mist-500">Name</dt>
                <dd className="text-mist-200">{adminRecord?.name ?? admin.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-mist-500">Role</dt>
                <dd className="text-mist-200">{adminRecord?.role ?? admin.role}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-mist-500">Last sign-in</dt>
                <dd className="text-mist-200">{formatDateTime(adminRecord?.lastLoginAt)}</dd>
              </div>
            </dl>
            <div className="p-5">
              <PasswordForm />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
