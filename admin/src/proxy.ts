import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { ADMIN_COOKIE, readAdminToken } from '@/lib/auth';

/**
 * Gate for the admin panel. (`middleware.ts` was renamed to `proxy.ts` in Next.js 16.)
 *
 * This only checks that a valid, unexpired session cookie exists — every page and action
 * still calls `requireAdmin()` itself, so a bypass here cannot leak data.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  const claims = token ? await readAdminToken(token) : null;

  if (pathname === '/login') {
    if (claims) return NextResponse.redirect(new URL('/', request.url));
    return NextResponse.next();
  }

  if (!claims) {
    const url = new URL('/login', request.url);
    if (pathname !== '/') url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Everything except Next internals, static files and the mobile API (which uses
  // bearer tokens, not the admin cookie).
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
