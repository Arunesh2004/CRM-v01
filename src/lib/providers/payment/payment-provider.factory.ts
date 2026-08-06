import { PaymentProvider } from './payment-provider.interface';
import { RazorpayProvider } from './razorpay.provider';
import { StripeProvider } from './stripe.provider';
import { PayPalProvider } from './paypal.provider';
import { MockPaymentProvider } from './mock-payment.provider';

export type SupportedPaymentProvider = 'RAZORPAY' | 'STRIPE' | 'PAYPAL' | 'MOCK';

export class PaymentProviderFactory {
  static getProvider(providerName: SupportedPaymentProvider): PaymentProvider {
    if (process.env.APP_MODE === 'demo' || providerName === 'MOCK') {
      return new MockPaymentProvider();
    }
    
    switch (providerName) {
      case 'RAZORPAY':
        return new RazorpayProvider();
      case 'STRIPE':
        return new StripeProvider();
      case 'PAYPAL':
        return new PayPalProvider();
      default:
        throw new Error(`Unsupported payment provider: ${providerName}`);
    }
  }
}
