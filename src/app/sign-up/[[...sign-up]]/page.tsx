import Link from 'next/link';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#070B18] text-[#E7EAF5] p-4 text-center">
      <div className="max-w-md w-full bg-white/5 rounded-2xl border border-white/10 p-8 shadow-2xl backdrop-blur-md">
        <h2 className="text-3xl font-bold font-display text-white mb-6">Invitation Only</h2>
        <p className="mb-8 text-[#8891B0] leading-relaxed">
          Account creation is currently restricted to administrators. <br/><br/>
          If you are an employee, please use the invitation link sent to your email to create your account.
        </p>

        <Link
          href="/sign-in"
          className="block w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg transition-colors text-center"
        >
          Return to Sign In
        </Link>
      </div>
    </div>
  );
}
