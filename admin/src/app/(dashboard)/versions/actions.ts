'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { recordAudit, requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const VersionSchema = z.object({
  version: z
    .string()
    .trim()
    .regex(/^\d+\.\d+\.\d+$/, 'Use semantic versioning, for example 1.2.0'),
  buildNumber: z.coerce.number().int().min(1, 'Build number must be 1 or greater'),
  releaseNotes: z.string().max(4000).default(''),
  downloadUrl: z.union([z.url(), z.literal('')]).default(''),
  minSupported: z.coerce.number().int().min(1).default(1),
  isMandatory: z.boolean().default(false),
  makeCurrent: z.boolean().default(true),
});

export type VersionState = { error?: string; success?: string };

/** Publishes a release. Making it current demotes whatever was current before. */
export async function createVersion(
  _previous: VersionState,
  formData: FormData
): Promise<VersionState> {
  const admin = await requireAdmin();

  const parsed = VersionSchema.safeParse({
    version: formData.get('version'),
    buildNumber: formData.get('buildNumber'),
    releaseNotes: String(formData.get('releaseNotes') ?? ''),
    downloadUrl: String(formData.get('downloadUrl') ?? ''),
    minSupported: formData.get('minSupported'),
    isMandatory: formData.get('isMandatory') === 'on',
    makeCurrent: formData.get('makeCurrent') === 'on',
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the release details' };
  }

  const data = parsed.data;
  const duplicate = await prisma.appVersion.findUnique({
    where: { platform_buildNumber: { platform: 'android', buildNumber: data.buildNumber } },
  });
  if (duplicate) {
    return { error: `Build ${data.buildNumber} has already been published.` };
  }

  await prisma.$transaction(async (tx) => {
    if (data.makeCurrent) {
      await tx.appVersion.updateMany({
        where: { platform: 'android', isCurrent: true },
        data: { isCurrent: false },
      });
    }
    await tx.appVersion.create({
      data: {
        platform: 'android',
        version: data.version,
        buildNumber: data.buildNumber,
        releaseNotes: data.releaseNotes,
        downloadUrl: data.downloadUrl || null,
        minSupported: data.minSupported,
        isMandatory: data.isMandatory,
        isCurrent: data.makeCurrent,
      },
    });
  });

  await recordAudit(admin.sub, 'version.create', `${data.version} (${data.buildNumber})`);
  revalidatePath('/versions');
  return { success: `Published v${data.version} (build ${data.buildNumber}).` };
}

/** Promotes an existing release to current. */
export async function makeCurrent(id: string) {
  const admin = await requireAdmin();

  await prisma.$transaction(async (tx) => {
    const target = await tx.appVersion.findUnique({ where: { id } });
    if (!target) return;
    await tx.appVersion.updateMany({
      where: { platform: target.platform, isCurrent: true },
      data: { isCurrent: false },
    });
    await tx.appVersion.update({ where: { id }, data: { isCurrent: true } });
  });

  await recordAudit(admin.sub, 'version.makeCurrent', id);
  revalidatePath('/versions');
}

export async function toggleMandatory(id: string) {
  const admin = await requireAdmin();
  const version = await prisma.appVersion.findUnique({ where: { id } });
  if (!version) return;

  await prisma.appVersion.update({
    where: { id },
    data: { isMandatory: !version.isMandatory },
  });
  await recordAudit(admin.sub, 'version.toggleMandatory', id, String(!version.isMandatory));
  revalidatePath('/versions');
}

export async function deleteVersion(id: string) {
  const admin = await requireAdmin();
  const version = await prisma.appVersion.findUnique({ where: { id } });
  // The current release must stay: the app's update check depends on one existing.
  if (!version || version.isCurrent) return;

  await prisma.appVersion.delete({ where: { id } });
  await recordAudit(admin.sub, 'version.delete', `${version.version} (${version.buildNumber})`);
  revalidatePath('/versions');
}
