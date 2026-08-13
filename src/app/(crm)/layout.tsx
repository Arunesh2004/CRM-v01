import { ReactNode } from "react";
import { requireAuth } from "@/lib/auth";
import CRMLayoutClient from "./CRMLayoutClient";
import { getUnreadNotificationsAction } from "./notifications/actions";

export const dynamic = 'force-dynamic';

export default async function CRMLayout({ children }: { children: ReactNode }) {
  const user = await requireAuth();

  // Extract tenant name from the authenticated user context
  const tenantName = user?.tenant?.name || "Organization";

  // Extract primary role, default to User
  const userRole = user?.userRoles?.[0]?.role?.name || "User";

  const { notifications, count } = await getUnreadNotificationsAction();

  return (
    <CRMLayoutClient
      tenantName={tenantName}
      userRole={userRole}
      initialNotifications={notifications}
      initialNotificationCount={count}
    >
      {children}
    </CRMLayoutClient>
  );
}
