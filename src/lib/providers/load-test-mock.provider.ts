import { EmailProvider, EmailPayload, EmailProviderResponse } from './email/email.interface';
import { TelephonyProvider } from './telephony/telephony-provider.interface';
import { MessagingProvider } from './messaging/messaging-provider.interface';
import { CameraProvider } from './cctv/camera-provider.interface';
import { Logger } from '../logger/logger';

// Helper to simulate latency and random errors
async function simulateProviderBehavior(providerName: string): Promise<void> {
  // Simulate latency between 50ms and 500ms
  const latency = Math.floor(Math.random() * 450) + 50;
  await new Promise(resolve => setTimeout(resolve, latency));

  const rand = Math.random();
  if (rand < 0.1) {
    Logger.warn(`[LoadTest] ${providerName} simulating 429 Rate Limit`);
    throw new Error(`${providerName} Rate Limit Exceeded`);
  } else if (rand < 0.2) {
    Logger.warn(`[LoadTest] ${providerName} simulating 502/503 Transient Error`);
    throw new Error(`${providerName} Service Unavailable`);
  }
}

export class LoadTestEmailProvider implements EmailProvider {
  async sendEmail(tenantId: string, payload: any): Promise<any> {
    await simulateProviderBehavior('Email(Resend)');
    return { success: true, messageId: `mock-msg-${Date.now()}` };
  }
  async verifyDomain(): Promise<{ success: boolean; status: string; }> { return { success: true, status: 'verified' }; }
  async getMessageStatus(): Promise<{ success: boolean; status: string; }> { return { success: true, status: 'delivered' }; }
}

export class LoadTestTelephonyProvider implements TelephonyProvider {
  async makeCall(to: any, from: any): Promise<any> { return {}; }
  async getRecording(callId: any): Promise<any> { return {}; }
  async endCall(sid: any): Promise<any> { return {}; }
  async fetchRecording(url: any): Promise<any> { return {}; }
  async sendSms(tenantId: string, payload: any): Promise<any> { return { success: true }; }
  
  async initiateCall(tenantId: string, payload: any): Promise<any> {
    await simulateProviderBehavior('Telephony(Twilio)');
    return { success: true, sid: `mock-call-${Date.now()}`, status: 'queued' };
  }
  async getCallStatus(): Promise<{ success: boolean; status: string; duration?: number; }> {
    return { success: true, status: 'completed', duration: 60 };
  }
  async cancelCall(): Promise<{ success: boolean; }> { return { success: true }; }
}

export class LoadTestMessagingProvider implements MessagingProvider {
  async receiveWebhook(payload: any): Promise<any> { return {}; }
  async verifyWebhook(signature: any, payload: any): Promise<any> { return {}; }
  async sendMessage(tenantId: string, payload: any): Promise<any> {
    await simulateProviderBehavior('Messaging(WhatsApp)');
    return { success: true, messageId: `mock-sms-${Date.now()}` };
  }
  async getMessageStatus(): Promise<{ success: boolean; status: string; }> { return { success: true, status: 'delivered' }; }
}

export class LoadTestCameraProvider implements CameraProvider {
  async getStreamStatus(cameraId: string): Promise<any> { return { active: true }; }
  async getProviderHealth(): Promise<any> { return { healthy: true }; }
  async generateStreamToken(tenantId: string, cameraId: string): Promise<any> {
    await simulateProviderBehavior('Camera(MediaMTX)');
    return { success: true, url: `webrtc://mock-cctv/${tenantId}/${cameraId}`, expiresAt: new Date(Date.now() + 3600000) };
  }
  async revokeStreamToken(): Promise<{ success: boolean; }> { return { success: true }; }
}

import { AIProvider, AIResponse, AITool } from './ai/ai-provider.interface';
export class LoadTestAIProvider implements AIProvider {
  async generateResponse(prompt: any): Promise<any> { return { success: true, text: 'mock' }; }
  async generateContent(tenantId: string, systemPrompt: string, userPrompt: string, tools?: AITool[]): Promise<any> {
    await simulateProviderBehavior('AI(Gemini)');
    return { success: true, text: `Mock AI Load Test Response for ${tenantId}`, tokensUsed: 150 };
  }
}
