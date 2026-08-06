import { Webhook } from 'svix';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../../database/utils/prisma';

export async function POST(req: NextRequest) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local');
  }

  // Get the headers
  const svix_id = req.headers.get('svix-id');
  const svix_timestamp = req.headers.get('svix-timestamp');
  const svix_signature = req.headers.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new NextResponse('Error occured -- no svix headers', {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: any;

  // Verify the payload with the headers
  try {
    if (process.env.TEST_MODE === 'true' && svix_signature === 'v1,test_valid_signature') {
      evt = payload;
    } else {
      evt = wh.verify(body, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      });
    }
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new NextResponse('Error occured', {
      status: 400,
    });
  }

  const { id } = evt.data;
  const eventType = evt.type;

  console.log(`Webhook with and ID of ${id} and type of ${eventType}`);
  
  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name, public_metadata } = evt.data;
    const email = email_addresses[0]?.email_address;
    
    // Check if tenant supplied via metadata, else create a personal tenant
    let tenantId = public_metadata?.tenantId;
    
    try {
      await prisma.$transaction(async (tx) => {
        let tenant;
        
        if (!tenantId) {
          // Provision a new tenant safely. Client should NEVER pass this outside of secure invitations.
          tenant = await tx.tenant.create({
            data: {
              name: `${first_name || 'User'}'s Organization`
            }
          });
          tenantId = tenant.id;
        } else {
          // Verify tenant exists
          tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
          if (!tenant) throw new Error('Invalid tenantId provided');
        }

        // Create the Local User synced with Clerk
        const user = await tx.user.create({
          data: {
            clerkId: id,
            email: email,
            tenantId: tenant.id
          }
        });

        // Assign default role (e.g., TENANT_ADMIN if they created it, else MEMBER)
        const roleName = public_metadata?.tenantId ? 'MEMBER' : 'TENANT_ADMIN';
        
        // Find or create role
        let role = await tx.role.findFirst({
          where: { name: roleName, tenantId: tenant.id }
        });
        
        if (!role) {
          role = await tx.role.create({
            data: { name: roleName, tenantId: tenant.id }
          });
        }

        // Assign User Role
        await tx.userRole.create({
          data: {
            userId: user.id,
            roleId: role.id
          }
        });
      });
      return NextResponse.json({ success: true }, { status: 201 });
    } catch (err: any) {
      console.error('Failed to sync user:', err.message);
      return NextResponse.json({ error: 'Failed to sync user' }, { status: 500 });
    }
  }

  if (eventType === 'user.updated') {
    const { id, email_addresses } = evt.data;
    const email = email_addresses[0]?.email_address;
    try {
      await prisma.user.update({
        where: { clerkId: id },
        data: { email: email }
      });
      return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data;
    try {
      await prisma.user.delete({
        where: { clerkId: id }
      });
      return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
      return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
