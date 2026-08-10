import { BaseProvider, ProviderContext } from '../base.interface';

export interface CheckoutPayload {
  amount: number;
  currency: string;
  planId?: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutResponse {
  checkoutUrl: string;
  transactionId: string;
  provider: string;
}

export interface PaymentVerification {
  transactionId: string;
  isSuccessful: boolean;
  rawPayload: any;
}

export interface PaymentProvider extends BaseProvider {
  createCheckout(context: ProviderContext, payload: CheckoutPayload): Promise<CheckoutResponse>;
  verifyPayment(context: ProviderContext, transactionId: string): Promise<PaymentVerification>;
}
