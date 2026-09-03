import { PrismaClient } from '@prisma/client';
import { ENV } from '../src/lib/config/env';
import crypto from 'crypto';
import readline from 'readline';

const prisma = new PrismaClient();

async function promptUser(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function isValidEmail(email: string) {
  const re = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
  return re.test(email);
}

async function main() {
  console.log('--- GENERATE BOOTSTRAP INVITATION ---');

  const tenantId = ENV.companyTenantId;
  if (!tenantId || tenantId === '00000000-0000-0000-0000-000000000001') {
    console.error('ERROR: A valid COMPANY_TENANT_ID environment variable is required.');
    process.exit(1);
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    console.error(`ERROR: Tenant with ID ${tenantId} does not exist. Please run prisma db seed first.`);
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const emailArg = args.find(a => !a.startsWith('--role='));
  let targetEmail = emailArg || await promptUser('Enter the target administrator email: ');
  targetEmail = targetEmail.toLowerCase();

  if (!isValidEmail(targetEmail)) {
    console.error('ERROR: Invalid email address format.');
    process.exit(1);
  }

  const roleArg = process.argv.find(a => a.startsWith('--role='))?.split('=')[1] || 'TENANT_ADMIN';
  const adminRole = await prisma.role.findFirst({
    where: { name: roleArg, tenantId: tenant.id },
  });

  if (!adminRole) {
    console.error(`ERROR: ${roleArg} role does not exist for this tenant. Please run prisma db seed first.`);
    process.exit(1);
  }

  // Generate secure token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  // Set expiration to 24 hours from now
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  // Store only the hash
  await prisma.userInvitation.create({
    data: {
      tenantId: tenant.id,
      email: targetEmail,
      roleId: adminRole.id,
      tokenHash,
      expiresAt,
      status: 'PENDING',
    },
  });

  // DO NOT print the raw token to logs unnecessarily, but provide the single-use URL to the operator.
  console.log('\n--- SUCCESS ---');
  console.log(`An invitation for ${targetEmail} has been securely generated.`);
  console.log('Provide this single-use URL to the intended administrator:');
  
  // Assuming the app runs on localhost:3000 in dev or Vercel URL in prod
  // For the script, a generic URL is printed that will hit the acceptance route.
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  console.log(`\n${baseUrl}/accept-invite?token=${rawToken}&email=${encodeURIComponent(targetEmail)}`);
  
  console.log('\nNOTE: The raw token is not stored in the database. Only its cryptographic hash is stored.');
  console.log('This invitation will expire in 24 hours.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
