
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // --- Mock Role Determination ---
  // In a real application, you would determine the user's role based on
  // their session, token, or other authentication mechanism.
  // For this example, we'll simulate the role based on the path prefix.
  let userRole: 'admin' | 'colaborador' | 'unknown' = 'unknown';

  // Example: Simulate role based on a cookie or header (replace with actual logic)
  const roleCookie = request.cookies.get('userRole')?.value;
  if (roleCookie === 'admin') {
      userRole = 'admin';
  } else if (roleCookie === 'colaborador') {
      userRole = 'colaborador';
  } else {
      // Default or unauthenticated: Redirect to a login page or a default view
      // For now, let's assume 'unknown' implies redirection might be needed.
      // If no cookie, maybe try to guess based on path for demo purposes?
      if (pathname.startsWith('/colaborador')) {
          // Assume they tried to access employee page, set role for demo redirect logic
          userRole = 'colaborador';
      } else if (pathname === '/' || !pathname.startsWith('/colaborador')) {
           // Assume accessing root or admin pages
           userRole = 'admin'; // Default to admin for root/non-employee paths for demo
      }
  }


  // --- Routing Logic ---

  // If user is an admin...
  if (userRole === 'admin') {
    // If trying to access employee pages, redirect to admin dashboard
    if (pathname.startsWith('/colaborador')) {
      console.log(`[Middleware] Admin user redirected from ${pathname} to /`);
      return NextResponse.redirect(new URL('/', request.url));
    }
    // Otherwise, allow access to admin pages (including root '/')
    return NextResponse.next();
  }

  // If user is an employee...
  if (userRole === 'colaborador') {
    // If trying to access admin pages (root or anything not starting with /colaborador), redirect to employee dashboard
    if (!pathname.startsWith('/colaborador')) {
      console.log(`[Middleware] Employee user redirected from ${pathname} to /colaborador/dashboard`);
      return NextResponse.redirect(new URL('/colaborador/dashboard', request.url));
    }
    // Otherwise, allow access to employee pages
    return NextResponse.next();
  }

  // If role is unknown (e.g., not logged in or error determining role)
  // You might want to redirect to a login page.
  // For this example, we'll just let it proceed, but a real app needs a login redirect.
  console.log(`[Middleware] Unknown role for path ${pathname}. Proceeding (implement login redirect).`);
  // Example redirect to a hypothetical login page:
  // if (pathname !== '/login') { // Avoid redirect loop
  //   return NextResponse.redirect(new URL('/login', request.url));
  // }
  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (if you have a login page)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|login).*)',
  ],
}
