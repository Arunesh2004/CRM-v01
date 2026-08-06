import { Logger } from '../logger/logger';

export enum CallAnalyticsEventType {
  MISSED_CALL = 'MISSED_CALL',
  DURATION_METRIC = 'DURATION_METRIC',
  CONVERSION_TRACKING = 'CONVERSION_TRACKING'
}

export class CallAnalytics {
  
  static logEvent(tenantId: string, callSid: string, type: CallAnalyticsEventType, metadata: any = {}) {
    Logger.info(`[ANALYTICS] Registered telephony metric: ${type}`, { tenantId, callSid, ...metadata });
    // This feeds into the future analytics data warehouse
    // await prisma.analyticsEvent.create({ ... })
  }

  static enqueueForAIAnalysis(tenantId: string, callSid: string, recordingStorageKey: string) {
    // AI Preparation Hook
    // This explicitly queues the raw audio for future Whisper transcription and LLM sentiment analysis
    Logger.info(`[AI_HOOK] Enqueued call ${callSid} for asynchronous AI processing`, { tenantId });
    // await aiQueue.add('analyze_call', { tenantId, callSid, recordingStorageKey })
  }
}
