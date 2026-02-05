import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // We can't easily decode the JWT here without a library like jose
    // But we can check for the token's presence
    const token = request.cookies.get('token')?.value;
    const { pathname } = request.nextUrl;

    // Check for tokens and redirects
    const val = request.nextUrl.pathname;

    // Simple path checks
    const isLoginPage = val.startsWith('/login');
    const isRegisterPage = val.startsWith('/register');
    const isAuthPage = isLoginPage || isRegisterPage;

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
