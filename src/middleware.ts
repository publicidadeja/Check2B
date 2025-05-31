
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

type UserRole = 'super_admin' | 'admin' | 'collaborator';

function getUserDataFromCookies(request: NextRequest): { role: UserRole | null, organizationId: string | null, token: string | null, isGuest: boolean } {
    const token = request.cookies.get('auth-token')?.value;
    const roleFromCookie = request.cookies.get('user-role')?.value as UserRole | undefined;
    const organizationId = request.cookies.get('organization-id')?.value;
    const guestModeRole = request.cookies.get('guest-mode')?.value as UserRole | undefined;

    if (guestModeRole) {
        console.log(`[Middleware] Guest mode cookie detected: ${guestModeRole}`);
        const guestOrgId = guestModeRole === 'super_admin' ? null : (organizationId || 'org_default');
        return { role: guestModeRole, organizationId: guestOrgId, token: null, isGuest: true };
    }

    if (!token) {
        return { role: null, organizationId: null, token: null, isGuest: false };
    }

    if (!roleFromCookie) {
        console.warn("[Middleware] Missing role cookie despite token existence.");
    }
    if (roleFromCookie !== 'super_admin' && !organizationId) {
        console.warn(`[Middleware] Missing organizationId cookie for role: ${roleFromCookie}.`);
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
    console.log(`[Middleware] Path: ${pathname} - TEMPORARY AUTH BYPASS ACTIVE`);

    // Allow direct access to login page
    if (pathname === '/login') {
        console.log("[Middleware] Accessing login page, allowing.");
        return NextResponse.next();
    }

    // --- TEMPORARY BYPASS FOR DEVELOPMENT/ANALYSIS ---
    // This will allow access to any path without auth checks.
    // Remember to remove or comment this out when testing actual auth flows.
    console.warn(`[Middleware] TEMPORARY: Bypassing authentication for ${pathname}.`);
    return NextResponse.next(); // <<<< ESTA LINHA FOI DESCOMENTADA
    // --- END TEMPORARY BYPASS ---


    // The original logic below is now bypassed by the return statement above.
     const { role, organizationId, token, isGuest } = getUserDataFromCookies(request);
     console.log(`[Middleware] Path: ${pathname}, Role: ${role}, OrgID: ${organizationId}, Token: ${!!token}, Guest: ${isGuest}`);


     if (pathname === '/login') {
         if (token || isGuest) {
             let redirectPath = '/';
             if (role === 'super_admin') redirectPath = '/superadmin';
             else if (role === 'collaborator') redirectPath = '/colaborador/dashboard';
             console.log(`[Middleware] User authenticated/guest. Redirecting from /login to ${redirectPath}`);
             return NextResponse.redirect(new URL(redirectPath, request.url));
         }
         console.log("[Middleware] Accessing login page, allowing.");
         return NextResponse.next();
     }

     if (!token && !isGuest) {
         console.log(`[Middleware] No token or guest mode. Redirecting to /login from ${pathname}`);
         const loginUrl = new URL('/login', request.url);
         loginUrl.searchParams.set('reason', 'unauthenticated');
         loginUrl.searchParams.set('from', pathname);
         return NextResponse.redirect(loginUrl);
     }

     // Super Admin Routing
     if (role === 'super_admin') {
         if (!pathname.startsWith('/superadmin')) {
             console.log(`[Middleware] Super Admin user redirected from ${pathname} to /superadmin`);
             return NextResponse.redirect(new URL('/superadmin', request.url));
         }
         console.log(`[Middleware] Super Admin (Guest: ${isGuest}) accessing allowed path: ${pathname}`);
         return NextResponse.next();
     }

    // // Admin Routing
     if (role === 'admin') {
         if (!organizationId && !isGuest) {
             console.error(`[Middleware] Admin user missing organizationId! Redirecting to login.`);
              const response = NextResponse.redirect(new URL('/login?reason=no_org', request.url));
              response.cookies.delete('auth-token');
              response.cookies.delete('user-role');
              response.cookies.delete('organization-id');
              response.cookies.delete('guest-mode');
              return response;
         }
         if (pathname.startsWith('/colaborador') || pathname.startsWith('/superadmin')) {
             console.log(`[Middleware] Admin user redirected from ${pathname} to /`);
             return NextResponse.redirect(new URL('/', request.url));
         }
         console.log(`[Middleware] Admin (Guest: ${isGuest}) accessing allowed path: ${pathname}`);
         return NextResponse.next();
     }

    // // Collaborator Routing
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
         if (!pathname.startsWith('/colaborador')) {
             console.log(`[Middleware] Collaborator user redirected from ${pathname} to /colaborador/dashboard`);
             return NextResponse.redirect(new URL('/colaborador/dashboard', request.url));
         }
         console.log(`[Middleware] Collaborator (Guest: ${isGuest}) accessing allowed path: ${pathname}`);
         return NextResponse.next();
     }

     console.warn(`[Middleware] Unknown role or state reached. Role: ${role}, IsGuest: ${isGuest}. Redirecting to login.`);
     const response = NextResponse.redirect(new URL('/login?reason=unknown_role', request.url));
     response.cookies.delete('auth-token');
     response.cookies.delete('user-role');
     response.cookies.delete('organization-id');
     response.cookies.delete('guest-mode');
     return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|logo.png|.*\\..*).*)',
  ],
};
