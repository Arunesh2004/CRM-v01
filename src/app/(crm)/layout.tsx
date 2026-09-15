import { ReactNode, Suspense } from "react";
import { requireAuth } from "@/lib/auth";
import CRMLayoutClient from "./CRMLayoutClient";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function CRMLayout({ children }: { children: ReactNode }) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    // requireAuth() throws 'Unauthorized' when the Clerk session has no corresponding
    // CRM database identity (e.g. unprovisioned account, inactive account).
    // In a Server Component we redirect cleanly rather than crash into Error #441.
    redirect('/sign-in?reason=unauthorized');
  }
  
  if (user.onboardingStatus === 'PENDING') {
    redirect('/onboarding/profile');
  }

  // Extract tenant name from the authenticated user context
  const tenantName = user?.tenant?.name || "Organization";

  // Extract primary role, default to User
  const userRole = user?.userRoles?.[0]?.role?.name || "User";

  return (
    <CRMLayoutClient
      tenantName={tenantName}
      userRole={userRole}
    >
      <Suspense fallback={<div className="h-full w-full flex items-center justify-center text-white/50">Loading workspace...</div>}>
        {children}
      </Suspense>
    </CRMLayoutClient>
  );
}
