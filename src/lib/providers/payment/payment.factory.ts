import { PaymentProvider } from './payment.interface';
import { StripeProvider } from './stripe.provider';
import { RazorpayProvider } from './razorpay.provider';
import { Logger } from '../../logger/logger';

export class PaymentProviderFactory {
  static getProvider(tenantRegion: string = 'US'): PaymentProvider {
    // In a real scenario, this might pull from Tenant settings
    if (tenantRegion === 'IN') {
      return new RazorpayProvider();
    }
    return new StripeProvider();
  }
}
