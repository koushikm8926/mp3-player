import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { requestOrigin } from '@/lib/mobile';
import { deleteBannerImage, saveBannerImage } from '@/lib/bannerStorage';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await prisma.banner.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Banner not found' }, { status: 404 });
    }

    if (existing.storageKey) {
      await deleteBannerImage(existing.storageKey);
    }

    await prisma.banner.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting banner:', error);
    return NextResponse.json({ error: 'Failed to delete banner' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await request.formData();

    const existing = await prisma.banner.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Banner not found' }, { status: 404 });
    }

    const badge = formData.get('badge') as string | null;
    const titleLine1 = formData.get('titleLine1') as string | null;
    const titleLine2 = formData.get('titleLine2') as string | null;
    const subtitle = formData.get('subtitle') as string | null;
    const accentColor = formData.get('accentColor') as string | null;
    const buttonColor = formData.get('buttonColor') as string | null;
    const isPublishedStr = formData.get('isPublished') as string | null;
    const imageFile = formData.get('imageFile') as File | null;

    let imageUrl = existing.imageUrl;
    let storageKey = existing.storageKey;

    if (imageFile && imageFile.size > 0) {
      if (existing.storageKey) {
        await deleteBannerImage(existing.storageKey);
      }
      const saved = await saveBannerImage(imageFile, id);
      storageKey = saved.storageKey;
      imageUrl = `${requestOrigin(request)}/api/mobile/banners/${id}/image`;
    }

    const updated = await prisma.banner.update({
      where: { id },
      data: {
        badge: badge ?? existing.badge,
        titleLine1: titleLine1 ?? existing.titleLine1,
        titleLine2: titleLine2 ?? existing.titleLine2,
        subtitle: subtitle ?? existing.subtitle,
        accentColor: accentColor ?? existing.accentColor,
        buttonColor: buttonColor ?? existing.buttonColor,
        isPublished: isPublishedStr !== null ? isPublishedStr === 'true' : existing.isPublished,
        imageUrl,
        storageKey,
      },
    });

    return NextResponse.json({ success: true, banner: updated });
  } catch (error) {
    console.error('Error updating banner:', error);
    return NextResponse.json({ error: 'Failed to update banner' }, { status: 500 });
  }
}
