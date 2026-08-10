import { VideoProvider, NormalizedVideoEvent } from '../video.interface';
import { withTenant } from '../../../../database/utils/prisma-tenant';
import crypto from 'crypto';

export class DemoVideoProvider implements VideoProvider {
  constructor(private tenantId: string) {}

  async createMeeting(topic: string, options?: any): Promise<string> {
    const providerMeetingId = `demo_mtg_${crypto.randomBytes(8).toString('hex')}`;
    const prisma = withTenant(this.tenantId);

    try {
      await prisma.meeting.create({
        data: {
          tenantId: this.tenantId,
          providerId: providerMeetingId,
          status: 'SCHEDULED'
        }
      });
    } catch (e) {
      console.error('Demo Video createMeeting error:', e);
    }

    return providerMeetingId;
  }

  async generateJoinToken(providerMeetingId: string, participantId: string, role?: 'HOST' | 'ATTENDEE'): Promise<string> {
    return `demo_video_token_${participantId}_${role || 'ATTENDEE'}`;
  }

  async endMeeting(providerMeetingId: string): Promise<boolean> {
    const prisma = withTenant(this.tenantId);
    
    try {
      const meetings = await prisma.meeting.findMany({
        where: { tenantId: this.tenantId, providerId: providerMeetingId }
      });

      if (meetings.length > 0) {
        await prisma.meeting.update({
          where: { id: meetings[0].id },
          data: {
            status: 'COMPLETED',
            endedAt: new Date(),
            recordingUrl: 'https://demo-recording-url.com/fake.mp4' // mock recording
          }
        });
      }
    } catch (e) {
      console.error('Demo Video endMeeting error:', e);
    }

    return true;
  }

  async normalizeWebhookEvent(payload: any, headers: any): Promise<NormalizedVideoEvent> {
    return {
      providerMeetingId: payload.meetingId || 'demo_mtg',
      type: 'ENDED',
      rawPayload: payload
    };
  }
}
