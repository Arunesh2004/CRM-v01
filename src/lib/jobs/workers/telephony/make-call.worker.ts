import { BaseWorker } from '../worker.base';
import { JobContext } from '../../queue.interface';
import { TelephonyProviderFactory } from '../../../providers/telephony/telephony.factory';
import { MakeCallPayload } from '../../../providers/telephony/telephony.interface';
import { Logger } from '../../../logger/logger';

export interface MakeCallJobContext extends JobContext {
  payload: MakeCallPayload;
}

export class MakeCallWorker extends BaseWorker<MakeCallJobContext> {
  constructor() {
    super('make_call_queue');
  }

  protected async processJob(jobId: string, data: MakeCallJobContext): Promise<void> {
    const provider = TelephonyProviderFactory.getProvider();
    
    // Architecturally: check DistributedRateLimiter here for `VOICE_OUTBOUND` limit
    
    const result = await provider.initiateCall(data.tenantId, data.payload);
    
    if (!result.success) {
      const errorMsg = result.error || 'Unknown error';
      // Transient error check for retry logic
      if (errorMsg.toLowerCase().includes('rate limit') || errorMsg.toLowerCase().includes('timeout')) {
         throw new Error(`Transient call failure: ${errorMsg}`);
      }
      Logger.error(`Permanent call failure, dropping job ${jobId}`, new Error(errorMsg), { tenantId: data.tenantId });
      return;
    }
    
    Logger.info(`METERING: Initial outbound dial attempt tracked`, { tenantId: data.tenantId, callId: result.providerCallId });
    // Database call updates would happen here to mark status as RINGING/INITIATED
  }
}
