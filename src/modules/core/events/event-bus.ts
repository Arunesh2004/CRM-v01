import { Logger } from '@/lib/logger/logger';

type EventHandler = (payload: any) => Promise<void> | void;

class EventBusService {
  private handlers: Map<string, EventHandler[]> = new Map();

  on(event: string, handler: EventHandler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }

  async emit(event: string, payload: any) {
    const eventHandlers = this.handlers.get(event);
    if (!eventHandlers) return;
    
    // Fire and forget, or await. Standard is fire and forget for decoupling.
    // In serverless, we might need to await it before execution context dies.
    await Promise.all(eventHandlers.map(handler => Promise.resolve(handler(payload)).catch((err: any) => {
      Logger.error(`EventBus error handling event ${event}`, err instanceof Error ? err : new Error(String(err)));
    })));
  }
}

export const EventBus = new EventBusService();


// Register handlers
import { registerNotificationHandlers } from './notification.handlers';
registerNotificationHandlers();
