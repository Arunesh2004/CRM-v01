import { ReactNode, Suspense } from "react";
import { requireAuth } from "@/lib/auth";
import CRMLayoutClient from "./CRMLayoutClient";

export const dynamic = 'force-dynamic';

export default async function CRMLayout({ children }: { children: ReactNode }) {
  const user = await requireAuth();
  
  if (user.onboardingStatus === 'PENDING') {
    const { redirect } = await import('next/navigation');
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
