import { auth } from "@/lib/auth"

export const proxy = auth((req) => {
  const isLoggedIn = !!req.auth
  const isOnAuthPage = req.nextUrl.pathname.startsWith("/auth")
  const isOnApiAuth = req.nextUrl.pathname.startsWith("/api/auth")
  const isOnPasswordResetPage =
    req.nextUrl.pathname === "/forgot-password" ||
    req.nextUrl.pathname === "/reset-password"

  // Don't protect auth pages and API routes
  if (isOnAuthPage || isOnApiAuth || isOnPasswordResetPage) {
    return
  }

  // Redirect to sign in if not logged in
  if (!isLoggedIn) {
    return Response.redirect(new URL("/auth/signin", req.url))
  }
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
