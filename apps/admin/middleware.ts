import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const staffCookie = request.cookies.get("staffRefreshToken");
    const hasSessionCookie = Boolean(staffCookie?.value);

    const isAuthRoute = pathname.startsWith("/login");
    const isPublicStatic =
        pathname.startsWith("/_next") ||
        pathname.startsWith("/api") ||
        pathname.includes(".");

    if (isPublicStatic) {
        return NextResponse.next();
    }

    // Unauthenticated user trying to access protected backoffice routes
    if (!hasSessionCookie && !isAuthRoute) {
        const loginUrl = new URL("/login", request.url);
        return NextResponse.redirect(loginUrl);
    }

    // Authenticated user visiting login page
    if (hasSessionCookie && isAuthRoute) {
        const dashboardUrl = new URL("/dashboard", request.url);
        return NextResponse.redirect(dashboardUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
