// PatentSale proxy (Next.js 16 convention, replaces deprecated middleware.ts).
// Protects /admin routes with NextAuth session. The admin panel is the only
// write path to the marketplace, so it must never be reachable by unauthenticated
// users. Public routes are unaffected.
//
// Note: Next.js 16 deprecated the `middleware` file convention in favor of
// `proxy`. We use withAuth here for session-token verification; the client-side
// AdminShell additionally gates on useSession() as a second layer.
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function proxy() {
    return NextResponse.next();
  },
  {
    pages: { signIn: "/admin/login" },
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  // Protect /admin and everything under it EXCEPT the login page itself.
  matcher: ["/admin", "/admin/((?!login).*)"],
};
