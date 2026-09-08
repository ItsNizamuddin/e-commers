import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    // NOTE: admin_session_active is strictly an optimistic navigation hint for edge routing (preventing page flicker).
    // It is NOT authoritative security proof; real authentication is enforced downstream by Express validating the HttpOnly staffRefreshToken.
    const sessionCookie = request.cookies.get("admin_session_active");
    const hasSession = Boolean(sessionCookie?.value);

    const isAuthRoute = pathname.startsWith("/login");
    const isPublicStatic =
        pathname.startsWith("/_next") ||
        pathname.startsWith("/api") ||
        pathname.includes(".");

    if (isPublicStatic) {
        return NextResponse.next();
    }

    // Unauthenticated user trying to access protected backoffice routes
    if (!hasSession && !isAuthRoute) {
        const loginUrl = new URL("/login", request.url);
        return NextResponse.redirect(loginUrl);
    }

    // Authenticated user visiting login page
    if (hasSession && isAuthRoute) {
        const accountUrl = new URL("/account", request.url);
        return NextResponse.redirect(accountUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
