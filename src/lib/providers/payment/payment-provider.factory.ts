import { PaymentProvider } from './payment-provider.interface';
import { RazorpayProvider } from './razorpay.provider';
import { StripeProvider } from './stripe.provider';
import { PayPalProvider } from './paypal.provider';

export type SupportedPaymentProvider = 'RAZORPAY' | 'STRIPE' | 'PAYPAL';

export class PaymentProviderFactory {
  static getProvider(providerName: SupportedPaymentProvider): PaymentProvider {
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
