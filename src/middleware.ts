import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose'; // Using jose for JWT verification

// --- Environment Variable for JWT Secret ---
// Ensure this is set in your .env.local file
const JWT_SECRET_STRING = process.env.JWT_SECRET;
let JWT_SECRET: Uint8Array | null = null;

if (JWT_SECRET_STRING) {
    try {
        JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);
        console.log("[Middleware] JWT Secret loaded successfully.");
    } catch (e) {
        console.error("[Middleware] Error encoding JWT_SECRET:", e);
    }
} else {
    console.error("[Middleware] JWT_SECRET environment variable is not set!");
}


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
        console.error("[Middleware] JWT_SECRET is not available for verification.");
        return null; // Cannot verify without the secret
    }
    if (!token) {
        return null;
    }
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        // Basic validation (ensure essential claims exist)
        if (typeof payload.uid !== 'string' || typeof payload.role !== 'string') {
             console.error("[Middleware] Invalid token payload structure.");
             return null;
        }
        return payload as UserJwtPayload;
    } catch (err) {
        // Log specific errors
        if (err instanceof Error && err.name === 'JWSSignatureVerificationFailed') {
             console.error("[Middleware] JWT Signature Verification Failed:", err.message);
        } else if (err instanceof Error && err.name === 'JWTExpired') {
            console.error("[Middleware] JWT Expired:", err.message);
        } else {
             console.error("[Middleware] JWT Verification Error:", err);
        }
        return null;
    }
}


export async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;
    const authTokenCookie = request.cookies.get('auth-token'); // Check for the auth token cookie
    const token = authTokenCookie?.value;

    console.log(`[Middleware] Path: ${pathname}, Token found: ${!!token}`);

    // --- DEVELOPMENT ONLY: Bypass login for /colaborador routes ---
    // IMPORTANT: Remove this block before deploying to production!
    if (pathname.startsWith('/colaborador')) {
        console.warn(`[Middleware] DEVELOPMENT MODE: Bypassing authentication for ${pathname}`);
        return NextResponse.next();
    }
    // --- END DEVELOPMENT ONLY ---

    // Allow access to the login page regardless of auth state
    if (pathname === '/login') {
        return NextResponse.next();
    }

    // Verify token only if the secret is loaded
    let verifiedPayload: UserJwtPayload | null = null;
    if (JWT_SECRET) {
       verifiedPayload = await verifyToken(token || '');
    } else {
       console.error("[Middleware] Cannot verify token: JWT_SECRET is missing or invalid.");
       // Redirect to login if secret is missing and trying to access protected routes
       return NextResponse.redirect(new URL('/login', request.url));
    }


    if (!verifiedPayload) {
        // No valid token (or secret missing), redirect to login
        console.log(`[Middleware] No valid token or secret missing. Redirecting to /login from ${pathname}`);
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // User is authenticated, proceed with role-based routing
    const userRole = verifiedPayload.role;
    console.log(`[Middleware] User authenticated. Role: ${userRole}`);

    // If user is an admin...
    if (userRole === 'admin') {
        // If trying to access employee pages, redirect to admin dashboard (root)
        // This check is currently bypassed by the DEVELOPMENT ONLY block above
        // if (pathname.startsWith('/colaborador')) {
        //     console.log(`[Middleware] Admin user redirected from ${pathname} to /`);
        //     return NextResponse.redirect(new URL('/', request.url));
        // }
        // Allow access to admin pages (including root '/')
        return NextResponse.next();
    }

    // If user is an employee... (This block is also bypassed for now)
    // if (userRole === 'colaborador') {
    //     // If trying to access admin pages (root or anything not starting with /colaborador), redirect to employee dashboard
    //     if (!pathname.startsWith('/colaborador')) {
    //         console.log(`[Middleware] Employee user redirected from ${pathname} to /colaborador/dashboard`);
    //         return NextResponse.redirect(new URL('/colaborador/dashboard', request.url));
    //     }
    //     // Allow access to employee pages
    //     return NextResponse.next();
    // }

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
