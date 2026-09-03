import { RealtimeProvider } from './interfaces';
import { DemoRealtimeProvider } from './demo.provider';
import { PusherProvider } from './pusher.provider';

export class RealtimeFactory {
  static getProvider(): RealtimeProvider {
    const mode = process.env.REALTIME_MODE || 'demo';

    switch (mode) {
      case 'demo':
        return new DemoRealtimeProvider();
      case 'supabase':
        throw new Error('Supabase Realtime not yet implemented');
      case 'pusher':
        return new PusherProvider();
      case 'ably':
        throw new Error('Ably not yet implemented');
      default:
        return new DemoRealtimeProvider();
    }
  }
}
