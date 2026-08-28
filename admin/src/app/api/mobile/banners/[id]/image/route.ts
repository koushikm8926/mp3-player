import { openBannerImage } from '@/lib/bannerStorage';
import { Readable } from 'node:stream';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await openBannerImage(id);

  if (!result) {
    return new Response('Banner image not found', { status: 404 });
  }

  const { stream, mimeType, sizeBytes } = result;
  const webStream = Readable.toWeb(stream) as ReadableStream<Uint8Array>;

  return new Response(webStream, {
    headers: {
      'Content-Type': mimeType,
      'Content-Length': String(sizeBytes),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
