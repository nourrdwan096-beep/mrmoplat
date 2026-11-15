import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/sessionCrypto';

export async function middleware(req: NextRequest) {
  try {
    const { pathname } = req.nextUrl;

    const isTeacherRoute = pathname.startsWith('/teacher');
    const isAssistantRoute = pathname.startsWith('/assistant');
    const isStudentRoute = pathname.startsWith('/student');
    const isWatchRoute = pathname.startsWith('/watch');

    if (!isTeacherRoute && !isAssistantRoute && !isStudentRoute && !isWatchRoute) {
      return NextResponse.next();
    }

    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await verifySessionToken(token);

    if (!session) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const role = session.role;

    if (isTeacherRoute && role !== 'teacher' && role !== 'super_admin') {
      if (role === 'assistant') {
        return NextResponse.redirect(new URL('/assistant', req.url));
      }
      return NextResponse.redirect(new URL('/student', req.url));
    }

    if (isAssistantRoute && role !== 'assistant' && role !== 'teacher' && role !== 'super_admin') {
      return NextResponse.redirect(new URL('/student', req.url));
    }

    if (isStudentRoute && role !== 'student' && role !== 'teacher' && role !== 'super_admin') {
      return NextResponse.redirect(new URL('/assistant', req.url));
    }

    return NextResponse.next();
  } catch {
    try {
      const loginUrl = new URL('/login', req.url);
      return NextResponse.redirect(loginUrl);
    } catch {
      return NextResponse.next();
    }
  }
}

export const config = {
  matcher: ['/teacher/:path*', '/assistant/:path*', '/student/:path*', '/watch/:path*'],
};
