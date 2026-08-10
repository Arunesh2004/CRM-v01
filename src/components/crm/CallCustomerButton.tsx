'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Phone, PhoneCall, PhoneOff, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
// Assume a server action exists in crm/actions/call.actions.ts
import { initiateCallAction } from '@/modules/crm/actions/call.actions'; 

export function CallCustomerButton({ customerId, phoneNumber }: { customerId: string, phoneNumber?: string }) {
  const [open, setOpen] = useState(false);
  const [callState, setCallState] = useState<'IDLE' | 'CALLING' | 'CONNECTED' | 'COMPLETED'>('IDLE');
  
  const handleCall = async () => {
    if (!phoneNumber) {
      toast.error('No phone number available for this customer.');
      return;
    }
    
    setCallState('CALLING');
    
    try {
      const res = await initiateCallAction({ customerId, to: phoneNumber });
      
      if (res.success) {
        // Simulate ring delay
        setTimeout(() => setCallState('CONNECTED'), 2000);
        
        // Simulate call duration
        setTimeout(() => {
          setCallState('COMPLETED');
          toast.success('Call completed and recorded to CRM timeline.');
          setTimeout(() => setOpen(false), 2000);
        }, 10000);
      } else {
        toast.error(res.error || 'Failed to initiate call');
        setCallState('IDLE');
        setOpen(false);
      }
    } catch (e: any) {
      toast.error('Call error: ' + e.message);
      setCallState('IDLE');
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2">
        <Phone className="w-4 h-4" />
        Call Customer
      </Button>

      <Dialog open={open} onOpenChange={(val) => {
        if (!val && callState !== 'IDLE' && callState !== 'COMPLETED') {
          // Prevent closing while active call
          toast.warning('Please end the call first.');
          return;
        }
        setOpen(val);
        if (!val) setCallState('IDLE');
      }}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <DialogTitle>Call Simulation</DialogTitle>
            <DialogDescription>
              This simulates a true backend provider call flow using the active integration.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center justify-center py-8 space-y-6">
            {callState === 'IDLE' && (
              <>
                <div className="text-2xl font-semibold">{phoneNumber || 'Unknown Number'}</div>
                <Button size="lg" className="rounded-full w-16 h-16 bg-green-500 hover:bg-green-600" onClick={handleCall}>
                  <Phone className="w-6 h-6 text-white" />
                </Button>
              </>
            )}
            
            {callState === 'CALLING' && (
              <>
                <div className="text-xl animate-pulse text-muted-foreground">Ringing...</div>
                <div className="relative">
                  <div className="absolute inset-0 rounded-full border-4 border-muted animate-ping opacity-75" />
                  <Button size="lg" variant="danger" className="rounded-full w-16 h-16 relative">
                    <PhoneOff className="w-6 h-6" />
                  </Button>
                </div>
              </>
            )}
            
            {callState === 'CONNECTED' && (
              <>
                <div className="text-xl text-green-500 font-medium">00:04</div>
                <div className="text-sm text-muted-foreground">Connected to {phoneNumber}</div>
                <Button size="lg" variant="danger" className="rounded-full w-16 h-16" onClick={() => setCallState('COMPLETED')}>
                  <PhoneOff className="w-6 h-6" />
                </Button>
              </>
            )}
            
            {callState === 'COMPLETED' && (
              <>
                <div className="text-xl font-medium">Call Ended</div>
                <div className="text-sm text-muted-foreground">A timeline record has been created.</div>
                <CheckCircle2 className="w-12 h-12 text-green-500 my-2" />
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
