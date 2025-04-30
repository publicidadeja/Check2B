
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose'; // Using jose for JWT verification

// --- Environment Variable for JWT Secret ---
// Ensure this is set in your .env.local file
const JWT_SECRET = process.env.JWT_SECRET ? new TextEncoder().encode(process.env.JWT_SECRET) : null;

interface UserJwtPayload {
    uid: string;
    email: string;
    role: 'admin' | 'colaborador'; // Define expected roles
    // Add other claims as needed (e.g., name, department)
    iat: number; // Issued at
    exp: number; // Expiration time
}

// Function to verify the JWT token from the cookie
async function verifyToken(token: string): Promise<UserJwtPayload | null> {
    if (!JWT_SECRET) {
        console.error("JWT_SECRET is not defined in environment variables.");
        return null;
    }
    if (!token) {
        return null;
    }
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        // Basic validation (ensure essential claims exist)
        if (typeof payload.uid !== 'string' || typeof payload.role !== 'string') {
             console.error("Invalid token payload structure.");
             return null;
        }
        return payload as UserJwtPayload;
    } catch (err) {
        console.error("JWT verification failed:", err);
        return null;
    }
}


export async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;
    const authTokenCookie = request.cookies.get('auth-token'); // Check for the auth token cookie
    const token = authTokenCookie?.value;

    console.log(`[Middleware] Path: ${pathname}, Token found: ${!!token}`);

    // Allow access to the login page regardless of auth state
    if (pathname === '/login') {
        return NextResponse.next();
    }

    const verifiedPayload = await verifyToken(token || '');

    if (!verifiedPayload) {
        // No valid token, redirect to login
        console.log(`[Middleware] No valid token. Redirecting to /login from ${pathname}`);
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // User is authenticated, proceed with role-based routing
    const userRole = verifiedPayload.role;
    console.log(`[Middleware] User authenticated. Role: ${userRole}`);

    // If user is an admin...
    if (userRole === 'admin') {
        // If trying to access employee pages, redirect to admin dashboard (root)
        if (pathname.startsWith('/colaborador')) {
            console.log(`[Middleware] Admin user redirected from ${pathname} to /`);
            return NextResponse.redirect(new URL('/', request.url));
        }
        // Allow access to admin pages (including root '/')
        return NextResponse.next();
    }

    // If user is an employee...
    if (userRole === 'colaborador') {
        // If trying to access admin pages (root or anything not starting with /colaborador), redirect to employee dashboard
        if (!pathname.startsWith('/colaborador')) {
            console.log(`[Middleware] Employee user redirected from ${pathname} to /colaborador/dashboard`);
            return NextResponse.redirect(new URL('/colaborador/dashboard', request.url));
        }
        // Allow access to employee pages
        return NextResponse.next();
    }

    // Fallback (should not happen if roles are correctly set, but good practice)
    console.warn(`[Middleware] Unknown role '${userRole}' for authenticated user. Redirecting to login.`);
    return NextResponse.redirect(new URL('/login', request.url));
}

// Apply middleware to all routes except API, static files, etc., AND the login page
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)', // Exclude standard Next.js assets and API routes
    // Ensure login page is NOT included here if you want to allow access to it
    // If login page was included above, it would require auth to access login page
    // We handle login page exclusion directly in the middleware logic
  ],
};
