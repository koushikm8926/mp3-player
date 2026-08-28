import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { requestOrigin } from '@/lib/mobile';
import { saveBannerImage } from '@/lib/bannerStorage';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const badge = (formData.get('badge') as string) || 'FEATURED';
    const titleLine1 = (formData.get('titleLine1') as string) || '';
    const titleLine2 = (formData.get('titleLine2') as string) || '';
    const subtitle = (formData.get('subtitle') as string) || '';
    const accentColor = (formData.get('accentColor') as string) || '#C084FC';
    const buttonColor = (formData.get('buttonColor') as string) || '#8B5CF6';
    const gradientStart = (formData.get('gradientStart') as string) || '#1A0B2E';
    const gradientEnd = (formData.get('gradientEnd') as string) || '#3B1560';
    const icon = (formData.get('icon') as string) || 'sparkles';
    const imageFile = formData.get('imageFile') as File | null;

    if (!titleLine1 && !titleLine2) {
      return NextResponse.json({ error: 'Title line 1 or title line 2 is required.' }, { status: 400 });
    }

    const count = await prisma.banner.count();

    const banner = await prisma.banner.create({
      data: {
        badge,
        titleLine1,
        titleLine2,
        subtitle,
        accentColor,
        buttonColor,
        gradientStart,
        gradientEnd,
        icon,
        isPublished: true,
        order: count,
      },
    });

    let imageUrl: string | null = null;
    let storageKey: string | null = null;

    if (imageFile && imageFile.size > 0) {
      const saved = await saveBannerImage(imageFile, banner.id);
      storageKey = saved.storageKey;
      imageUrl = `${requestOrigin(request)}/api/mobile/banners/${banner.id}/image`;

      await prisma.banner.update({
        where: { id: banner.id },
        data: { imageUrl, storageKey },
      });
    }

    return NextResponse.json({ success: true, banner: { ...banner, imageUrl } });
  } catch (error) {
    console.error('Error creating banner:', error);
    return NextResponse.json({ error: 'Failed to create banner' }, { status: 500 });
  }
}
