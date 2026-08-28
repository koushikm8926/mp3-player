import type { Metadata } from 'next';

import { BannersManager } from '@/components/BannersManager';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Carousel Banners' };
export const dynamic = 'force-dynamic';

export default async function BannersPage() {
  await requireAdmin();

  const banners = await prisma.banner.findMany({
    orderBy: { order: 'asc' },
  });

  return (
    <BannersManager
      initialBanners={banners.map((b: any) => ({
        id: b.id,
        badge: b.badge,
        titleLine1: b.titleLine1,
        titleLine2: b.titleLine2,
        subtitle: b.subtitle,
        accentColor: b.accentColor,
        buttonColor: b.buttonColor,
        gradientStart: b.gradientStart,
        gradientEnd: b.gradientEnd,
        icon: b.icon,
        imageUrl: b.imageUrl,
        isPublished: b.isPublished,
        order: b.order,
        createdAt: b.createdAt,
      }))}
    />
  );
}
