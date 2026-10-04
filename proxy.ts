import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/profile",
  "/documents",
  "/tests",
  "/attempts",
  "/saved",
  "/history",
  "/friends",
  "/received",
  "/notifications",
];
const AUTH_ONLY_PREFIXES = ["/login", "/register", "/forgot-password", "/reset-password"];

export const proxy = auth((req) => {
  const { pathname, origin } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p)) && !isLoggedIn) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (AUTH_ONLY_PREFIXES.some((p) => pathname.startsWith(p)) && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", origin));
  }

  return NextResponse.next();
});

export const proxyConfig = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/documents/:path*",
    "/tests/:path*",
    "/attempts/:path*",
    "/saved/:path*",
    "/history/:path*",
    "/friends/:path*",
    "/received/:path*",
    "/notifications/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ],
};
