import { auth } from "@/lib/auth"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isOnAuthPage = req.nextUrl.pathname.startsWith("/auth")
  const isOnApiAuth = req.nextUrl.pathname.startsWith("/api/auth")

  // Don't protect auth pages and API routes
  if (isOnAuthPage || isOnApiAuth) {
    return
  }

  // Redirect to sign in if not logged in
  if (!isLoggedIn) {
    return Response.redirect(new URL("/auth/signin", req.url))
  }
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
  runtime: "nodejs",
}
