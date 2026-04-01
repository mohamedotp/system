import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(
    process.env.JWT_SECRET || "aoi-system-secret-key-12345"
);

export async function middleware(request) {
    const { pathname } = request.nextUrl;

    // 1. المسارات المحمية
    const protectedRoutes = ["/employee", "/import", "/export", "/memo/create", "/memo/templates", "/products"];
    const isProtected = protectedRoutes.some(route => pathname.startsWith(route));

    if (isProtected) {
        const session = request.cookies.get("session")?.value;
        if (!session) {
            // تخزين الرابط الأصلي قبل التوجيه للوجين
            const loginUrl = new URL("/login", request.url);
            loginUrl.searchParams.set("callbackUrl", pathname + request.nextUrl.search);
            return NextResponse.redirect(loginUrl);
        }

        try {
            await jwtVerify(session, secret);
            return NextResponse.next();
        } catch  {
            const loginUrl = new URL("/login", request.url);
            loginUrl.searchParams.set("callbackUrl", pathname + request.nextUrl.search);
            return NextResponse.redirect(loginUrl);
        }
    }

    // 2. منع الدخول لصفحة اللوجين والريجيستر لو مسجل بالفعل
    if (pathname === "/login" || pathname === "/register") {
        const session = request.cookies.get("session")?.value;
        if (session) {
            try {
                await jwtVerify(session, secret);
                return NextResponse.redirect(new URL("/import", request.url));
            } catch  {
                // ignore
            }
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/employee/:path*", "/login", "/register", "/import", "/import/:path*", "/export", "/export/:path*", "/products", "/products/:path*", "/memo/create", "/memo/create/:path*", "/memo/templates", "/memo/templates/:path*"],
};
