import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // We can't easily decode the JWT here without a library like jose
    // But we can check for the token's presence
    const token = request.cookies.get('token')?.value;
    const isAuthPage = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/register');
    const isAdminPage = request.nextUrl.pathname.startsWith('/admin');

    if (!token && !isAuthPage) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    if (token && isAuthPage) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    // We rely on the page component to enforce strict SUPER_ADMIN check
    // but we can ensure they are at least authenticated here.

    return NextResponse.next();
}

export const config = {
    matcher: ['/', '/login', '/register'],
};
