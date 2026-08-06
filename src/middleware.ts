import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)', '/api/webhooks/clerk']);

export default clerkMiddleware(async (auth, req) => {
  const missingKeys = !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY;
  
  if (missingKeys) {
    if (process.env.NODE_ENV === 'production') {
      return new NextResponse('Configuration Error: Missing authentication keys', { status: 500 });
    }
    // We do not call auth.protect() if keys are missing to prevent a raw crash.
    // The layout.tsx will catch this and display the SetupScreen.
    return;
  }

  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
