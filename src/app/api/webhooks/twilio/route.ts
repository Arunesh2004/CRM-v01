import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  // Real implementation requires verifying the Twilio request signature
  // using the twilio client's validateRequest function.
  
  try {
    const formData = await req.formData();
    const callStatus = formData.get('CallStatus');
    const callSid = formData.get('CallSid');

    console.log(`[Twilio Webhook] Received status update for Call ${callSid}: ${callStatus}`);

    // In a real implementation we would look up the Communication record by ID (callSid)
    // and update its status in the database to COMPLETED, FAILED, NO_ANSWER, etc.
    
    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[Twilio Webhook] Error:', err);
    return NextResponse.json({ error: 'Webhook Error' }, { status: 400 });
  }
}
