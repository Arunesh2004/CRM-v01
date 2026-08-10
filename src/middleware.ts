import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)', '/api/webhooks/clerk', '/api/health']);

export default clerkMiddleware(async (auth, req) => {
  console.log('[AUTH-DIAG] middleware-enter', req.nextUrl.pathname);
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
  console.log('[AUTH-DIAG] middleware-after-clerk', req.nextUrl.pathname);
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
