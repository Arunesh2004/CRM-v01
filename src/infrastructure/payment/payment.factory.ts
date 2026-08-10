import { PaymentProvider } from '../providers/payment/payment.interface';
import { DemoPaymentProvider } from '../providers/payment/DemoPaymentProvider';
import { StripeProvider } from '../providers/payment/StripeProvider';

export class PaymentProviderFactory {
  static getPaymentProvider(): PaymentProvider {
    if (process.env.COMMUNICATION_MODE === 'production') {
      return new StripeProvider();
    }
    return new DemoPaymentProvider();
  }
}
