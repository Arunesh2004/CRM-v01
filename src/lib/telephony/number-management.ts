import twilio from 'twilio';
import { Logger } from '../logger/logger';

export class TwilioNumberManagement {
  private client: twilio.Twilio;

  constructor() {
    this.client = twilio(process.env.TWILIO_ACCOUNT_SID || 'AC_test', process.env.TWILIO_AUTH_TOKEN || 'test');
  }

  async provisionNumberForTenant(tenantId: string, areaCode: string): Promise<string> {
    try {
      // 1. Search for available local numbers
      const availableNumbers = await this.client.availablePhoneNumbers('US').local.list({
        areaCode: parseInt(areaCode),
        limit: 1
      });

      if (availableNumbers.length === 0) {
        throw new Error(`No available numbers found in area code ${areaCode}`);
      }

      const numberToBuy = availableNumbers[0].phoneNumber;

      // 2. Purchase the number
      const purchasedNumber = await this.client.incomingPhoneNumbers.create({
        phoneNumber: numberToBuy,
        friendlyName: `CRM Tenant: ${tenantId}`
      });

      // 3. Automatically configure Webhook URLs for this specific number
      await this.client.incomingPhoneNumbers(purchasedNumber.sid).update({
        voiceUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/inbound`,
        statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/status?tenantId=${tenantId}`,
        statusCallbackEvent: ['completed']
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
      } as any);

      // 4. Architecturally: Link number to tenant in database
      // await prisma.tenantIntegration.create({ ... })

      Logger.info(`Successfully provisioned and configured number ${purchasedNumber.phoneNumber} for tenant ${tenantId}`);
      return purchasedNumber.phoneNumber;
    } catch (errRaw: unknown) {
      const err = errRaw instanceof Error ? errRaw : new Error(String(errRaw));
      Logger.error('Failed to provision Twilio number', err, { tenantId });
      throw new Error(`Provisioning failed: ${err.message}`);
    }
  }
}
