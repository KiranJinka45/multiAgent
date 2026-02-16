import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
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
    if (!session && req.nextUrl.pathname === "/") {
        // Redirect unauthenticated users to login page
        return NextResponse.redirect(new URL("/login", req.url));
    }

    // If user is signed in and tries to access login, redirect to dashboard
    if (session && req.nextUrl.pathname === "/login") {
        return NextResponse.redirect(new URL("/", req.url));
    }

    return res;
}

export const config = {
    matcher: ["/", "/login"],
};
