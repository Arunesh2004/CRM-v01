import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { completeProfileAction } from '@/modules/users/actions/onboarding.actions';
import { ShieldCheck, User as UserIcon, Phone, Briefcase, Mail, BadgeInfo } from 'lucide-react';

export default async function ProfileOnboardingPage() {
  const user = await requireAuth();

  if (user.onboardingStatus === 'COMPLETED') {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="glass-panel w-full max-w-2xl rounded-2xl p-8 relative z-10 shadow-2xl border border-white/10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center border border-violet-500/30">
            <ShieldCheck className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-white tracking-tight">Complete Your Profile</h1>
            <p className="text-[#8891B0] text-sm mt-1">Please provide your details to access the secure CRM workspace.</p>
          </div>
        </div>

        <form action={completeProfileAction} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Locked Fields */}
            <div className="space-y-4">
              <h2 className="text-xs font-semibold text-[#8891B0] uppercase tracking-wider mb-2">Account Identity (Locked)</h2>
              
              <div>
                <label className="block text-sm font-medium text-[#8891B0] mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4" /> Email Address
                </label>
                <input 
                  type="email" 
                  value={user.email} 
                  disabled 
                  className="w-full bg-black/40 border border-white/5 rounded-lg px-4 py-3 text-white/50 cursor-not-allowed font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#8891B0] mb-2 flex items-center gap-2">
                  <BadgeInfo className="w-4 h-4" /> Employee ID
                </label>
                <input 
                  type="text" 
                  value={user.employeeId || 'PENDING'} 
                  disabled 
                  className="w-full bg-black/40 border border-white/5 rounded-lg px-4 py-3 text-white/50 cursor-not-allowed font-mono text-sm uppercase tracking-wider"
                />
              </div>
            </div>

            {/* Editable Fields */}
            <div className="space-y-4">
              <h2 className="text-xs font-semibold text-[#8891B0] uppercase tracking-wider mb-2">Personal Details</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#8891B0] mb-2">First Name</label>
                  <input 
                    type="text" 
                    name="firstName"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                    placeholder="Jane"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#8891B0] mb-2">Last Name</label>
                  <input 
                    type="text" 
                    name="lastName"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#8891B0] mb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4" /> Phone Number (Internal)
                </label>
                <input 
                  type="tel" 
                  name="phone"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                  placeholder="+1 (555) 000-0000"
                />
                <p className="text-[10px] text-white/40 mt-1">Used for secure internal CRM communications.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#8891B0] mb-2 flex items-center gap-2">
                  <Briefcase className="w-4 h-4" /> Designation / Job Title
                </label>
                <input 
                  type="text" 
                  name="designation"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                  placeholder="Security Analyst"
                />
              </div>

            </div>
          </div>

          <div className="pt-6 border-t border-white/10 flex justify-end">
             <button type="submit" className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg transition-colors shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)]">
               Save Profile & Continue
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}
