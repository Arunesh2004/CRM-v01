import { withApiContext } from '@/lib/observability/context';
import { Logger } from '@/lib/logger/logger';
import { NextResponse } from 'next/server';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import { hashPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import crypto from 'crypto';

const original_POST = async function (req: Request) {
  try {
    const body = await req.json();
    const { token, password } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const passwordHash = await hashPassword(password);

    // Run transaction
    const result = await executeAsSystem(SystemOperation.CLERK_PROVISIONING, async (tx) => {
      // Acquire pessimistic row lock to prevent concurrent double-redemption
      const locked = await tx.$queryRaw<{id: string}[]>`
        SELECT id FROM "UserInvitation" WHERE "tokenHash" = ${tokenHash} FOR UPDATE
      `;

      if (locked.length === 0) {
        return { error: 'Invitation not found', status: 404 };
      }

      const invitation = await tx.userInvitation.findUnique({
        where: { id: locked[0].id }
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

      // Ensure the user doesn't already exist as ACTIVE
      const existingUser = await tx.user.findFirst({
        where: { email: invitedEmail }
      });

      if (existingUser) {
        if (existingUser.status === 'ACTIVE') {
           // For this phase, if the user is already active, we just link the role
           // if they are being invited to a new tenant/role.
           // However, to keep it simple and match the strict requirements:
           await tx.userInvitation.update({
             where: { id: invitation.id },
             data: { status: 'ACCEPTED', acceptedAt: new Date() }
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

           return { success: true, user: existingUser, message: 'User already active. Invitation consumed.' };
        }

        if (existingUser.status === 'INVITED') {
          // Link existing user instead of creating a new one
          const linkedUser = await tx.user.update({
            where: { id: existingUser.id },
            data: {
              status: 'ACTIVE',
              passwordHash,
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

        return { error: 'User is in invalid state', status: 400 };
      }

      // Create User and UserRole (should rarely hit this if user.service creates them, but fallback)
      const newUser = await tx.user.create({
        data: {
          email: invitedEmail,
          passwordHash,
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

    if (result.user) {
      // Create session and attach crm_session cookie natively
      await createSession(result.user.id);
    }

    return NextResponse.json({ success: true });

  } catch (errRaw: unknown) {
    const err = errRaw instanceof Error ? errRaw : new Error(String(errRaw));
    Logger.error('Accept invite error:', err);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((err as any).code === 'P2002' || (err as any).code === 'P2034') {
      return NextResponse.json({ error: 'Conflict or race condition detected' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withApiContext(original_POST);
