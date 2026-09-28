import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export default clerkMiddleware(async (auth, req) => {
  console.log("type of auth:", typeof auth);
  if (typeof auth === 'function') {
    const obj = auth();
    console.log("is Promise:", obj instanceof Promise);
  }
  return NextResponse.next();
});
