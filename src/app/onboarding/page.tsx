import { requireAuth } from '@/lib/auth';
import { submitOnboarding } from '@/modules/auth/actions/onboarding.actions';
import { redirect } from 'next/navigation';

export default async function OnboardingPage() {
  const user = await requireAuth();

  if (user.onboardingStatus === 'COMPLETED') {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Complete your profile
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please fill in your details to access the CRM.
          </p>
        </div>
        <form className="mt-8 space-y-6" action={submitOnboarding}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email (Read-only)</label>
              <input
                id="email"
                name="email"
                type="email"
                value={user.email}
                readOnly
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed focus:outline-none sm:text-sm mt-1"
              />
            </div>
            <div>
              <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700">Employee ID (Read-only)</label>
              <input
                id="employeeId"
                name="employeeId"
                type="text"
                value={user.employeeId || 'Pending Allocation'}
                readOnly
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed focus:outline-none sm:text-sm mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First Name <span className="text-red-500">*</span></label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm mt-1"
                  placeholder="John"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last Name <span className="text-red-500">*</span></label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm mt-1"
                  placeholder="Doe"
                />
              </div>
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone Number <span className="text-red-500">*</span></label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm mt-1"
                placeholder="+1 (555) 000-0000"
              />
            </div>
            <div>
              <label htmlFor="designation" className="block text-sm font-medium text-gray-700">Designation <span className="text-red-500">*</span></label>
              <input
                id="designation"
                name="designation"
                type="text"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm mt-1"
                placeholder="Sales Executive"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Complete Setup
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
