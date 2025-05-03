
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import Cookies from 'js-cookie'; // Import js-cookie for guest mode check

// --- Environment Variable Check (Keep JWT Secret check if you plan to use JWTs later) ---
const JWT_SECRET_STRING = process.env.JWT_SECRET;
if (!JWT_SECRET_STRING) {
    console.error("[Middleware] Warning: JWT_SECRET environment variable is not set. JWT verification disabled.");
}

// Define User Roles
type UserRole = 'super_admin' | 'admin' | 'collaborator';

// Function to get user data from cookies (replace with token verification for production)
function getUserDataFromCookies(request: NextRequest): { role: UserRole | null, organizationId: string | null, token: string | null } {
    const token = request.cookies.get('auth-token')?.value;
    const roleFromCookie = request.cookies.get('user-role')?.value as UserRole | undefined;
    const organizationId = request.cookies.get('organization-id')?.value;
    const guestModeRole = request.cookies.get('guest-mode')?.value as UserRole | undefined;

    // Prioritize guest mode if the cookie exists
    if (guestModeRole) {
        console.log(`[Middleware] Guest mode cookie detected: ${guestModeRole}`);
        return { role: guestModeRole, organizationId: 'org_default', token: null }; // Return guest role, default org, null token
    }

    // If not guest mode, check for auth token
    if (!token) {
        return { role: null, organizationId: null, token: null };
    }

    // Basic validation (in a real app, verify the token here)
    if (!roleFromCookie) {
        console.warn("[Middleware] Missing role cookie despite token existence.");
        // Optionally clear invalid cookies here if needed
    }
     // Super admin doesn't need org ID, others do
    if (roleFromCookie !== 'super_admin' && !organizationId) {
        console.warn(`[Middleware] Missing organizationId cookie for role: ${roleFromCookie}.`);
    }

    return {
        role: roleFromCookie || null,
        organizationId: organizationId || null,
        token: token,
    };
}

export async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;
    const userData = getUserDataFromCookies(request);
    const { role, organizationId, token } = userData;
    const isGuest = !token && !!role; // Guest mode is true if no token BUT a role exists (from guest cookie)

    console.log(`[Middleware] Path: ${pathname}, Role: ${role}, OrgID: ${organizationId}, Token: ${!!token}, Guest: ${isGuest}`);

    // 1. Allow access to login page
    if (pathname === '/login') {
        // If logged in or guest, redirect away from login
        if (token || isGuest) {
            let redirectPath = '/'; // Default redirect for admin
            if (role === 'super_admin') redirectPath = '/superadmin';
            else if (role === 'collaborator') redirectPath = '/colaborador/dashboard';
            console.log(`[Middleware] User authenticated/guest. Redirecting from /login to ${redirectPath}`);
            return NextResponse.redirect(new URL(redirectPath, request.url));
        }
        console.log("[Middleware] Accessing login page, allowing.");
        return NextResponse.next();
    }

    // 2. Handle unauthenticated users (neither logged in nor guest)
    if (!token && !isGuest) {
        console.log(`[Middleware] No token or guest mode. Redirecting to /login from ${pathname}`);
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('reason', 'unauthenticated');
        loginUrl.searchParams.set('from', pathname); // Add original path
        return NextResponse.redirect(loginUrl);
    }

    // --- User is Authenticated or in Guest Mode ---

    // 3. Super Admin Routing
    if (role === 'super_admin') {
        if (!pathname.startsWith('/superadmin')) {
            console.log(`[Middleware] Super Admin user redirected from ${pathname} to /superadmin`);
            return NextResponse.redirect(new URL('/superadmin', request.url));
        }
        console.log(`[Middleware] Super Admin accessing allowed path: ${pathname}`);
        return NextResponse.next(); // Allow access to /superadmin and its sub-paths
    }

    // 4. Admin Routing
    if (role === 'admin') {
        // Admins belong to a specific organization (unless guest)
        if (!organizationId && !isGuest) {
            console.error(`[Middleware] Admin user missing organizationId! Redirecting to login.`);
             const response = NextResponse.redirect(new URL('/login?reason=no_org', request.url));
             response.cookies.delete('auth-token');
             response.cookies.delete('user-role');
             response.cookies.delete('organization-id');
             response.cookies.delete('guest-mode');
             return response;
        }
        // Redirect admins away from collaborator and superadmin pages
        if (pathname.startsWith('/colaborador') || pathname.startsWith('/superadmin')) {
            console.log(`[Middleware] Admin user redirected from ${pathname} to /`);
            return NextResponse.redirect(new URL('/', request.url)); // Admin dashboard is root '/'
        }
        // Allow access to admin pages (root '/' and others not starting with /colaborador or /superadmin)
        console.log(`[Middleware] Admin accessing allowed path: ${pathname}`);
        return NextResponse.next();
    }

    // 5. Collaborator Routing
    if (role === 'collaborator') {
         if (!organizationId && !isGuest) {
            console.error(`[Middleware] Collaborator user missing organizationId! Redirecting to login.`);
             const response = NextResponse.redirect(new URL('/login?reason=no_org', request.url));
             response.cookies.delete('auth-token');
             response.cookies.delete('user-role');
             response.cookies.delete('organization-id');
             response.cookies.delete('guest-mode');
             return response;
         }
        // Redirect collaborators away from admin and superadmin pages
        if (!pathname.startsWith('/colaborador')) {
            console.log(`[Middleware] Collaborator user redirected from ${pathname} to /colaborador/dashboard`);
            return NextResponse.redirect(new URL('/colaborador/dashboard', request.url));
        }
        // Allow access to collaborator pages
        console.log(`[Middleware] Collaborator accessing allowed path: ${pathname}`);
        return NextResponse.next();
    }

    // 6. Fallback for unknown roles or unexpected states
    console.warn(`[Middleware] Unknown role or state reached. Role: ${role}, IsGuest: ${isGuest}. Redirecting to login.`);
    const response = NextResponse.redirect(new URL('/login?reason=unknown_role', request.url));
    response.cookies.delete('auth-token');
    response.cookies.delete('user-role');
    response.cookies.delete('organization-id');
    response.cookies.delete('guest-mode');
    return response;
}

// Apply middleware to relevant routes
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - logo.png (logo file)
     * - .*\\..* (files with extensions, like .svg, .css, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|logo.png|.*\\..*).*)',
  ],
};
