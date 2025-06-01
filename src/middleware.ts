
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

type UserRole = 'super_admin' | 'admin' | 'collaborator';

function getUserDataFromCookies(request: NextRequest): { role: UserRole | null, organizationId: string | null, token: string | null, isGuest: boolean } {
    const token = request.cookies.get('auth-token')?.value;
    const roleFromCookie = request.cookies.get('user-role')?.value as UserRole | undefined;
    const organizationId = request.cookies.get('organization-id')?.value;
    const guestModeRole = request.cookies.get('guest-mode')?.value as UserRole | undefined;

    if (guestModeRole) {
        console.log(`[Middleware V9] Guest mode cookie detected: ${guestModeRole}`);
        const guestOrgId = guestModeRole === 'super_admin' ? null : (organizationId || 'org_default');
        return { role: guestModeRole, organizationId: guestOrgId, token: null, isGuest: true };
    }

    if (!token) {
        return { role: null, organizationId: null, token: null, isGuest: false };
    }

    if (!roleFromCookie) {
        console.warn("[Middleware V9] Missing role cookie despite token existence.");
        // Fallback or error handling might be needed here depending on strictness
    }
    if (roleFromCookie !== 'super_admin' && !organizationId) {
        // This is a critical issue for admin/collaborator roles
        console.warn(`[Middleware V9] Missing organizationId cookie for role: ${roleFromCookie}. This could lead to issues.`);
        // Depending on policy, could treat as unauthenticated or redirect to error/login.
        // For now, let it pass but ConditionalLayout or useAuth should ideally catch this.
    }

    return {
        role: roleFromCookie || null,
        organizationId: organizationId || null,
        token: token,
        isGuest: false,
    };
}

export async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;
    console.log(`[Middleware V9] Path: ${pathname}`);


    // Allow direct access to login page
    if (pathname === '/login') {
        console.log("[Middleware V9] Accessing login page, allowing.");
        return NextResponse.next();
    }

    // --- TEMPORARY BYPASS FOR DEVELOPMENT/ANALYSIS ---
    // This will allow access to any path without auth checks.
    // Remember to remove or comment this out when testing actual auth flows.
    // console.warn(`[Middleware V9] TEMPORARY: Bypassing authentication for ${pathname}.`);
    // return NextResponse.next(); // <<<< ESTA LINHA ESTÁ COMENTADA PARA AUTENTICAÇÃO REAL
    // --- END TEMPORARY BYPASS ---


     const { role, organizationId, token, isGuest } = getUserDataFromCookies(request);
     console.log(`[Middleware V9] Path: ${pathname}, Role: ${role}, OrgID: ${organizationId}, Token: ${!!token}, Guest: ${isGuest}`);


     if (pathname === '/login') { // This check is somewhat redundant due to the first check, but harmless
         if (token || isGuest) { // If somehow reached login page while authenticated or guest
             let redirectPath = '/'; // Default to admin dashboard for admin/unknown
             if (role === 'super_admin') redirectPath = '/superadmin';
             else if (role === 'collaborator') redirectPath = '/colaborador/dashboard';
             console.log(`[Middleware V9] User authenticated/guest. Redirecting from /login to ${redirectPath}`);
             return NextResponse.redirect(new URL(redirectPath, request.url));
         }
         console.log("[Middleware V9] Accessing login page, allowing.");
         return NextResponse.next();
     }

     // If no token and not in guest mode, redirect to login
     if (!token && !isGuest) {
         console.log(`[Middleware V9] No token or guest mode. Redirecting to /login from ${pathname}`);
         const loginUrl = new URL('/login', request.url);
         loginUrl.searchParams.set('reason', 'unauthenticated_mw_v9'); // More specific reason
         loginUrl.searchParams.set('from', pathname);
         return NextResponse.redirect(loginUrl);
     }

     // Super Admin Routing
     if (role === 'super_admin') {
         if (!pathname.startsWith('/superadmin')) {
             console.log(`[Middleware V9] Super Admin user redirected from ${pathname} to /superadmin`);
             return NextResponse.redirect(new URL('/superadmin', request.url));
         }
         console.log(`[Middleware V9] Super Admin (Guest: ${isGuest}) accessing allowed path: ${pathname}`);
         return NextResponse.next(); // Allow access to /superadmin/*
     }

    // // Admin Routing
     if (role === 'admin') {
         if (!organizationId && !isGuest) { // Critical check for non-guest admin
             console.error(`[Middleware V9 CRITICAL] Admin user missing organizationId! Redirecting to login.`);
              // Clear potentially corrupted auth state and redirect
              const response = NextResponse.redirect(new URL('/login?reason=no_org_mw_v9', request.url));
              response.cookies.delete('auth-token');
              response.cookies.delete('user-role');
              response.cookies.delete('organization-id');
              response.cookies.delete('guest-mode'); // Ensure guest mode is also cleared
              return response;
         }
         if (pathname.startsWith('/colaborador') || pathname.startsWith('/superadmin')) {
             console.log(`[Middleware V9] Admin user redirected from ${pathname} to / (admin dashboard)`);
             return NextResponse.redirect(new URL('/', request.url));
         }
         // Allow access to admin dashboard (/) and other non-colaborador/superadmin paths
         console.log(`[Middleware V9] Admin (Guest: ${isGuest}) accessing allowed path: ${pathname}`);
         return NextResponse.next();
     }

    // // Collaborator Routing
     if (role === 'collaborator') {
          if (!organizationId && !isGuest) { // Critical check for non-guest collaborator
             console.error(`[Middleware V9 CRITICAL] Collaborator user missing organizationId! Redirecting to login.`);
              const response = NextResponse.redirect(new URL('/login?reason=no_org_mw_v9', request.url));
              response.cookies.delete('auth-token');
              response.cookies.delete('user-role');
              response.cookies.delete('organization-id');
              response.cookies.delete('guest-mode');
              return response;
          }
         if (!pathname.startsWith('/colaborador')) {
             console.log(`[Middleware V9] Collaborator user redirected from ${pathname} to /colaborador/dashboard`);
             return NextResponse.redirect(new URL('/colaborador/dashboard', request.url));
         }
         console.log(`[Middleware V9] Collaborator (Guest: ${isGuest}) accessing allowed path: ${pathname}`);
         return NextResponse.next(); // Allow access to /colaborador/*
     }

     // If role is null but token exists, or role is unknown, or it's a guest with an unhandled role/path combo
     console.warn(`[Middleware V9] Unknown role or state reached. Role: ${role}, IsGuest: ${isGuest}, Path: ${pathname}. Redirecting to login.`);
     const response = NextResponse.redirect(new URL('/login?reason=unknown_role_mw_v9', request.url));
     // Clear all auth-related cookies as a precaution
     response.cookies.delete('auth-token');
     response.cookies.delete('user-role');
     response.cookies.delete('organization-id');
     response.cookies.delete('guest-mode');
     return response;
}

// Match all paths except for API routes, static files, and public assets
export const config = {
  matcher: [
    // Match all routes except for:
    // - /api/ (API routes)
    // - /_next/static (Next.js static files)
    // - /_next/image (Next.js image optimization files)
    // - /favicon.ico (Favicon file)
    // - /logo.png (Logo file)
    // - Files with an extension (e.g., .jpg, .css)
    '/((?!api|_next/static|_next/image|favicon.ico|logo.png|.*\\..*).*)',
  ],
};
