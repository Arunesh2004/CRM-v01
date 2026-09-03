import { withApiContext } from '@/lib/observability/context';
import { Logger } from '@/lib/logger/logger';
import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import crypto from 'crypto';

const original_POST = async function (req: Request) {
  try {
    const clerkAuth = await auth();
    const clerkId = clerkAuth.userId;

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = await req.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    // Fetch the user's verified email from Clerk
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(clerkId);
    const verifiedEmails = (clerkUser.emailAddresses || [])
      .filter((e: any) => e.verification?.status === 'verified')
      .map((e: any) => e.emailAddress.toLowerCase().trim());

    if (verifiedEmails.length === 0) {
      return NextResponse.json({ error: 'No verified email found in Clerk account' }, { status: 400 });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Run transaction
    const result = await executeAsSystem(SystemOperation.CLERK_PROVISIONING, async (tx) => {
      const invitation = await tx.userInvitation.findUnique({
        where: { tokenHash }
      });

      if (!invitation) {
        return { error: 'Invitation not found', status: 404 };
      }

      if (invitation.status !== 'PENDING') {
        return { error: `Invitation is already ${invitation.status.toLowerCase()}`, status: 400 };
      }

      if (invitation.expiresAt < new Date()) {
        return { error: 'Invitation has expired', status: 400 };
      }

      const invitedEmail = invitation.email.toLowerCase().trim();
      if (!verifiedEmails.includes(invitedEmail)) {
        return { error: 'Clerk email does not match the invited email or is unverified', status: 403 };
      }

      // Ensure the user doesn't already exist
      const existingUser = await tx.user.findFirst({
        where: { OR: [{ email: invitedEmail }, { clerkId }] }
      });

      if (existingUser) {
        if (existingUser.status === 'ACTIVE' && existingUser.clerkId === clerkId) {
          await tx.userInvitation.update({
            where: { id: invitation.id },
            data: { status: 'ACCEPTED', acceptedAt: new Date() }
          });
          return { success: true, message: 'User already active. Invitation consumed.' };
        }
        
        if (existingUser.status === 'INVITED' && existingUser.clerkId === null) {
          // Link existing user instead of creating a new one
          const linkedUser = await tx.user.update({
            where: { id: existingUser.id },
            data: {
              clerkId,
              status: 'ACTIVE',
              tenantId: invitation.tenantId,
              departmentId: invitation.departmentId
            }
          });

          // Ensure role is assigned (create if it doesn't exist)
          const existingRole = await tx.userRole.findUnique({
            where: { userId_roleId: { userId: existingUser.id, roleId: invitation.roleId } }
          });

          if (!existingRole) {
            await tx.userRole.create({
              data: {
                userId: existingUser.id,
                roleId: invitation.roleId,
                tenantId: invitation.tenantId
              }
            });
          }

          await tx.userInvitation.update({
            where: { id: invitation.id },
            data: { status: 'ACCEPTED', acceptedAt: new Date() }
          });

          return { success: true, user: linkedUser };
        }

        return { error: 'User already exists', status: 400 };
      }

      // Create User and UserRole
      const newUser = await tx.user.create({
        data: {
          email: invitedEmail,
          clerkId,
          tenantId: invitation.tenantId,
          departmentId: invitation.departmentId,
          status: 'ACTIVE',
          onboardingStatus: 'PENDING',
          userRoles: {
            create: {
              roleId: invitation.roleId,
              tenantId: invitation.tenantId
            }
          }
        }
      });

      // Mark invitation accepted
      await tx.userInvitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED', acceptedAt: new Date() }
      });

      return { success: true, user: newUser };
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    Logger.error('Accept invite error:', err);
    if (err.code === 'P2002' || err.code === 'P2034') {
      return NextResponse.json({ error: 'Conflict or race condition detected' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withApiContext(original_POST);
