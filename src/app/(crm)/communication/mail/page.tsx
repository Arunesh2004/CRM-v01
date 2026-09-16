import MailInterface from '@/components/communication/MailInterface';
import { requireAuth } from '@/lib/auth';

export default async function MailPage() {
  const user = await requireAuth();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 font-display text-white">Internal Mail</h1>
      <MailInterface userId={user.id} />
    </div>
  );
}
