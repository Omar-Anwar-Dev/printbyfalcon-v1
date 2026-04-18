/**
 * Dev-mode fallback for /storage/* URLs.
 *
 * Prod/staging: Nginx serves /storage/ directly from /var/pbf/storage/ with a
 * 1-year `Cache-Control: public, immutable` header. Requests never reach this
 * route. In local dev we have no Nginx in front of Next.js, so this route fills
 * the gap — same headers, same path layout, same cache semantics.
 *
 * Only paths under `products/` are served; directory traversal is blocked.
 */
import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'node:fs/promises';
import { safeResolveStoragePath } from '@/lib/storage/paths';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path: pathSegments } = await params;
  if (!pathSegments || pathSegments.length === 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const joined = pathSegments.join('/');
  const abs = safeResolveStoragePath(joined);
  if (!abs) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    const info = await stat(abs);
    if (!info.isFile()) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    const bytes = await readFile(abs);
    const contentType = contentTypeFor(abs);
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        'content-type': contentType,
        'content-length': String(info.size),
        'cache-control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    throw err;
  }
}

function contentTypeFor(filePath: string): string {
  if (filePath.endsWith('.webp')) return 'image/webp';
  if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) return 'image/jpeg';
  if (filePath.endsWith('.png')) return 'image/png';
  if (filePath.endsWith('.pdf')) return 'application/pdf';
  return 'application/octet-stream';
}
