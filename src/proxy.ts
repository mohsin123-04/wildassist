import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session on every request so Server Components
 * always see a valid session. If Supabase env vars are absent (e.g. before
 * setup), it passes through untouched so the app still runs.
 *
 * (Next.js 16 renamed Middleware to Proxy; behaviour is unchanged.)
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let response = NextResponse.next({ request });
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Touch the session so it refreshes if needed.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Only run session refresh on the pages that read the session server-side.
  // Public pages and API routes (which do their own auth) skip the extra
  // Supabase round-trip entirely.
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/transport/:path*",
    "/messages/:path*",
  ],
};
