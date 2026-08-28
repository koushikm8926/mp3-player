import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { requestOrigin } from '@/lib/mobile';
import { ensureDefaultBanners } from '@/lib/seedBanners';

export async function GET(request: Request) {
  try {
    await ensureDefaultBanners();

    const banners = await prisma.banner.findMany({
      where: { isPublished: true },
      orderBy: { order: 'asc' },
    });

    const origin = requestOrigin(request);

    const formatted = banners.map((b: any) => ({
      id: b.id,
      badge: b.badge,
      titleLine1: b.titleLine1,
      titleLine2: b.titleLine2,
      subtitle: b.subtitle,
      accentColor: b.accentColor,
      buttonColor: b.buttonColor,
      gradient: [b.gradientStart, b.gradientEnd],
      icon: b.icon,
      imageUrl: b.imageUrl
        ? b.imageUrl.startsWith('http')
          ? b.imageUrl
          : `${origin}${b.imageUrl.startsWith('/') ? '' : '/'}${b.imageUrl}`
        : null,
    }));

    return NextResponse.json({ banners: formatted });
  } catch (error) {
    console.error('Error fetching mobile banners:', error);
    return NextResponse.json({ banners: [] }, { status: 500 });
  }
}
