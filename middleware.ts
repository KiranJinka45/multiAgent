import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
    const hostname = req.headers.get("host") || "";
    const PREVIEW_DOMAIN = process.env.PREVIEW_BASE_DOMAIN || "preview.multiagent.com";

    // 1. Domain-based Preview Routing (Phase 5)
    // Handle {projectId}.preview.multiagent.com -> /api/preview-proxy/{projectId}
    if (hostname.endsWith(`.${PREVIEW_DOMAIN}`)) {
        const projectId = hostname.split(`.${PREVIEW_DOMAIN}`)[0];
        if (projectId && projectId !== hostname) {
            const url = req.nextUrl.clone();
            url.pathname = `/api/preview-proxy/${projectId}${url.pathname}`;
            return NextResponse.rewrite(url);
        }
    }

    const res = NextResponse.next();

    // Check if Supabase keys are valid
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey || supabaseUrl.includes("YOUR_SUPABASE_URL")) {
        console.warn("Supabase keys missing or invalid. Skipping auth middleware.");
        return res;
    }

    // Create a Supabase client configured to use cookies
    const supabase = createMiddlewareClient({ req, res });

    // Refresh session if expired - required for Server Components
    const {
        data: { session },
    } = await supabase.auth.getSession();

    // Protected routes
    if (!session) {
        if (req.nextUrl.pathname === "/" || req.nextUrl.pathname === "/waitlist" || req.nextUrl.pathname === "/dashboard") {
            // Redirect unauthenticated users to login page (except dashboard for this task)
            if (req.nextUrl.pathname !== "/dashboard") {
                return NextResponse.redirect(new URL("/login", req.url));
            }
        }
        if (req.nextUrl.pathname.startsWith("/api/") &&
            !req.nextUrl.pathname.startsWith("/api/webhooks") &&
            !req.nextUrl.pathname.startsWith("/api/health") &&
            !req.nextUrl.pathname.startsWith("/api/system-health") &&
            !req.nextUrl.pathname.startsWith("/api/queue-health") &&
            !req.nextUrl.pathname.startsWith("/api/workers") &&
            !req.nextUrl.pathname.startsWith("/api/build-timeline") &&
            !req.nextUrl.pathname.startsWith("/api/debug") &&
            !req.nextUrl.pathname.startsWith("/api/admin/containers") &&
            !req.nextUrl.pathname.startsWith("/api/generate-project") &&
            !req.nextUrl.pathname.startsWith("/api/build/events") &&
            !req.nextUrl.pathname.startsWith("/api/build")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    } else {
        // User is authenticated, check beta access
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('is_beta_user, role')
            .eq('id', session.user.id)
            .single();

        if (profileError) {
            console.error("Middleware profile error:", profileError);
        }

        // Check beta access permissions
        const isDev = process.env.NODE_ENV === 'development';
        const isBeta = profile?.is_beta_user || profile?.role === 'owner' || isDev;

        // Check if route is waitlist
        const isWaitlistRoute = req.nextUrl.pathname === '/waitlist';

        if (!isBeta && !isWaitlistRoute && !req.nextUrl.pathname.startsWith('/api/webhooks') && !req.nextUrl.pathname.startsWith('/api/stripe')) {
            if (req.nextUrl.pathname.startsWith('/api/')) {
                return NextResponse.json({ error: "Beta access required" }, { status: 403 });
            }
            // Redirect non-beta users to waitlist
            return NextResponse.redirect(new URL("/waitlist", req.url));
        }

        if (isBeta && isWaitlistRoute) {
            // If they are beta and trying to access waitlist, redirect to dashboard
            return NextResponse.redirect(new URL("/", req.url));
        }
    }

    // If user is signed in and tries to access login, redirect to dashboard
    if (session && req.nextUrl.pathname === "/login") {
        return NextResponse.redirect(new URL("/", req.url));
    }

    return res;
}

export const config = {
    // Phase 5: Match everything except static assets
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
